"""Command Line Interface for AIS Oil-Spill Vessel Attribution."""

import sys
from pathlib import Path
from typing import Optional
import click


@click.command(name="ais-oil-investigate")
@click.option("--lat", type=float, default=None, help="Observed spill latitude (-90 to 90).")
@click.option("--lon", type=float, default=None, help="Observed spill longitude (-180 to 180).")
@click.option("--time", "time_str", type=str, default=None, help="Observation timestamp (UTC). Format: YYYY-MM-DD HH:MM:SS")
@click.option("--spread", "spread_km", type=float, default=None, help="Tightest spread radius estimate in kilometers.")
@click.option("--sar-image", "sar_image_path", type=click.Path(exists=True), default=None, help="Optional raw Sentinel-1 SAR GeoTIFF image to run DeepLabv3+ detection.")
@click.option("--weights", "weights_path", type=click.Path(), default=None, help="Optional path to best_deeplabv3plus_mobilenet.pth weights.")
@click.option("--regime", type=click.Choice(["auto", "contemporaneous", "delayed"], case_sensitive=False), default="auto", help="Analysis regime.")
@click.option("--config", "config_path", type=click.Path(exists=True), default=None, help="Path to custom config.yaml.")
@click.option("--oil-type", type=str, default=None, help="Oil type name for drift modeling (e.g. 'GENERIC DIESEL').")
@click.option("--output-dir", type=click.Path(), default="results", help="Directory where investigation bundles are saved.")
@click.option("--non-interactive", is_flag=True, default=False, help="Run without requiring interactive human confirmation.")
@click.option("--ranking-method", type=click.Choice(["borda", "topsis", "llr"], case_sensitive=False), default="borda", help="Candidate ranking method (borda, topsis, llr).")
@click.option("--enable-forward-fit", is_flag=True, default=False, help="Enable Longépé-style forward-fit trajectory recreation evidence channel.")
@click.option("--ship-detections", "ship_detections_path", type=click.Path(exists=True), default=None, help="Optional GeoJSON file containing satellite SAR ship detections.")
@click.option("--drift-backend", type=click.Choice(["analytic", "opendrift"], case_sensitive=False), default="analytic", help="Drift model backend.")
@click.option("--spill-geojson", "spill_geojson_path", type=click.Path(exists=True), default=None, help="Optional GeoJSON file containing observed oil spill polygon/footprint.")
@click.option("--case-experience/--no-case-experience", "case_experience", default=True, help="Emit unified 4-stage case_experience.html output.")
@click.option("--target-lat", type=float, default=None, help="Optional known/suspected origin latitude for Method 1 closest approach.")
@click.option("--target-lon", type=float, default=None, help="Optional known/suspected origin longitude for Method 1 closest approach.")
def main(
    lat: Optional[float],
    lon: Optional[float],
    time_str: Optional[str],
    spread_km: Optional[float],
    sar_image_path: Optional[str],
    weights_path: Optional[str],
    regime: str,
    config_path: Optional[str],
    oil_type: Optional[str],
    output_dir: str,
    non_interactive: bool,
    ranking_method: str,
    enable_forward_fit: bool,
    ship_detections_path: Optional[str],
    drift_backend: str,
    spill_geojson_path: Optional[str],
    case_experience: bool,
    target_lat: Optional[float] = None,
    target_lon: Optional[float] = None,
):
    """
    AIS + Satellite Oil-Spill Vessel Attribution System.
    Investigates marine oil pollution incidents by correlating AIS vessel tracks with observed slicks.
    Supports dual entry: coordinate input (--lat, --lon, --spread) or raw Sentinel-1 SAR image (--sar-image).
    """
    from ais_oil_attribution.core.orchestrator import run_investigation

    # If SAR image is provided, run DeepLabv3+ perception stage first
    if sar_image_path:
        click.echo("=======================================================")
        click.echo("  SATELLITE PERCEPTION: DeepLabv3+ (MobileNetV2)")
        click.echo("=======================================================")
        click.echo(f"Ingesting raw Sentinel-1 SAR GeoTIFF: {sar_image_path}")
        from ais_oil_attribution.perception.deeplabv3_detector import detect_oil_slick_from_sar

        detection_res = detect_oil_slick_from_sar(
            tiff_path=sar_image_path,
            weights_path=weights_path,
            output_geojson_path=spill_geojson_path,
        )
        spill_geojson_path = detection_res["geojson_path"]
        primary = detection_res.get("primary_slick")
        if primary:
            click.echo(f"  • Slicks detected: {detection_res['num_slicks_detected']}")
            click.echo(f"  • Primary Centroid: lat={primary['lat']:.4f}, lon={primary['lon']:.4f}")
            click.echo(f"  • Estimated Spread Radius: {primary['spread_km']:.2f} km")
            click.echo(f"  • Vectorized GeoJSON: {spill_geojson_path}")
            if lat is None:
                lat = primary["lat"]
            if lon is None:
                lon = primary["lon"]
            if spread_km is None:
                spread_km = primary["spread_km"]
        else:
            click.echo("  • Notice: No slicks detected in SAR imagery.")

    # Validation for coordinate mode
    if lat is None or lon is None:
        raise click.UsageError("Missing latitude/longitude. Provide --lat and --lon, or provide a valid --sar-image.")
    if time_str is None:
        raise click.UsageError("Missing observation time. Provide --time 'YYYY-MM-DD HH:MM:SS'.")
    if spread_km is None:
        spread_km = 5.0  # Default reasonable spread if not auto-detected or specified

    try:
        investigation_result = run_investigation(
            lat=lat,
            lon=lon,
            time_str=time_str,
            spread_km=spread_km,
            regime=regime,
            config_path=config_path,
            oil_type=oil_type,
            output_dir=output_dir,
            non_interactive=non_interactive,
            ranking_method=ranking_method,
            include_forward_fit=enable_forward_fit,
            ship_detections_path=ship_detections_path,
            drift_backend=drift_backend,
            spill_geojson=spill_geojson_path,
            emit_case_experience=case_experience,
            target_lat=target_lat,
            target_lon=target_lon,
        )
        report_path = investigation_result.get("report_path")
        workstation_path = investigation_result.get("workstation_path")
        case_exp_path = investigation_result.get("case_experience_path")
        top_candidate = investigation_result.get("top_candidate")

        click.echo("\n=======================================================")
        click.echo("  INVESTIGATION COMPLETE")
        click.echo("=======================================================")
        click.echo(f"Ranking Engine: {ranking_method.upper()}")
        if top_candidate:
            click.echo(f"Top Candidate: {top_candidate.get('vessel_name')} (MMSI: {top_candidate.get('mmsi')})")
            click.echo(f"Confidence: {top_candidate.get('confidence_label')} ({top_candidate.get('confidence_score'):.3f})")
            if "forward_fit_score" in top_candidate and top_candidate["forward_fit_score"] is not None:
                click.echo(f"Forward-Fit Score: {top_candidate['forward_fit_score']:.2f}")
            if "evidence_posterior" in top_candidate and top_candidate["evidence_posterior"] is not None:
                click.echo(f"Evidence Posterior (Synthetic Calibrated): {top_candidate['evidence_posterior']:.3f}")
        else:
            click.echo("No vessel candidate identified (possible dark vessel or non-vessel source).")
        click.echo(f"Classic Report: {report_path}")
        click.echo(f"Workstation UI: {workstation_path}")
        if case_exp_path:
            click.echo(f"Case Experience: {case_exp_path}")

        bundle_path_str = investigation_result.get("bundle_path")
        if bundle_path_str:
            figures_dir = Path(bundle_path_str) / "figures"
            if figures_dir.exists():
                click.echo("\n--- OpenDrift Hydrodynamic Visualizations (Light Mode) ---")
                for fig_name, label in [
                    ("backward_drift_map.png", "Backward Drift Map (PNG)"),
                    ("backward_drift_animation.gif", "Backward Animation (GIF)"),
                    ("backward_drift_animation.html", "Backward Animation Player (HTML)"),
                    ("forward_drift_map.png", "Forward Prediction Map (PNG)"),
                    ("forward_drift_animation.gif", "Forward Animation (GIF)"),
                    ("forward_drift_animation.html", "Forward Animation Player (HTML)"),
                    ("best_origin_diagnostic_graph.png", "Origin Diagnostics Graph (PNG)"),
                ]:
                    f_file = figures_dir / fig_name
                    if f_file.exists():
                        click.echo(f"  • {label}: {f_file}")

        click.echo("=======================================================\n")
    except Exception as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
