"""DeepLabv3+ SAR Satellite Oil-Spill Detection and Vectorization Engine.

Based on MobileNetV2 DeepLabV3+ architecture trained on Sentinel-1 SAR dual-polarization
imagery (VV & VH bands). Translates segmented raster masks into WGS84 GeoJSON polygons
and extracts centroid coordinates and spread dimensions for the downstream AIS attribution pipeline.
"""

import json
import math
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np


def preprocess_sar_bands(vv: np.ndarray, vh: np.ndarray) -> np.ndarray:
    """Clips SAR backscatter to [-35 dB, +5 dB], rescales to [0, 255] uint8,
    and synthesizes a 3-channel pseudo-RGB array: [VV, VH, (VV + VH)/2].
    """
    def _norm(band: np.ndarray) -> np.ndarray:
        clipped = np.clip(band, -35.0, 5.0)
        return ((clipped + 35.0) / 40.0 * 255.0).astype(np.uint8)

    vv_norm = _norm(vv)
    vh_norm = _norm(vh)
    avg_norm = ((vv_norm.astype(np.float32) + vh_norm.astype(np.float32)) / 2.0).astype(np.uint8)
    return np.stack([vv_norm, vh_norm, avg_norm], axis=-1)


def check_cv_dependencies() -> Tuple[bool, str]:
    """Verifies whether PyTorch, Rasterio, Albumentations, and SMP are installed."""
    missing = []
    for pkg in ["torch", "rasterio", "segmentation_models_pytorch", "albumentations"]:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)

    if missing:
        msg = (
            f"Missing required computer vision dependencies: {', '.join(missing)}.\n"
            f"Install them with:\n"
            f"  pip install torch torchvision rasterio segmentation-models-pytorch albumentations\n"
            f"or install the extras:\n"
            f"  pip install -e .[cv]"
        )
        return False, msg
    return True, "OK"


def mask_to_geojson_wgs84(
    pred_mask: np.ndarray,
    transform: Any,
    crs: Any,
    output_path: Optional[Union[str, Path]] = None,
) -> Dict[str, Any]:
    """Vectorizes a binary segmentation raster mask into GeoJSON features with
    centroid lat/lon, perimeter, and equivalent spread radius in kilometers.
    """
    from rasterio.features import shapes
    from shapely.geometry import shape, mapping
    import pyproj
    from shapely.ops import transform as shapely_transform

    # Build transformer if CRS is projected (e.g., UTM) to ensure output is WGS84 (EPSG:4326)
    is_wgs84 = crs is not None and crs.to_epsg() == 4326
    project_to_wgs84 = None
    if crs is not None and not is_wgs84:
        try:
            src_proj = pyproj.CRS(crs)
            dst_proj = pyproj.CRS("EPSG:4326")
            transformer = pyproj.Transformer.from_crs(src_proj, dst_proj, always_xy=True)
            project_to_wgs84 = transformer.transform
        except Exception:
            project_to_wgs84 = None

    features: List[Dict[str, Any]] = []

    for geom, value in shapes(
        pred_mask.astype(np.int16),
        mask=(pred_mask > 0),
        transform=transform,
    ):
        if value == 1:
            poly = shape(geom)
            if project_to_wgs84 is not None:
                poly = shapely_transform(project_to_wgs84, poly)

            centroid = poly.centroid
            # Compute approximate spatial spread (radius in km)
            # If in degrees, 1 deg ~ 111 km
            area_deg2 = poly.area
            spread_km = float(math.sqrt(max(1e-6, area_deg2 / math.pi)) * 111.0)
            # Minimum realistic spread bound (at least 0.5 km)
            spread_km = max(0.5, spread_km)

            features.append({
                "type": "Feature",
                "geometry": mapping(poly),
                "properties": {
                    "area_deg2": float(area_deg2),
                    "centroid_lon": float(centroid.x),
                    "centroid_lat": float(centroid.y),
                    "perimeter_deg": float(poly.length),
                    "spread_km": float(spread_km),
                },
            })

    # Sort descending by area so primary slick is first
    features.sort(key=lambda f: f["properties"]["area_deg2"], reverse=True)

    feature_collection = {
        "type": "FeatureCollection",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
        },
        "features": features,
    }

    if output_path:
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "w", encoding="utf-8") as f:
            json.dump(feature_collection, f, indent=2)

    return feature_collection


WEIGHTS_DOWNLOAD_URL = (
    "https://raw.githubusercontent.com/hemanth3112007-boop/Oil-Spill-Detection-using-DeepLabv3-/main/best_deeplabv3plus_mobilenet.zip"
)


def ensure_model_weights(weights_path: Optional[Union[str, Path]] = None) -> Path:
    """Finds or auto-downloads the DeepLabv3+ weights."""
    if weights_path is not None and Path(weights_path).exists():
        return Path(weights_path)

    candidate_paths = [
        Path("models/best_deeplabv3plus_mobilenet.pth"),
        Path("models/best_deeplabv3plus_mobilenet.zip"),
        Path("weights/best_deeplabv3plus_mobilenet.pth"),
        Path.home() / ".cache" / "ais_oil_attribution" / "best_deeplabv3plus_mobilenet.pth",
    ]
    for cp in candidate_paths:
        if cp.exists():
            return cp

    # Auto-download if not found
    target_path = Path("models/best_deeplabv3plus_mobilenet.pth")
    target_path.parent.mkdir(parents=True, exist_ok=True)
    import urllib.request

    print(f"[PERCEPTION] Downloading pre-trained DeepLabv3+ weights (~17MB) from GitHub...")
    urllib.request.urlretrieve(WEIGHTS_DOWNLOAD_URL, str(target_path))
    print(f"[PERCEPTION] Saved weights to: {target_path}")
    return target_path


def render_and_save_processed_images(
    img_rgb: np.ndarray,
    pred_mask_full: np.ndarray,
    probs_full: np.ndarray,
    features: List[Dict[str, Any]],
    output_dir: Union[str, Path],
    scene_stem: str,
    primary_slick: Optional[Dict[str, Any]] = None,
) -> Dict[str, str]:
    """Renders and saves forensic imagery generated during DeepLabv3+ perception:
    1. sar_preprocessed.png: Normalized 3-channel pseudo-RGB SAR backscatter [VV, VH, avg]
    2. segmentation_mask.png: High-contrast binary oil slick segmentation mask (0 / 255)
    3. probability_heatmap.png: Continuous sigmoid probability map [0.0 - 1.0] in TURBO colormap
    4. segmentation_overlay.png: Composite overlay of detected slicks with contours and centroid pins
    5. detection_summary.png: 4-panel diagnostic comparison dashboard with incident metadata
    """
    import cv2

    out_p = Path(output_dir)
    out_p.mkdir(parents=True, exist_ok=True)

    # 1. Normalized SAR preprocessed image
    preproc_file = out_p / "sar_preprocessed.png"
    cv2.imwrite(str(preproc_file), cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR))

    # 2. Binary segmentation mask
    mask_file = out_p / "segmentation_mask.png"
    mask_vis = (pred_mask_full.astype(np.uint8) * 255)
    cv2.imwrite(str(mask_file), mask_vis)

    # 3. Continuous probability heatmap
    heatmap_file = out_p / "probability_heatmap.png"
    probs_clamped = np.clip(probs_full * 255.0, 0, 255).astype(np.uint8)
    heatmap = cv2.applyColorMap(probs_clamped, cv2.COLORMAP_TURBO)
    cv2.imwrite(str(heatmap_file), heatmap)

    # 4. Forensic segmentation overlay
    overlay_file = out_p / "segmentation_overlay.png"
    overlay = img_rgb.copy()
    mask_idx = pred_mask_full > 0

    if np.any(mask_idx):
        # Tint detected slick regions in fluorescent coral/red
        tint_rgb = np.array([255, 30, 80], dtype=np.float32)
        overlay[mask_idx] = np.clip(
            0.45 * tint_rgb + 0.55 * overlay[mask_idx].astype(np.float32), 0, 255
        ).astype(np.uint8)

        # Draw boundary contours
        contours, _ = cv2.findContours(
            (pred_mask_full > 0).astype(np.uint8),
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE,
        )
        # Sort contours by area descending
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        cv2.drawContours(overlay, contours, -1, (255, 230, 0), thickness=2)

        # Draw markers & labels on detected slick centroids
        for idx, c in enumerate(contours[:5], start=1):
            M = cv2.moments(c)
            if M["m00"] > 0:
                cX = int(M["m10"] / M["m00"])
                cY = int(M["m01"] / M["m00"])
                cv2.drawMarker(
                    overlay,
                    (cX, cY),
                    (0, 240, 255),
                    markerType=cv2.MARKER_CROSS,
                    markerSize=18,
                    thickness=2,
                )
                cv2.circle(overlay, (cX, cY), 6, (0, 240, 255), 1)
                label_txt = f"SLICK #{idx}"
                cv2.putText(
                    overlay,
                    label_txt,
                    (cX + 12, max(20, cY - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.55,
                    (255, 255, 255),
                    2,
                    cv2.LINE_AA,
                )
                cv2.putText(
                    overlay,
                    label_txt,
                    (cX + 12, max(20, cY - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.55,
                    (0, 0, 0),
                    1,
                    cv2.LINE_AA,
                )

    cv2.imwrite(str(overlay_file), cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))

    # 5. Multi-panel diagnostic summary card (2x2 grid + forensic header banner)
    summary_file = out_p / "detection_summary.png"
    target_w, target_h = 640, 640

    p1 = cv2.resize(cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR), (target_w, target_h))
    p2 = cv2.resize(heatmap, (target_w, target_h))
    p3 = cv2.resize(cv2.cvtColor(mask_vis, cv2.COLOR_GRAY2BGR), (target_w, target_h))
    p4 = cv2.resize(cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR), (target_w, target_h))

    def _add_panel_title(img: np.ndarray, title: str) -> None:
        cv2.rectangle(img, (0, 0), (target_w, 36), (20, 24, 33), -1)
        cv2.putText(
            img,
            title,
            (14, 24),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (240, 244, 248),
            1,
            cv2.LINE_AA,
        )

    _add_panel_title(p1, "1. Normalized SAR Backscatter (VV/VH)")
    _add_panel_title(p2, "2. DeepLabv3+ Probability Heatmap [0-1]")
    _add_panel_title(p3, "3. Binary Segmentation Mask (>0.5)")
    _add_panel_title(p4, "4. Forensic Oil Slick Overlay")

    grid_top = np.hstack([p1, p2])
    grid_bottom = np.hstack([p3, p4])
    grid = np.vstack([grid_top, grid_bottom])

    total_w = grid.shape[1]
    banner_h = 75
    banner = np.full((banner_h, total_w, 3), (20, 24, 33), dtype=np.uint8)

    cv2.putText(
        banner,
        "WAKE SATELLITE PERCEPTION // DEEPLABV3+ MOBILENETV2",
        (20, 32),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.75,
        (0, 230, 255),
        2,
        cv2.LINE_AA,
    )

    num_slicks = len(features)
    if primary_slick:
        info_txt = (
            f"Scene: {scene_stem} | Slicks Detected: {num_slicks} | "
            f"Centroid: {primary_slick['lat']:.4f}N, {primary_slick['lon']:.4f}W | "
            f"Spread: {primary_slick['spread_km']:.2f} km"
        )
    else:
        info_txt = f"Scene: {scene_stem} | Slicks Detected: 0 (Sea Surface Clean)"

    cv2.putText(
        banner,
        info_txt,
        (20, 60),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.52,
        (200, 210, 224),
        1,
        cv2.LINE_AA,
    )

    footer_h = 32
    footer = np.full((footer_h, total_w, 3), (15, 17, 26), dtype=np.uint8)
    cv2.putText(
        footer,
        "SENTINEL-1 C-BAND SAR FORENSIC INGESTION ENGINE | EPSG:4326 GEOREFERENCED",
        (20, 21),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (140, 150, 160),
        1,
        cv2.LINE_AA,
    )

    summary_dashboard = np.vstack([banner, grid, footer])
    cv2.imwrite(str(summary_file), summary_dashboard)

    return {
        "preprocessed": str(preproc_file),
        "mask": str(mask_file),
        "probability_heatmap": str(heatmap_file),
        "overlay": str(overlay_file),
        "summary": str(summary_file),
        "output_dir": str(out_p),
    }


def detect_oil_slick_from_sar(
    tiff_path: Union[str, Path],
    weights_path: Optional[Union[str, Path]] = None,
    output_geojson_path: Optional[Union[str, Path]] = None,
    output_images_dir: Optional[Union[str, Path]] = None,
    save_processed_images: bool = True,
    device_name: str = "auto",
    confidence_threshold: float = 0.5,
) -> Dict[str, Any]:
    """Runs DeepLabv3+ inference on a dual-polarization Sentinel-1 GeoTIFF image,
    generating vector GeoJSON slicks, extracting centroid and spread parameters,
    and rendering processed diagnostic images (preprocessed SAR, probability heatmap,
    binary mask, forensic overlay, and multi-panel summary).
    """
    has_cv, error_msg = check_cv_dependencies()
    if not has_cv:
        raise ImportError(error_msg)

    import rasterio
    import torch
    import cv2
    import albumentations as A
    from albumentations.pytorch import ToTensorV2
    import segmentation_models_pytorch as smp

    tiff_path = Path(tiff_path)
    if not tiff_path.exists():
        raise FileNotFoundError(f"SAR GeoTIFF file not found: {tiff_path}")

    # Determine hardware acceleration
    if device_name == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(device_name)

    # Read SAR bands
    with rasterio.open(str(tiff_path)) as src:
        vv = src.read(1)
        # Sentinel-1 dual-pol typically has VV at band 1 and VH at band 2; if single band, duplicate
        vh = src.read(2) if src.count >= 2 else vv
        original_shape = vv.shape
        transform = src.transform
        crs = src.crs

        # Attempt to parse acquisition time from metadata tags
        tags = src.tags()
        acq_time_str = tags.get("TIFFTAG_DATETIME") or tags.get("ACQUISITION_DATETIME")

    # Preprocess
    img_rgb = preprocess_sar_bands(vv, vh)

    # Prepare input tensor (512x512)
    val_transform = A.Compose([
        A.Resize(512, 512),
        ToTensorV2(),
    ])
    transformed = val_transform(image=img_rgb, mask=np.zeros(img_rgb.shape[:2]))
    input_tensor = (transformed["image"].float() / 255.0).unsqueeze(0).to(device)

    # Load DeepLabv3+ model architecture
    model = smp.DeepLabV3Plus(
        encoder_name="mobilenet_v2",
        encoder_weights=None,
        in_channels=3,
        classes=1,
        activation=None,
    ).to(device)

    # Load checkpoint weights
    final_weights_path = ensure_model_weights(weights_path)
    model.load_state_dict(torch.load(str(final_weights_path), map_location=device, weights_only=False))

    model.eval()
    with torch.no_grad():
        logits = model(input_tensor)
        probs = torch.sigmoid(logits)
        pred_mask_512 = (probs > confidence_threshold).float()[0, 0].cpu().numpy()
        probs_512 = probs[0, 0].cpu().numpy()

    # Upscale mask and probability map back to original GeoTIFF resolution
    pred_mask_full = cv2.resize(
        pred_mask_512,
        (original_shape[1], original_shape[0]),
        interpolation=cv2.INTER_NEAREST,
    )
    probs_full = cv2.resize(
        probs_512,
        (original_shape[1], original_shape[0]),
        interpolation=cv2.INTER_LINEAR,
    )

    if output_geojson_path is None:
        output_geojson_path = tiff_path.parent / f"{tiff_path.stem}_detection.geojson"

    geojson_data = mask_to_geojson_wgs84(
        pred_mask=pred_mask_full,
        transform=transform,
        crs=crs,
        output_path=output_geojson_path,
    )

    features = geojson_data.get("features", [])
    primary_slick = None
    if features:
        top_feat = features[0]
        props = top_feat.get("properties", {})
        primary_slick = {
            "lat": float(props.get("centroid_lat", 0.0)),
            "lon": float(props.get("centroid_lon", 0.0)),
            "spread_km": float(props.get("spread_km", 5.0)),
            "area_deg2": float(props.get("area_deg2", 0.0)),
        }

    # Render and save processed diagnostic images if enabled
    processed_images = {}
    if save_processed_images:
        if output_images_dir is None:
            if output_geojson_path is not None:
                output_images_dir = Path(output_geojson_path).parent / "sar_processed"
            else:
                output_images_dir = tiff_path.parent / f"{tiff_path.stem}_processed"

        processed_images = render_and_save_processed_images(
            img_rgb=img_rgb,
            pred_mask_full=pred_mask_full,
            probs_full=probs_full,
            features=features,
            output_dir=output_images_dir,
            scene_stem=tiff_path.stem,
            primary_slick=primary_slick,
        )

    return {
        "geojson_path": str(output_geojson_path),
        "geojson_data": geojson_data,
        "num_slicks_detected": len(features),
        "primary_slick": primary_slick,
        "acquisition_time_hint": acq_time_str,
        "processed_images": processed_images,
    }
