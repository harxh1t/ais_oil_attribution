"""Command Line Interface for AIS Oil-Spill Vessel Attribution."""

import sys
import click
from pathlib import Path


@click.command(name="ais-oil-investigate")
@click.option("--lat", type=float, required=True, help="Observed spill latitude (-90 to 90).")
@click.option("--lon", type=float, required=True, help="Observed spill longitude (-180 to 180).")
@click.option("--time", "time_str", type=str, required=True, help="Observation timestamp (UTC). Format: YYYY-MM-DD HH:MM:SS")
@click.option("--spread", "spread_km", type=float, required=True, help="Tightest spread radius estimate in kilometers.")
@click.option("--regime", type=click.Choice(["auto", "contemporaneous", "delayed"], case_sensitive=False), default="auto", help="Analysis regime.")
@click.option("--config", "config_path", type=click.Path(exists=True), default=None, help="Path to custom config.yaml.")
@click.option("--oil-type", type=str, default=None, help="Oil type name for drift modeling (e.g. 'GENERIC DIESEL').")
@click.option("--output-dir", type=click.Path(), default="results", help="Directory where investigation bundles are saved.")
@click.option("--non-interactive", is_flag=True, default=False, help="Run without requiring interactive human confirmation.")
def main(lat: float, lon: float, time_str: str, spread_km: float, regime: str, config_path: str | None, oil_type: str | None, output_dir: str, non_interactive: bool):
    """
    AIS + Satellite Oil-Spill Vessel Attribution System.
    Investigates marine oil pollution incidents by correlating AIS vessel tracks with observed slicks.
    """
    from ais_oil_attribution.core.orchestrator import run_investigation

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
        )
        report_path = investigation_result.get("report_path")
        workstation_path = investigation_result.get("workstation_path")
        top_candidate = investigation_result.get("top_candidate")

        click.echo("\n=======================================================")
        click.echo("  INVESTIGATION COMPLETE")
        click.echo("=======================================================")
        if top_candidate:
            click.echo(f"Top Candidate: {top_candidate.get('vessel_name')} (MMSI: {top_candidate.get('mmsi')})")
            click.echo(f"Confidence: {top_candidate.get('confidence_label')} ({top_candidate.get('confidence_score'):.3f})")
        else:
            click.echo("No vessel candidate identified (possible dark vessel or non-vessel source).")
        click.echo(f"Classic Report: {report_path}")
        click.echo(f"Workstation UI: {workstation_path}")
        click.echo("=======================================================\n")
    except Exception as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
