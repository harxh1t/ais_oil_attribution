"""Entrypoint to launch the WAKE Local Engine FastAPI/Uvicorn server on port 1644."""

import sys
from pathlib import Path

# Ensure src/ is on Python path
src_dir = Path(__file__).parent / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

from ais_oil_attribution.server import start_server, app

if __name__ == "__main__":
    start_server(host="0.0.0.0", port=1644)
