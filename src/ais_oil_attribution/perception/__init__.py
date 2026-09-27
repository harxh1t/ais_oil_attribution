"""Perception module for satellite SAR oil spill segmentation and detection."""

from ais_oil_attribution.perception.deeplabv3_detector import (
    detect_oil_slick_from_sar,
    preprocess_sar_bands,
)

__all__ = ["detect_oil_slick_from_sar", "preprocess_sar_bands"]
