"""Command-line interface for the WAKE attribution validation benchmark suite."""

from pathlib import Path
import click
from ais_oil_attribution.benchmark.runner import run_benchmark_suite


@click.command()
@click.option("--quick", is_flag=True, help="Run in quick mode (fewer cases for fast CI/testing).")
@click.option("--cases", default=25, show_default=True, type=int, help="Number of benchmark cases to evaluate.")
@click.option("--seed", default=42, show_default=True, type=int, help="Deterministic random seed.")
@click.option("--output-dir", default="results/benchmark", show_default=True, type=click.Path(), help="Directory to save benchmark reports.")
def main(quick: bool, cases: int, seed: int, output_dir: str):
    """Executes the WAKE attribution offline validation benchmark."""
    click.secho("\n=======================================================", fg="cyan", bold=True)
    click.secho("  WAKE ATTRIBUTION VALIDATION BENCHMARK", fg="cyan", bold=True)
    click.secho("=======================================================", fg="cyan")
    click.echo(f"  Mode: {'QUICK (Offline CI)' if quick else 'FULL RIGOROUS'}")
    click.echo(f"  Cases: {min(cases, 10) if quick else cases}")
    click.echo(f"  Seed: {seed}")
    click.echo(f"  Output Directory: {output_dir}\n")

    out_p = Path(output_dir)
    res = run_benchmark_suite(n_cases=cases, quick_mode=quick, output_dir=out_p, seed=seed)

    comp = res.get("ranking_methods_comparison", {})
    click.secho("--- RANKING METHOD PERFORMANCE (EMPIRICAL) ---", fg="green", bold=True)
    click.echo(f"{'Method':<10} | {'Top-1 (95% CI)':<20} | {'Top-3 (95% CI)':<20} | {'MRR':<8} | {'NDCG@3':<8} | {'Abstain %':<10}")
    click.echo("-" * 85)

    for m, d in comp.items():
        ci1 = d['top1_ci_95']
        ci3 = d['top3_ci_95']
        top1_str = f"{d['top1_accuracy']:.2f} [{float(ci1[0]):.2f}, {float(ci1[1]):.2f}]"
        top3_str = f"{d['top3_accuracy']:.2f} [{float(ci3[0]):.2f}, {float(ci3[1]):.2f}]"
        abst_str = f"{d['abstention_rate_negative_controls']*100:.1f}%"
        click.echo(f"{m.upper():<10} | {top1_str:<20} | {top3_str:<20} | {d['mrr']:<8.3f} | {d['ndcg_at_3']:<8.3f} | {abst_str:<10}")

    click.secho("\n--- LLR CALIBRATION METRICS (HELD-OUT SYNTHETIC) ---", fg="yellow", bold=True)
    calib = res.get("calibration_evaluation_llr", {})
    click.echo(f"  Brier Score: {calib.get('brier_score', 0.0):.4f}")
    click.echo(f"  Expected Calibration Error (ECE): {calib.get('expected_calibration_error', 0.0):.4f}")

    click.secho("\n--- AIS RECONSTRUCTION VALIDATION (MASKED GAPS) ---", fg="blue", bold=True)
    ais_res = res.get("ais_reconstruction_validation", {}).get("results", [])
    click.echo(f"{'Gap (min)':<10} | {'Position RMSE (m)':<18} | {'P95 Error (m)':<15} | {'Max Error (m)':<15}")
    click.echo("-" * 65)
    for r in ais_res:
        click.echo(f"{r['gap_minutes']:<10} | {r['position_rmse_m']:<18.1f} | {r['p95_error_m']:<15.1f} | {r['max_error_m']:<15.1f}")

    click.secho("\n=======================================================", fg="cyan", bold=True)
    click.secho(f"  BENCHMARK COMPLETE -> Saved to: {out_p / 'benchmark_summary.json'}", fg="green", bold=True)
    click.secho("=======================================================\n", fg="cyan")


if __name__ == "__main__":
    main()
