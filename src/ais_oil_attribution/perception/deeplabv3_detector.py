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


def detect_oil_slick_from_sar(
    tiff_path: Union[str, Path],
    weights_path: Optional[Union[str, Path]] = None,
    output_geojson_path: Optional[Union[str, Path]] = None,
    device_name: str = "auto",
    confidence_threshold: float = 0.5,
) -> Dict[str, Any]:
    """Runs DeepLabv3+ inference on a dual-polarization Sentinel-1 GeoTIFF image,
    generating vector GeoJSON slicks and extracting centroid and spread parameters.
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
    if weights_path is not None and Path(weights_path).exists():
        model.load_state_dict(torch.load(str(weights_path), map_location=device))
    else:
        # Check standard locations (e.g. models/ or cache)
        candidate_paths = [
            Path("models/best_deeplabv3plus_mobilenet.pth"),
            Path("weights/best_deeplabv3plus_mobilenet.pth"),
            Path.home() / ".cache" / "ais_oil_attribution" / "best_deeplabv3plus_mobilenet.pth",
        ]
        found = False
        for cp in candidate_paths:
            if cp.exists():
                model.load_state_dict(torch.load(str(cp), map_location=device))
                found = True
                break
        if not found and weights_path is not None:
            raise FileNotFoundError(f"Model weights file not found: {weights_path}")

    model.eval()
    with torch.no_grad():
        logits = model(input_tensor)
        probs = torch.sigmoid(logits)
        pred_mask_512 = (probs > confidence_threshold).float()[0, 0].cpu().numpy()

    # Upscale mask back to original GeoTIFF resolution
    pred_mask_full = cv2.resize(
        pred_mask_512,
        (original_shape[1], original_shape[0]),
        interpolation=cv2.INTER_NEAREST,
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

    return {
        "geojson_path": str(output_geojson_path),
        "geojson_data": geojson_data,
        "num_slicks_detected": len(features),
        "primary_slick": primary_slick,
        "acquisition_time_hint": acq_time_str,
    }
