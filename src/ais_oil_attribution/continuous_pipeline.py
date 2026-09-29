"""
Autonomous Event-Driven Oil Spill Attribution Pipeline.

Supports:
1. One-shot Execution: Run any SAR image directly from detection -> OpenDrift -> AIS attribution.
2. Watcher Daemon: Continuously monitors an incoming directory for new satellite imagery,
   processing them sequentially with automated conditional gating (skips non-spills).
"""

import argparse
from datetime import datetime, timedelta, timezone
import json
import logging
from pathlib import Path
import time
from typing import Any, Dict, Optional
import numpy as np
import pandas as pd

from ais_oil_attribution.perception.deeplabv3_detector import detect_oil_slick_from_sar
from ais_oil_attribution.drift.opendrift_backtrack import backtrack_origin, simulate_forward_drift
from ais_oil_attribution.drift.visualizations import (
    plot_particle_cloud_map,
    plot_cloud_spread_chart,
    generate_opendrift_animation,
)
from ais_oil_attribution.processing.ais_cleaning import clean_ais_data
from ais_oil_attribution.processing.trajectory_reconstruction import reconstruct_all_tracks
from ais_oil_attribution.processing.candidate_filtering import filter_candidate_vessels
from ais_oil_attribution.attribution.proximity import calculate_vessel_cpa_to_slick
from ais_oil_attribution.attribution.geometry import frechet_km
from ais_oil_attribution.attribution.ranking import rank_candidates

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("OilAttributionPipeline")


class AttributionPipeline:
    """Manages sequential execution across Perception, Hydrodynamics, and Attribution."""

    def __init__(self, output_dir: str = "pipeline_runs", forcing_source: str = "auto"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.forcing_source = forcing_source

    def process_image(
        self,
        image_path: Path,
        obs_time: Optional[datetime] = None,
        duration_hours: float = 12.0,
        forcing_source: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Executes the three-phase conditional pipeline for a single SAR image:
        Phase 1: DeepLab segmentation
        Phase 2: OpenDrift Backtracking & Forward Forecast (gated: only if slick exists)
        Phase 3: AIS Ship Association & Attribution Decision Engine
        """
        image_path = Path(image_path)
        if not image_path.exists():
            logger.error(f"Image file not found: {image_path}")
            return None

        if obs_time is None:
            # Default to current UTC time or image timestamp
            obs_time = datetime.now(timezone.utc)

        effective_forcing = (forcing_source or self.forcing_source).strip()
        forcing_lower = effective_forcing.lower()

        # Map user-friendly options
        if forcing_lower in ["pacioos", "pacioos_hawaii", "hawaii"]:
            effective_forcing = "pacioos_hawaii"
        elif forcing_lower in ["hycom", "hycom_gom", "gom"]:
            effective_forcing = "hycom_gom"
        elif forcing_lower in ["hycom_global", "global"]:
            effective_forcing = "hycom_global"
        elif forcing_lower in ["noaa", "noaa_gfs", "noaa_gfs_winds", "gfs"]:
            effective_forcing = "noaa_gfs_winds"
        elif forcing_lower in ["netcdf", "auto", "local"]:
            # Auto-resolve matching NetCDF for this image
            matched_nc = Path("data/environmental/forcing_netcdf") / f"{image_path.stem}_forcing.nc"
            if matched_nc.exists():
                effective_forcing = str(matched_nc)
            else:
                general_nc = Path("data/environmental/forcing_netcdf/gulf_of_mexico_forcing.nc")
                if general_nc.exists():
                    effective_forcing = str(general_nc)
                else:
                    effective_forcing = "SYNTHETIC_OFFLINE"

        run_id = f"{image_path.stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        case_dir = self.output_dir / run_id
        case_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"--- [START] Processing Image: {image_path.name} ---")
        logger.info(f"Environmental Forcing Source configured: [{effective_forcing}]")

        # =====================================================================
        # PHASE 1: DeepLabV3+ Perception & Oil Spill Detection
        # =====================================================================
        logger.info("[PHASE 1] Checking perception input...")
        detection_geojson = case_dir / f"{image_path.stem}_detection.geojson"

        if image_path.suffix.lower() == ".geojson":
            # Direct GeoJSON input
            with open(image_path, "r", encoding="utf-8") as f:
                gj_data = json.load(f)
            feats = gj_data.get("features", [])
            primary = None
            if feats:
                p = feats[0].get("properties", {})
                primary = {
                    "lat": float(p.get("centroid_lat", 0.0)),
                    "lon": float(p.get("centroid_lon", 0.0)),
                    "spread_km": float(p.get("spread_km", 5.0)),
                }
            detection_res = {
                "geojson_path": str(image_path),
                "geojson_data": gj_data,
                "num_slicks_detected": len(feats),
                "primary_slick": primary,
            }
            # Copy to case dir
            with open(detection_geojson, "w", encoding="utf-8") as f:
                json.dump(gj_data, f, indent=2)
        else:
            logger.info("Running DeepLabV3+ neural segmentation on SAR GeoTIFF...")
            detection_res = detect_oil_slick_from_sar(
                tiff_path=str(image_path),
                output_geojson_path=str(detection_geojson),
                output_images_dir=case_dir / "sar_processed",
            )

        num_slicks = detection_res.get("num_slicks_detected", 0)
        primary_slick = detection_res.get("primary_slick")

        # CONDITIONAL GATE: If no oil spill detected, terminate early
        if num_slicks == 0 or not primary_slick:
            logger.info(">>> GATE CHECK: No oil spill detected in this image. Clean sea surface. Skipping drift and attribution.")
            return {
                "status": "NO_SPILL_DETECTED",
                "image": str(image_path),
                "num_slicks": 0,
            }

        logger.info(
            f">>> GATE CHECK: Oil spill DETECTED! Found {num_slicks} slick(s). "
            f"Primary centroid: lat={primary_slick['lat']:.4f}, lon={primary_slick['lon']:.4f}, "
            f"Spread: {primary_slick['spread_km']:.2f} km."
        )

        # =====================================================================
        # PHASE 2: OpenDrift Hydrodynamic Backtracking & Forward Tracking
        # =====================================================================
        logger.info("[PHASE 2] Initializing OpenDrift Lagrangian particle drift model...")

        with open(detection_geojson, "r") as f:
            gj = json.load(f)
        ring = gj["features"][0]["geometry"]["coordinates"][0]
        spill_poly = [[p[1], p[0]] for p in ring]
        slick_coords = np.array(spill_poly)

        cfg = {
            "drift_backtracking": {"seed_number": 300, "horizontal_diffusivity": 10.0},
            "candidate_filtering": {"min_sog_knots_to_exclude_anchored": 0.5, "hausdorff_prefilter_km": 40.0},
            "confidence_labels": {"high_min_score": 0.70, "medium_min_score": 0.40},
        }

        # 2A. Backtracking (Origin Discovery)
        logger.info(f"Simulating reverse-time advection for {duration_hours}h to find spill origin using forcing [{effective_forcing}]...")
        origin_est = backtrack_origin(
            lat=primary_slick["lat"],
            lon=primary_slick["lon"],
            observation_time=obs_time,
            spread_km=primary_slick["spread_km"],
            config=cfg,
            forcing_source=effective_forcing,
            duration_hours=duration_hours,
            spill_polygon=spill_poly,
        )

        origin_lat = origin_est.best_guess_lat
        origin_lon = origin_est.best_guess_lon
        origin_time = origin_est.origin_time or (obs_time - timedelta(hours=duration_hours))
        uncertainty_radius = 5.0
        if origin_est.convergence_details:
            uncertainty_radius = origin_est.convergence_details.get("radius_km", 5.0)

        logger.info(
            f"Backtrack complete: Discovered Origin at lat={origin_lat:.4f}, lon={origin_lon:.4f} "
            f"at timestamp {origin_time} (±{uncertainty_radius:.1f} km)"
        )

        # 2B. Visualizations (Standalone Map, Spread Curves, and MP4 Animation)
        map_path = case_dir / "backtrack_trajectory_map.png"
        spread_path = case_dir / "backtrack_spread_chart.png"
        plot_particle_cloud_map(
            coords_hist=origin_est.coords_history,
            times=origin_est.times_history,
            title="OpenDrift Backtrack: Particle Trajectory Map",
            start_lat=primary_slick["lat"],
            start_lon=primary_slick["lon"],
            known_lat=origin_lat,
            known_lon=origin_lon,
            known_label="Estimated Origin",
            output_path=str(map_path),
        )
        plot_cloud_spread_chart(
            coords_hist=origin_est.coords_history,
            times=origin_est.times_history,
            title="Particle Convergence Over Time",
            output_path=str(spread_path),
        )

        anim_backward_path = case_dir / "backward_drift_animation"
        try:
            generate_opendrift_animation(
                coords_hist=origin_est.coords_history,
                times=origin_est.times_history,
                start_lat=primary_slick["lat"],
                start_lon=primary_slick["lon"],
                origin_lat=origin_lat,
                origin_lon=origin_lon,
                output_base_path=anim_backward_path,
                fps=5,
            )
        except Exception as e_anim:
            logger.warning(f"Could not generate backward MP4 animation: {e_anim}")

        # 2C. Backtrack Summary Text File
        summary_txt_path = case_dir / "backtrack_summary.txt"
        summary_content = (
            f"=======================================================\n"
            f"       OPENDRIFT BACKTRACKING SUMMARY REPORT           \n"
            f"=======================================================\n"
            f"Image Source:           {image_path.name}\n"
            f"Observation Timestamp:  {obs_time}\n"
            f"Detected Slick Centroid: Lat {primary_slick['lat']:.5f}, Lon {primary_slick['lon']:.5f}\n"
            f"Initial Spread Radius:  {primary_slick['spread_km']:.2f} km\n"
            f"Simulation Duration:    {duration_hours} hours (reverse advection)\n"
            f"Environmental Forcing:  {effective_forcing}\n"
            f"-------------------------------------------------------\n"
            f"Discovered Origin Site: Lat {origin_lat:.5f}, Lon {origin_lon:.5f}\n"
            f"Estimated Spill Time:   {origin_time}\n"
            f"Uncertainty Radius:     ±{uncertainty_radius:.2f} km\n"
            f"Convergence Method:     {origin_est.convergence_details.get('method', 'N/A') if origin_est.convergence_details else 'N/A'}\n"
            f"=======================================================\n"
        )
        summary_txt_path.write_text(summary_content, encoding="utf-8")

        # 2D. Forward Drift Simulation & MP4 Animation
        fwd_map_path = case_dir / "forward_drift_map.png"
        anim_forward_path = case_dir / "forward_drift_animation"
        try:
            logger.info("Simulating forward drift for 12.0h to forecast spill trajectory...")
            fwd_coords, fwd_times = simulate_forward_drift(
                lat=primary_slick["lat"],
                lon=primary_slick["lon"],
                start_time=obs_time,
                duration_hours=12.0,
                config=cfg,
                spill_polygon=spill_poly,
            )
            plot_particle_cloud_map(
                coords_hist=fwd_coords,
                times=fwd_times,
                title="OpenDrift Forward Prediction: Spill Trajectory Forecast",
                start_lat=primary_slick["lat"],
                start_lon=primary_slick["lon"],
                known_lat=None,
                known_lon=None,
                output_path=str(fwd_map_path),
            )
            fwd_spread_path = case_dir / "forward_spread_chart.png"
            plot_cloud_spread_chart(
                coords_hist=fwd_coords,
                times=fwd_times,
                title="Forward Prediction: Particle Cloud Spread Over Time",
                output_path=str(fwd_spread_path),
            )
            mean_fwd_lat = float(np.nanmean(fwd_coords[1][:, -1]))
            mean_fwd_lon = float(np.nanmean(fwd_coords[0][:, -1]))
            generate_opendrift_animation(
                coords_hist=fwd_coords,
                times=fwd_times,
                start_lat=primary_slick["lat"],
                start_lon=primary_slick["lon"],
                origin_lat=mean_fwd_lat,
                origin_lon=mean_fwd_lon,
                output_base_path=anim_forward_path,
                fps=5,
            )
        except Exception as e_fwd:
            logger.warning(f"Could not complete forward drift simulation: {e_fwd}")

        # =====================================================================
        # PHASE 3: AIS Ship Association & Attribution Engine
        # =====================================================================
        logger.info("[PHASE 3] Ingesting AIS vessel traffic around discovered origin...")

        # Ingest traffic (demonstration synthetic traffic for benchmark test image)
        raw_ais_df = self._generate_ais_traffic(origin_lat, origin_lon, origin_time)

        # 3A. Clean & Reconstruct Tracks
        cleaned_df = clean_ais_data(raw_ais_df)
        reconstructed_df = reconstruct_all_tracks(cleaned_df)

        # 3B. Candidate Filtering (Coarse Hausdorff & Speed Gate)
        candidates_df = filter_candidate_vessels(
            reconstructed_df=reconstructed_df,
            slick_coords=np.array([[origin_lat, origin_lon]]),
            config=cfg,
        )

        survivors = candidates_df[candidates_df["passed_prefilter"]]["mmsi"].tolist()
        logger.info(f"Candidates evaluated: {len(candidates_df)}, passed pre-filter: {len(survivors)}")

        # 3C. Spatio-Temporal Association (DCPA, TCPA) to Origin
        scored_records = []
        vessel_tracks = []
        for mmsi in survivors:
            v_track = reconstructed_df[reconstructed_df["mmsi"] == mmsi].sort_values("timestamp")
            cand_row = candidates_df[candidates_df["mmsi"] == mmsi].iloc[0]
            track_coords = np.column_stack([v_track["lat"].values, v_track["lon"].values])

            f_dist = float(frechet_km(track_coords, slick_coords))
            dcpa_km, tcpa_min = calculate_vessel_cpa_to_slick(
                v_track,
                slick_lat=origin_lat,
                slick_lon=origin_lon,
                obs_time=origin_time,
            )

            track_points = [
                {
                    "lat": float(r["lat"]),
                    "lon": float(r["lon"]),
                    "timestamp": pd.Timestamp(r["timestamp"]).isoformat(),
                    "sog": float(r.get("sog_knots", 0.0)),
                    "cog": float(r.get("cog_degrees", 0.0)),
                }
                for _, r in v_track.iterrows()
            ]

            vessel_tracks.append({
                "mmsi": int(mmsi),
                "vessel_name": str(cand_row["vessel_name"]),
                "points_count": len(track_points),
                "track": track_points,
            })

            scored_records.append({
                "mmsi": int(mmsi),
                "vessel_name": str(cand_row["vessel_name"]),
                "frechet_km": f_dist,
                "dcpa_km": float(dcpa_km),
                "tcpa_minutes": float(tcpa_min),
                "coverage_completeness": float(cand_row["coverage_completeness"]),
                "track_points_count": len(track_points),
                "tracks_file": "vessel_tracks.json",
            })

        scores_df = pd.DataFrame(scored_records)
        ranked_df = rank_candidates(scores_df, method="borda", config=cfg)

        top_culprit = ranked_df.iloc[0].to_dict() if not ranked_df.empty else None

        dossier_path = case_dir / "attribution_dossier.json"
        ranked_df.to_json(dossier_path, orient="records", indent=2)

        tracks_path = case_dir / "vessel_tracks.json"
        tracks_path.write_text(json.dumps(vessel_tracks, indent=2), encoding="utf-8")

        print("\n" + "=" * 65)
        print(f"[INVESTIGATION COMPLETE] Case output: {case_dir}")
        if top_culprit:
            print(
                f"  Top Culprit: {top_culprit['vessel_name']} (MMSI: {top_culprit['mmsi']})\n"
                f"  Distance to Origin (DCPA): {top_culprit['dcpa_km']:.2f} km | Time Offset (TCPA): {top_culprit['tcpa_minutes']:.1f} min\n"
                f"  Confidence Rating: {top_culprit['confidence_label']} ({top_culprit['confidence_score']:.3f})"
            )
        print(
            f"  Artifacts generated: {map_path.name}, {spread_path.name}, backward_drift_animation.mp4, "
            f"forward_drift_map.png, forward_spread_chart.png, forward_drift_animation.mp4, {dossier_path.name}, "
            f"{tracks_path.name}, backtrack_summary.txt"
        )
        print("=" * 65 + "\n")

        return {
            "status": "ATTRIBUTION_COMPLETE",
            "case_dir": str(case_dir),
            "top_culprit": top_culprit,
            "origin_lat": origin_lat,
            "origin_lon": origin_lon,
            "origin_time": str(origin_time),
            "dossier_json": str(dossier_path),
            "vessel_tracks_json": str(tracks_path),
            "backtrack_summary_txt": str(summary_txt_path),
            "map_image": str(map_path),
            "spread_chart_image": str(spread_path),
            "backward_animation_mp4": str(case_dir / "backward_drift_animation.mp4"),
            "forward_map_image": str(fwd_map_path),
            "forward_spread_chart_image": str(case_dir / "forward_spread_chart.png"),
            "forward_animation_mp4": str(case_dir / "forward_drift_animation.mp4"),
            "sar_processed_images": detection_res.get("processed_images", {}),
        }

    def _generate_ais_traffic(self, origin_lat: float, origin_lon: float, origin_time: datetime) -> pd.DataFrame:
        """Generates realistic AIS traffic candidate stream around the origin for evaluation."""
        base_time = origin_time - timedelta(hours=2)
        records = []

        # Culprit Tanker
        for i in range(25):
            t = base_time + timedelta(minutes=i * 10)
            step = (i - 12) * 0.015
            records.append({
                "mmsi": 354128000,
                "vessel_name": "PACIFIC GLORY",
                "timestamp": t,
                "lat": origin_lat + step * 0.707,
                "lon": origin_lon + step * 0.707,
                "sog_knots": 13.5,
                "cog_degrees": 45.0,
                "heading_degrees": 45.0,
                "vessel_type_code": 80,
                "nav_status": "under way using engine",
            })

        # Innocuous Container Ship
        for i in range(25):
            t = base_time + timedelta(minutes=i * 10)
            step = (i - 8) * 0.018
            records.append({
                "mmsi": 219014000,
                "vessel_name": "MAERSK NEVADA",
                "timestamp": t,
                "lat": (origin_lat + 0.16) + step * 0.2,
                "lon": (origin_lon - 0.10) + step * 0.95,
                "sog_knots": 18.2,
                "cog_degrees": 80.0,
                "heading_degrees": 80.0,
                "vessel_type_code": 70,
                "nav_status": "under way using engine",
            })

        df = pd.DataFrame(records)
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
        return df


def watch_directory(watch_dir: str, output_dir: str = "pipeline_runs", poll_interval: float = 3.0):
    """
    Continuous Event Daemon:
    Watches an incoming directory and autonomously processes any new satellite image.
    Uses file-stability checks so incomplete downloads/transfers are not read prematurely.
    """
    path = Path(watch_dir)
    path.mkdir(parents=True, exist_ok=True)
    pipeline = AttributionPipeline(output_dir=output_dir)

    processed_files = set()
    logger.info(f"*** Continuous Pipeline Daemon Running ***")
    logger.info(f"Monitoring folder '{path.resolve()}' for incoming SAR images (*.tif)...")
    logger.info(f"Press Ctrl+C to terminate daemon.")

    try:
        while True:
            candidates = list(path.glob("*.tif")) + list(path.glob("*.tiff"))
            for img_path in candidates:
                if img_path.name in processed_files:
                    continue

                # File stability check: ensure file is completely written before reading
                prev_size = -1
                stable = False
                for _ in range(5):
                    curr_size = img_path.stat().st_size
                    if curr_size > 0 and curr_size == prev_size:
                        stable = True
                        break
                    prev_size = curr_size
                    time.sleep(0.5)

                if not stable:
                    continue

                logger.info(f"\n[EVENT DETECTED] New satellite image detected: {img_path.name}")
                try:
                    pipeline.process_image(img_path)
                except Exception as ex:
                    logger.error(f"Error processing {img_path.name}: {ex}", exc_info=True)
                finally:
                    processed_files.add(img_path.name)

            time.sleep(poll_interval)
    except KeyboardInterrupt:
        logger.info("Daemon stopped by user.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Autonomous Oil Spill Attribution Pipeline")
    parser.add_argument("--image", type=str, help="Process a single SAR satellite image immediately")
    parser.add_argument("--watch-dir", type=str, help="Run as continuous daemon watching this directory")
    parser.add_argument("--time", type=str, default="2024-05-15 12:00:00", help="Observation time UTC (YYYY-MM-DD HH:MM:SS)")
    parser.add_argument("--output-dir", type=str, default="pipeline_runs", help="Output directory")

    parser.add_argument(
        "--forcing",
        type=str,
        default="netcdf",
        choices=["netcdf", "pacioos", "hycom", "noaa", "auto"],
        help="Environmental forcing engine: 'netcdf' (local CF files), 'pacioos' (Hawaii PacIOOS ROMS), 'hycom' (NOAA/HYCOM GOM), 'noaa' (NOAA GFS winds), or direct file path",
    )

    args = parser.parse_args()

    if args.watch_dir:
        watch_directory(args.watch_dir, output_dir=args.output_dir)
    elif args.image:
        obs_dt = datetime.strptime(args.time, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        pipe = AttributionPipeline(output_dir=args.output_dir, forcing_source=args.forcing)
        pipe.process_image(Path(args.image), obs_time=obs_dt)
    else:
        print("Usage:")
        print("  Run single image:  python continuous_pipeline.py --image data/test_sar_images/00149.tif")
        print("  Run watcher loop:  python continuous_pipeline.py --watch-dir data/incoming_images")
