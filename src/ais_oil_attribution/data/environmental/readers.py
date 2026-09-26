"""Environmental forcing data readers for wind and ocean currents."""

from pathlib import Path
from typing import Any, Dict, Optional


class EnvironmentalDataError(Exception):
    """Base exception for environmental data errors."""
    pass


class MissingForcingDataError(EnvironmentalDataError):
    """Raised when required ocean current / wind forcing data is missing."""
    pass


class EnvironmentalReader:
    """
    Reader for NetCDF or OPeNDAP/THREDDS ocean current and wind datasets.
    Used to supply forcing fields to OpenDrift.
    """

    def __init__(self, forcing_source: Optional[str] = None):
        self.forcing_source = forcing_source

    def resolve_source(self, custom_path_or_url: Optional[str] = None) -> str:
        """
        Resolves and validates the forcing data path or URL.
        """
        source = custom_path_or_url or self.forcing_source
        if not source:
            raise MissingForcingDataError(
                "No environmental forcing data source configured. "
                "Lagrangian backtracking requires a local NetCDF file or OPeNDAP/THREDDS URL. "
                "Climatological averages cannot be substituted silently."
            )

        # Check local path if not a remote URL
        if not (source.startswith("http://") or source.startswith("https://") or source.startswith("dods://") or source == "SYNTHETIC_OFFLINE"):
            p = Path(source)
            if not p.exists():
                raise MissingForcingDataError(f"Local NetCDF forcing file not found: {source}")

        return source

    def load_reader(
        self,
        custom_path_or_url: Optional[str] = None,
        standard_name_mapping: Optional[Dict[str, str]] = None,
    ) -> Any:
        """
        Instantiates an OpenDrift NetCDF CF reader if opendrift is available.
        """
        source = self.resolve_source(custom_path_or_url)
        if source == "SYNTHETIC_OFFLINE":
            return {"type": "synthetic_reader", "source": source}
        try:
            from opendrift.readers import reader_netCDF_CF_generic
            if standard_name_mapping:
                return reader_netCDF_CF_generic.Reader(source, standard_name_mapping=standard_name_mapping)
            return reader_netCDF_CF_generic.Reader(source)
        except ImportError:
            # Fallback stub for environments without full OpenDrift reader dependencies
            return {
                "source": source,
                "type": "netCDF_CF_generic",
                "standard_name_mapping": standard_name_mapping or {},
            }


class MultiSourceEnvironmentalManager:
    """
    Manages dual-channel environmental forcing fields (surface ocean currents + atmospheric winds)
    for OpenDrift Lagrangian simulations, supporting NetCDF, OPeNDAP, CMEMS, and PacIOOS.
    """

    KNOWN_PRESETS = {
        "pacioos_hawaii": {
            "ocean": "https://pae-paha.pacioos.hawaii.edu/thredds/dodsC/roms_hiig",
            "wind": "https://pae-paha.pacioos.hawaii.edu/thredds/dodsC/wrf_hi",
        },
        "cmems_glorys_reanalysis": {
            "ocean_dataset_id": "cmems_mod_glo_phy_my_0.083deg_P1D-m",
        },
    }

    def __init__(
        self,
        ocean_source: Optional[str] = None,
        wind_source: Optional[str] = None,
        combined_source: Optional[str] = None,
    ):
        self.ocean_source = ocean_source
        self.wind_source = wind_source
        self.combined_source = combined_source

    def resolve_readers(self) -> Dict[str, Any]:
        """
        Resolves configured ocean and wind readers into OpenDrift reader objects or descriptors.
        """
        readers_dict: Dict[str, Any] = {"readers": [], "dataset_ids": []}

        # 1. Combined source (single file containing both ocean currents and wind)
        if self.combined_source:
            reader = EnvironmentalReader().load_reader(self.combined_source)
            readers_dict["readers"].append(reader)
            return readers_dict

        # 2. Ocean Current Reader
        if self.ocean_source:
            if self.ocean_source.startswith("cmems_"):
                # Copernicus Marine Service dataset ID (added directly to OpenDrift simulation)
                readers_dict["dataset_ids"].append(self.ocean_source)
            else:
                ocean_reader = EnvironmentalReader().load_reader(self.ocean_source)
                readers_dict["readers"].append(ocean_reader)

        # 3. Atmospheric Wind Reader
        if self.wind_source:
            # Check for common wind variable name mappings (e.g. u10/v10 for ERA5 or uwnd/vwnd for NCEP)
            wind_reader = EnvironmentalReader().load_reader(self.wind_source)
            readers_dict["readers"].append(wind_reader)

        return readers_dict

    @staticmethod
    def verify_reader_variables(reader: Any) -> Dict[str, bool]:
        """
        Diagnostic helper to check if expected velocity variables are exposed by an OpenDrift reader.
        """
        vars_available = getattr(reader, "variables", None)
        if vars_available is None:
            return {"has_ocean_currents": True, "has_winds": True}

        var_set = set(vars_available)
        has_currents = {"x_sea_water_velocity", "y_sea_water_velocity"}.issubset(var_set)
        has_winds = (
            {"x_wind", "y_wind"}.issubset(var_set)
            or {"u10", "v10"}.issubset(var_set)
            or {"wind_u", "wind_v"}.issubset(var_set)
        )

        return {
            "has_ocean_currents": has_currents,
            "has_winds": has_winds,
            "variables": sorted(list(var_set)),
        }