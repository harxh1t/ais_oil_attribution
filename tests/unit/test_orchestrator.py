"""Unit tests for pipeline orchestrator."""

from pathlib import Path
from ais_oil_attribution.core.orchestrator import run_investigation
from tests.fixtures.synthetic_tracks import create_synthetic_ais_tracks, create_synthetic_slick


def test_run_investigation_end_to_end(tmp_path: Path):
    df_synthetic = create_synthetic_ais_tracks()
    slick_synthetic = create_synthetic_slick()

    res = run_investigation(
        lat=28.0,
        lon=-88.0,
        time_str="2024-08-06 12:00:00",
        spread_km=10.0,
        regime="contemporaneous",
        output_dir=str(tmp_path),
        non_interactive=True,
        slick_coords_override=slick_synthetic,
        ais_data_override=df_synthetic,
    )

    assert "investigation_id" in res
    assert Path(res["report_path"]).exists()
    assert res["candidates_count"] > 0
    assert res["top_candidate"] is not None

    # Candidate 1 (MATCH_VESSEL) should be ranked 1st
    top = res["top_candidate"]
    assert top["mmsi"] == 111111111
    assert top["final_rank"] == 1
    assert top["confidence_score"] > 0.50
    assert top["confidence_label"] in ["HIGH", "MEDIUM"]