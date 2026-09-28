"""Unit tests for the DeepLabv3+ SAR perception and vectorization module."""

import json
from pathlib import Path
import numpy as np
import pytest
from shapely.geometry import Polygon

from ais_oil_attribution.perception.deeplabv3_detector import (
    preprocess_sar_bands,
    check_cv_dependencies,
    detect_oil_slick_from_sar,
    render_and_save_processed_images,
)


def test_preprocess_sar_bands_shape_and_range():
    # Synthetic SAR bands in dB range [-40, +10]
    vv = np.array([[-40.0, -35.0], [0.0, 10.0]], dtype=np.float32)
    vh = np.array([[-20.0, -10.0], [-5.0, 5.0]], dtype=np.float32)

    rgb = preprocess_sar_bands(vv, vh)

    # Must be (H, W, 3) uint8
    assert rgb.shape == (2, 2, 3)
    assert rgb.dtype == np.uint8
    # Min value should be >= 0, max <= 255
    assert rgb.min() >= 0
    assert rgb.max() <= 255

    # VV = -40 dB clipped to -35 dB -> normalized value 0
    assert rgb[0, 0, 0] == 0
    # VV = 10 dB clipped to 5 dB -> normalized value 255
    assert rgb[1, 1, 0] == 255


def test_check_cv_dependencies_reports_clearly():
    has_cv, msg = check_cv_dependencies()
    # In test environment without torch/rasterio, should report missing dependencies gracefully
    if not has_cv:
        assert "Missing required computer vision dependencies" in msg
        assert "pip install" in msg
    else:
        assert msg == "OK"


def test_detect_oil_slick_missing_file_raises_error():
    # If missing file passed, raises appropriate error
    with pytest.raises((FileNotFoundError, ImportError)):
        detect_oil_slick_from_sar("non_existent_file.tif")


def test_render_and_save_processed_images(tmp_path):
    cv2 = pytest.importorskip("cv2", reason="OpenCV is required for SAR image rendering")

    H, W = 64, 64
    img_rgb = np.full((H, W, 3), 120, dtype=np.uint8)
    probs_full = np.zeros((H, W), dtype=np.float32)
    probs_full[20:40, 20:40] = 0.85
    pred_mask_full = (probs_full > 0.5).astype(np.uint8)

    features = [{
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": []},
        "properties": {
            "centroid_lat": 34.0,
            "centroid_lon": -118.5,
            "spread_km": 2.5,
            "area_deg2": 0.001,
        },
    }]
    primary = {
        "lat": 34.0,
        "lon": -118.5,
        "spread_km": 2.5,
        "area_deg2": 0.001,
    }

    out_dir = tmp_path / "sar_images"
    res = render_and_save_processed_images(
        img_rgb=img_rgb,
        pred_mask_full=pred_mask_full,
        probs_full=probs_full,
        features=features,
        output_dir=out_dir,
        scene_stem="test_scene",
        primary_slick=primary,
    )

    assert "preprocessed" in res
    assert "mask" in res
    assert "probability_heatmap" in res
    assert "overlay" in res
    assert "summary" in res

    for key, path_str in res.items():
        if key == "output_dir":
            continue
        p = Path(path_str)
        assert p.exists()
        assert p.stat().st_size > 0
        loaded = cv2.imread(str(p))
        assert loaded is not None
        assert loaded.ndim == 3
