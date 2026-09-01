"""Configuration loader for ais_oil_attribution."""

import os
from pathlib import Path
from typing import Any, Dict
import yaml

DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent.parent.parent.parent / "config" / "default_config.yaml"


def load_config(custom_path: str | Path | None = None) -> Dict[str, Any]:
    """
    Load configuration from YAML file.
    Merges custom config over default config if specified.
    """
    default_file = DEFAULT_CONFIG_PATH
    if not default_file.exists():
        # Fallback search in working directory
        cwd_candidate = Path.cwd() / "config" / "default_config.yaml"
        if cwd_candidate.exists():
            default_file = cwd_candidate

    config: Dict[str, Any] = {}
    if default_file.exists():
        with open(default_file, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

    if custom_path:
        custom_file = Path(custom_path)
        if not custom_file.exists():
            raise FileNotFoundError(f"Configuration file not found: {custom_path}")
        with open(custom_file, "r", encoding="utf-8") as f:
            custom_cfg = yaml.safe_load(f) or {}
            _deep_merge(config, custom_cfg)

    return config


def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> None:
    """Recursively merge override dictionary into base dictionary."""
    for key, value in override.items():
        if isinstance(value, dict) and key in base and isinstance(base[key], dict):
            _deep_merge(base[key], value)
        else:
            base[key] = value
