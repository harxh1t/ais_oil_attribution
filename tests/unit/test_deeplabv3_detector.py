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
