"""MarineCadastre AIS Backend implementation using DuckDB."""

from datetime import datetime, timedelta, timezone
import math
from typing import Any, Dict, List, Optional
import duckdb
import numpy as np
import pandas as pd

from ais_oil_attribution.data.ais_backend.base import AISBackend, UnsupportedRegionError, AISBackendError

# ENGINEERING ASSUMPTION: Approximate bounding envelope for US Waters / EEZ (including AK, HI, PR, GOM)
US_WATERS_LAT_MIN = 17.0
US_WATERS_LAT_MAX = 72.0
US_WATERS_LON_MIN = -180.0
US_WATERS_LON_MAX = -64.0


class MarineCadastreBackend(AISBackend):
    """
    AIS Backend for NOAA Marine Cadastre data.
    Queries Parquet / GeoParquet datasets using DuckDB.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None, db_connection: Optional[duckdb.DuckDBPyConnection] = None):
        self.config = config or {}
        self.ais_cfg = self.config.get("ais_backend", {})
        self.us_waters_only = self.ais_cfg.get("us_waters_only", True)
        self.geoparquet_base_url = self.ais_cfg.get("geoparquet_base_url")
        self._con = db_connection

    def _get_connection(self) -> duckdb.DuckDBPyConnection:
        if self._con is not None:
            return self._con
        con = duckdb.connect()
        try:
            con.execute("INSTALL httpfs; LOAD httpfs;")
        except Exception:
            pass  # httpfs may already be available or offline
        try:
            con.execute("INSTALL spatial; LOAD spatial;")
        except Exception:
            pass  # spatial may already be available or offline
        return con

    def _is_in_us_waters(self, lat: float, lon: float) -> bool:
        """Rough bounding envelope check for US coastal waters."""
        return (
            US_WATERS_LAT_MIN <= lat <= US_WATERS_LAT_MAX
            and US_WATERS_LON_MIN <= lon <= US_WATERS_LON_MAX
        )

    def _resolve_data_urls(self, start_time: datetime, end_time: datetime) -> List[str]:
        """
        Resolves the list of data source paths or URLs covering the time window.
        """
        if self.geoparquet_base_url:
            base_url = str(self.geoparquet_base_url)
            if "{year}" in base_url or "{month}" in base_url or "{day}" in base_url:
                urls = []
                cur = start_time.date()
                end_date = end_time.date()
                while cur <= end_date:
                    u = base_url.format(year=cur.year, month=f"{cur.month:02d}", day=f"{cur.day:02d}")
                    if u not in urls:
                        urls.append(u)
                    cur += timedelta(days=1)
                return urls
            return [base_url]

        # NOAA MarineCadastre standard daily GeoParquet URLs (2024+ format)
        urls = []
        cur = start_time.date()
        end_date = end_time.date()
        while cur <= end_date:
            url = f"https://ocmgeodatastor1.blob.core.windows.net/marinecadastre/ais{cur.year}/ais-{cur.year}-{cur.month:02d}-{cur.day:02d}.parquet"
            if url not in urls:
                urls.append(url)
            cur += timedelta(days=1)
        return urls

    def _query_single_source(
        self,
        con: duckdb.DuckDBPyConnection,
        data_source: str,
        lat_min: float,
        lat_max: float,
        lon_min: float,
        lon_max: float,
        start_iso: str,
        end_iso: str,
    ) -> pd.DataFrame:
        """
        Queries a single parquet source dynamically adapting to its schema.
        """
        # 1. Inspect columns
        try:
            cols_df = con.execute(f"DESCRIBE SELECT * FROM read_parquet('{data_source}') LIMIT 1").df()
        except Exception as e:
            raise AISBackendError(f"Failed to access {data_source}: {e}") from e

        cols_map = {str(c).lower(): str(c) for c in cols_df["column_name"]}

        # 2. Determine lat/lon spatial expressions
        has_geometry = "geometry" in cols_map
        if has_geometry:
            lat_expr = f"ST_Y({cols_map['geometry']})"
            lon_expr = f"ST_X({cols_map['geometry']})"
        else:
            lat_c = cols_map.get("lat") or cols_map.get("latitude")
            lon_c = cols_map.get("lon") or cols_map.get("longitude")
            if not lat_c or not lon_c:
                raise AISBackendError(f"No lat/lon or geometry column found in {data_source}")
            lat_expr = f'TRY_CAST("{lat_c}" AS DOUBLE)'
            lon_expr = f'TRY_CAST("{lon_c}" AS DOUBLE)'

        # 3. Determine timestamp column
        time_candidates = ["base_date_time", "timestamp", "basedatetime", "time"]
        time_c = None
        for cand in time_candidates:
            if cand in cols_map:
                time_c = cols_map[cand]
                break
        if not time_c:
            raise AISBackendError(f"No timestamp/datetime column found in {data_source}")

        # 4. Build explicit SELECT projections
        select_exprs = []

        mmsi_c = cols_map.get("mmsi")
        select_exprs.append(f'TRY_CAST("{mmsi_c}" AS BIGINT) AS mmsi' if mmsi_c else "0::BIGINT AS mmsi")

        select_exprs.append(f'TRY_CAST("{time_c}" AS TIMESTAMPTZ) AS timestamp')
        select_exprs.append(f"{lat_expr} AS lat")
        select_exprs.append(f"{lon_expr} AS lon")

        sog_c = cols_map.get("sog") or cols_map.get("sog_knots") or cols_map.get("speed")
        select_exprs.append(f'TRY_CAST("{sog_c}" AS DOUBLE) AS sog_knots' if sog_c else "0.0::DOUBLE AS sog_knots")

        cog_c = cols_map.get("cog") or cols_map.get("cog_degrees") or cols_map.get("course")
        select_exprs.append(f'TRY_CAST("{cog_c}" AS DOUBLE) AS cog_degrees' if cog_c else "0.0::DOUBLE AS cog_degrees")

        hdg_c = cols_map.get("heading") or cols_map.get("heading_degrees")
        select_exprs.append(f'TRY_CAST("{hdg_c}" AS DOUBLE) AS heading_degrees' if hdg_c else "NULL::DOUBLE AS heading_degrees")

        name_c = cols_map.get("vessel_name") or cols_map.get("vesselname") or cols_map.get("name")
        select_exprs.append(f'CAST("{name_c}" AS VARCHAR) AS vessel_name' if name_c else "'UNKNOWN'::VARCHAR AS vessel_name")

        imo_c = cols_map.get("imo") or cols_map.get("imo_number")
        select_exprs.append(f'CAST("{imo_c}" AS VARCHAR) AS imo' if imo_c else "NULL::VARCHAR AS imo")

        type_c = cols_map.get("vessel_type") or cols_map.get("vessel_type_code") or cols_map.get("vesseltype")
        select_exprs.append(f'TRY_CAST("{type_c}" AS INTEGER) AS vessel_type_code' if type_c else "NULL::INTEGER AS vessel_type_code")

        status_c = cols_map.get("status") or cols_map.get("nav_status") or cols_map.get("navstatus")
        select_exprs.append(f'CAST("{status_c}" AS VARCHAR) AS nav_status' if status_c else "'undefined'::VARCHAR AS nav_status")

        len_c = cols_map.get("length") or cols_map.get("length_m")
        select_exprs.append(f'TRY_CAST("{len_c}" AS DOUBLE) AS length_m' if len_c else "NULL::DOUBLE AS length_m")

        wid_c = cols_map.get("width") or cols_map.get("width_m")
        select_exprs.append(f'TRY_CAST("{wid_c}" AS DOUBLE) AS width_m' if wid_c else "NULL::DOUBLE AS width_m")

        draft_c = cols_map.get("draft") or cols_map.get("draft_m")
        select_exprs.append(f'TRY_CAST("{draft_c}" AS DOUBLE) AS draft_m' if draft_c else "NULL::DOUBLE AS draft_m")

        sql = f"""
            SELECT {', '.join(select_exprs)}
            FROM read_parquet('{data_source}')
            WHERE TRY_CAST("{time_c}" AS TIMESTAMPTZ) BETWEEN TIMESTAMPTZ '{start_iso}' AND TIMESTAMPTZ '{end_iso}'
              AND {lat_expr} BETWEEN {lat_min} AND {lat_max}
              AND {lon_expr} BETWEEN {lon_min} AND {lon_max}
        """
        df = con.execute(sql).df()
        return df

    def query(
        self,
        lat: float,
        lon: float,
        radius_km: float,
        start_time: datetime,
        end_time: datetime,
    ) -> pd.DataFrame:
        """
        Queries AIS data for the given bounding circle and time range.
        """
        if self.us_waters_only and not self._is_in_us_waters(lat, lon):
            raise UnsupportedRegionError(
                f"Coordinates ({lat}, {lon}) fall outside US waters coverage of MarineCadastre. "
                "Configure an alternative global AIS backend or disable us_waters_only."
            )

        # Compute bounding box
        delta_lat = radius_km / 111.0
        cos_lat = max(0.01, math.cos(math.radians(lat)))
        delta_lon = radius_km / (111.0 * cos_lat)

        lat_min = lat - delta_lat
        lat_max = lat + delta_lat
        lon_min = lon - delta_lon
        lon_max = lon + delta_lon

        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)

        start_iso = start_time.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
        end_iso = end_time.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")

        data_sources = self._resolve_data_urls(start_time, end_time)
        con = self._get_connection()

        dfs = []
        errors = []
        for src in data_sources:
            try:
                src_df = self._query_single_source(
                    con=con,
                    data_source=src,
                    lat_min=lat_min,
                    lat_max=lat_max,
                    lon_min=lon_min,
                    lon_max=lon_max,
                    start_iso=start_iso,
                    end_iso=end_iso,
                )
                if not src_df.empty:
                    dfs.append(src_df)
            except Exception as e:
                errors.append(f"{src}: {e}")

        if not dfs:
            if errors and not self.geoparquet_base_url and start_time.year < 2024:
                raise AISBackendError(
                    f"NOAA MarineCadastre online GeoParquet daily broadcast feeds are hosted for 2024+. "
                    f"For historical incident dates (e.g. {start_time.year}), configure local AIS parquet files via config. "
                    f"Details: {'; '.join(errors)}"
                )
            elif errors and len(errors) == len(data_sources):
                raise AISBackendError(f"Failed to query AIS data sources: {'; '.join(errors)}")
            raw_df = pd.DataFrame()
        else:
            raw_df = pd.concat(dfs, ignore_index=True)

        normalized_df = self._normalize_schema(raw_df)

        if not normalized_df.empty:
            start_ts = pd.Timestamp(start_time).tz_convert("UTC").tz_localize(None)
            end_ts = pd.Timestamp(end_time).tz_convert("UTC").tz_localize(None)
            raw_ts = normalized_df["timestamp"].dt.tz_localize(None)
            mask = (
                (normalized_df["lat"] >= lat_min)
                & (normalized_df["lat"] <= lat_max)
                & (normalized_df["lon"] >= lon_min)
                & (normalized_df["lon"] <= lon_max)
                & (raw_ts >= start_ts)
                & (raw_ts <= end_ts)
            )
            normalized_df = normalized_df[mask].reset_index(drop=True)

        return normalized_df

    def _normalize_schema(self, df: pd.DataFrame) -> pd.DataFrame:
        """Ensures the returned DataFrame strictly conforms to raw_ais_points schema (§4.1)."""
        required_cols = [
            ("mmsi", "int64", 0),
            ("timestamp", "datetime64[ns, UTC]", pd.NaT),
            ("lat", "float64", np.nan),
            ("lon", "float64", np.nan),
            ("sog_knots", "float64", 0.0),
            ("cog_degrees", "float64", 0.0),
            ("heading_degrees", "float64", np.nan),
            ("vessel_name", "string", "UNKNOWN"),
            ("imo", "Int64", pd.NA),
            ("vessel_type_code", "Int32", pd.NA),
            ("nav_status", "string", "undefined"),
            ("length_m", "float64", np.nan),
            ("width_m", "float64", np.nan),
            ("draft_m", "float64", np.nan),
        ]

        if df.empty:
            return pd.DataFrame({
                c[0]: pd.Series(dtype=c[1]) for c in required_cols
            })

        for col, dtype, default_val in required_cols:
            if col not in df.columns:
                df[col] = default_val

        res = pd.DataFrame()
        res["mmsi"] = pd.to_numeric(df["mmsi"], errors="coerce").fillna(0).astype("int64")
        res["timestamp"] = pd.to_datetime(df["timestamp"], utc=True).astype("datetime64[ns, UTC]")
        res["lat"] = pd.to_numeric(df["lat"], errors="coerce").astype("float64")
        res["lon"] = pd.to_numeric(df["lon"], errors="coerce").astype("float64")
        res["sog_knots"] = pd.to_numeric(df["sog_knots"], errors="coerce").fillna(0.0).astype("float64")
        res["cog_degrees"] = pd.to_numeric(df["cog_degrees"], errors="coerce").fillna(0.0).astype("float64")
        res["heading_degrees"] = pd.to_numeric(df["heading_degrees"], errors="coerce").astype("float64")

        # Clean vessel name
        v_name = df["vessel_name"].fillna("UNKNOWN").astype(str).str.strip()
        v_name = v_name.replace({"": "UNKNOWN", "nan": "UNKNOWN", "None": "UNKNOWN", "<NA>": "UNKNOWN"})
        res["vessel_name"] = v_name.astype("string")

        # Clean IMO (extract digits if prefixed with IMO, e.g. IMO8834407)
        imo_str = df["imo"].astype(str).str.extract(r"(\d+)", expand=False)
        res["imo"] = pd.to_numeric(imo_str, errors="coerce").astype("Int64")

        res["vessel_type_code"] = pd.to_numeric(df["vessel_type_code"], errors="coerce").astype("Int32")
        res["nav_status"] = df["nav_status"].fillna("undefined").astype(str).astype("string")
        res["length_m"] = pd.to_numeric(df["length_m"], errors="coerce").astype("float64")
        res["width_m"] = pd.to_numeric(df["width_m"], errors="coerce").astype("float64")
        res["draft_m"] = pd.to_numeric(df["draft_m"], errors="coerce").astype("float64")

        canonical_cols = [c[0] for c in required_cols]
        return res[canonical_cols]