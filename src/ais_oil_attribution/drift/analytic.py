"""Deterministic analytic drift model for testing, synthetic benchmarks, and offline CI."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from shapely.geometry import MultiPoint, Point, Polygon, mapping

from ais_oil_attribution.drift.base import DriftModel, OriginEstimate


class AnalyticDriftModel(DriftModel):
    """Deterministic, lightweight analytic advection and dispersion model.

    Advection velocity:
        V_total = V_current + L_w * V_wind
    where:
        V_current = (u_current, v_current) [m/s]
        V_wind = Wind velocity vector [m/s]
        L_w = Windage / leeway coefficient (typically 0.03 / 3%)
    Diffusion:
        dx_diff = sqrt(2 * D_h * dt) * N(0, 1)
    """

    def __init__(
        self,
        current_u_ms: float = 0.15,
        current_v_ms: float = 0.10,
        wind_speed_ms: float = 5.0,
        wind_dir_deg: float = 45.0,
        windage_coeff: float = 0.03,
        horizontal_diffusivity_m2s: float = 2.0,
        seed: Optional[int] = 42,
    ):
        self.current_u_ms = current_u_ms
        self.current_v_ms = current_v_ms
        self.wind_speed_ms = wind_speed_ms
        self.wind_dir_deg = wind_dir_deg
        self.windage_coeff = windage_coeff
        self.horizontal_diffusivity_m2s = horizontal_diffusivity_m2s
        self.seed = seed

    def _get_velocity(
        self,
        wind_speed_pert: float = 0.0,
        wind_dir_pert: float = 0.0,
        current_u_pert: float = 0.0,
        current_v_pert: float = 0.0,
        windage_pert: float = 0.0,
    ) -> Tuple[float, float]:
        ws = self.wind_speed_ms + wind_speed_pert
        wdir_rad = np.radians(self.wind_dir_deg + wind_dir_pert)
        # Wind blowing TOWARDS direction (meteorological standard: from direction - 180 or math angle)
        u_wind = ws * np.sin(wdir_rad)
        v_wind = ws * np.cos(wdir_rad)

        lw = self.windage_coeff + windage_pert
        u_curr = self.current_u_ms + current_u_pert
        v_curr = self.current_v_ms + current_v_pert

        u_tot = u_curr + lw * u_wind
        v_tot = v_curr + lw * v_wind
        return u_tot, v_tot

    def backtrack(
        self,
        lat: float,
        lon: float,
        observation_time: datetime,
        spread_km: float,
        duration_hours: float = 12.0,
        config: Optional[Dict[str, Any]] = None,
        forcing_source: Optional[str] = None,
    ) -> OriginEstimate:
        """Advects particles backward in time to reconstruct the release origin."""
        if observation_time.tzinfo is None:
            observation_time = observation_time.replace(tzinfo=timezone.utc)

        cfg = config or {}
        drift_cfg = cfg.get("drift_backtracking", {})
        seed_number = drift_cfg.get("seed_number", 500)
        seed_radius_m = drift_cfg.get("seed_radius_m", max(1000, int(spread_km * 500)))

        rng = np.random.default_rng(self.seed)

        # Initial seed around observed slick
        r_deg = (seed_radius_m / 1000.0) / 111.139
        r_lon_deg = r_deg / max(0.1, np.cos(np.radians(lat)))

        init_lats = lat + rng.normal(0, r_deg * 0.5, seed_number)
        init_lons = lon + rng.normal(0, r_lon_deg * 0.5, seed_number)

        dt_sec = 300.0  # 5 min timestep
        n_steps = int((duration_hours * 3600.0) / dt_sec)
        total_time_sec = duration_hours * 3600.0

        u_tot, v_tot = self._get_velocity()

        # Reverse advection: move by -V_total * time
        # Convert m/s -> degrees/sec
        meters_to_lat_deg = 1.0 / 111139.0
        meters_to_lon_deg = 1.0 / (111139.0 * max(0.1, np.cos(np.radians(lat))))

        diff_std = np.sqrt(2.0 * self.horizontal_diffusivity_m2s * total_time_sec)
        diff_noise_x = rng.normal(0, diff_std, seed_number)
        diff_noise_y = rng.normal(0, diff_std, seed_number)

        # Reverse advection displacement
        delta_x_m = -u_tot * total_time_sec + diff_noise_x
        delta_y_m = -v_tot * total_time_sec + diff_noise_y

        final_lats = init_lats + delta_y_m * meters_to_lat_deg
        final_lons = init_lons + delta_x_m * meters_to_lon_deg

        particles_final = np.column_stack([final_lats, final_lons])
        best_guess_lat = float(np.mean(final_lats))
        best_guess_lon = float(np.mean(final_lons))

        # Build polygons
        mp = MultiPoint([(p[1], p[0]) for p in particles_final])
        best_guess_poly = mp.convex_hull
        min_regret_poly = best_guess_poly.buffer(0.04)  # ~4.4 km minimum-regret buffer

        note = f"Deterministic analytic reverse drift: {duration_hours:.1f}h backtrack (U={u_tot:.2f} m/s, V={v_tot:.2f} m/s)."

        return OriginEstimate(
            best_guess_lat=best_guess_lat,
            best_guess_lon=best_guess_lon,
            best_guess_geojson=mapping(best_guess_poly),
            minimum_regret_geojson=mapping(min_regret_poly),
            particles_final=particles_final,
            duration_hours=duration_hours,
            note=note,
        )

    def forward_track(
        self,
        release_points: np.ndarray,
        start_time: datetime,
        end_time: datetime,
        config: Optional[Dict[str, Any]] = None,
        ensemble_size: int = 20,
        wind_perturbation: float = 0.0,
        current_perturbation: float = 0.0,
    ) -> np.ndarray:
        """Simulates forward advection of particles from release points to observation time."""
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)

        dt_sec = max(0.0, (end_time - start_time).total_seconds())
        if dt_sec <= 0.0 or len(release_points) == 0:
            return release_points.copy()

        rng = np.random.default_rng(self.seed)
        u_base, v_base = self._get_velocity(
            wind_speed_pert=wind_perturbation,
            current_u_pert=current_perturbation,
            current_v_pert=current_perturbation,
        )

        all_predicted = []
        diff_std = np.sqrt(2.0 * self.horizontal_diffusivity_m2s * dt_sec)

        for pt in release_points:
            p_lat, p_lon = float(pt[0]), float(pt[1])
            m_lat = 1.0 / 111139.0
            m_lon = 1.0 / (111139.0 * max(0.1, np.cos(np.radians(p_lat))))

            for _ in range(ensemble_size):
                # Small ensemble perturbations
                u_pert = u_base + rng.normal(0, 0.05)
                v_pert = v_base + rng.normal(0, 0.05)
                dx = u_pert * dt_sec + rng.normal(0, diff_std)
                dy = v_pert * dt_sec + rng.normal(0, diff_std)

                pred_lat = p_lat + dy * m_lat
                pred_lon = p_lon + dx * m_lon
                all_predicted.append([pred_lat, pred_lon])

        return np.array(all_predicted)
