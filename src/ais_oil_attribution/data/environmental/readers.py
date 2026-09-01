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
        if not (source.startswith("http://") or source.startswith("https://") or source.startswith("dods://")):
            p = Path(source)
            if not p.exists():
                raise MissingForcingDataError(f"Local NetCDF forcing file not found: {source}")

        return source

    def load_reader(self, custom_path_or_url: Optional[str] = None) -> Any:
        """
        Instantiates an OpenDrift NetCDF CF reader if opendrift is available.
        """
        source = self.resolve_source(custom_path_or_url)
        try:
            from opendrift.readers import reader_netCDF_CF_generic
            return reader_netCDF_CF_generic.Reader(source)
        except ImportError:
            # Fallback stub for environments without full OpenDrift reader dependencies
            return {"source": source, "type": "netCDF_CF_generic"}