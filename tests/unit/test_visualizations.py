"""Unit tests for visualization utilities and MP4 animation generation."""

from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from ais_oil_attribution.drift.visualizations import (
    generate_opendrift_animation,
    plot_detailed_drift,
    plot_cloud_spread_chart,
)


def test_generate_opendrift_animation_mp4(tmp_path: Path):
    pytest.importorskip("cv2", reason="OpenCV is required for MP4 video writing")
    n_particles = 20
    n_times = 6
    times = pd.date_range("2024-08-06 00:00:00", periods=n_times, freq="1h", tz="UTC")

    # Generate synthetic drifting coords
    lons = np.zeros((n_particles, n_times))
    lats = np.zeros((n_particles, n_times))
    for t in range(n_times):
        lons[:, t] = -88.0 + (t * 0.01) + np.random.normal(0, 0.005, n_particles)
        lats[:, t] = 28.0 + (t * 0.008) + np.random.normal(0, 0.005, n_particles)

    out_base = tmp_path / "test_animation"
    mp4_path, html_path = generate_opendrift_animation(
        coords_hist=(lons, lats),
        times=times,
        start_lat=28.0,
        start_lon=-88.0,
        origin_lat=28.04,
        origin_lon=-87.95,
        output_base_path=out_base,
        fps=5,
    )

    assert mp4_path.exists()
    assert mp4_path.suffix == ".mp4"
    assert mp4_path.stat().st_size > 0

    assert html_path.exists()
    assert html_path.suffix == ".html"
    assert html_path.stat().st_size > 0
    html_content = html_path.read_text(encoding="utf-8")
    assert "<video" in html_content
    assert "test_animation.mp4" in html_content

    gif_path = tmp_path / "test_animation.gif"
    assert gif_path.exists()
    assert gif_path.stat().st_size > 0


def test_plot_detailed_drift_generates_image(tmp_path: Path):
    n_particles = 15
    n_times = 5
    times = pd.date_range("2024-08-06 00:00:00", periods=n_times, freq="1h", tz="UTC")

    lons = -88.0 + np.random.normal(0, 0.01, (n_particles, n_times))
    lats = 28.0 + np.random.normal(0, 0.01, (n_particles, n_times))

    out_png = tmp_path / "detailed_drift.png"
    fig = plot_detailed_drift(
        coords_hist=(lons, lats),
        times=times,
        title="Test Drift",
        start_lat=28.0,
        start_lon=-88.0,
        known_lat=28.02,
        known_lon=-87.98,
        output_path=out_png,
    )

    assert out_png.exists()
    assert out_png.stat().st_size > 0
