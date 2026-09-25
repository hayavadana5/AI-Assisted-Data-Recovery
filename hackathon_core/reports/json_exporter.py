"""json_exporter.py — Case Export & Machine-Readable Artifact Generator."""

import json
import logging
import pathlib
from typing import Dict, Any

logger = logging.getLogger(__name__)


def export_case_json(case_data: Dict[str, Any], output_path: pathlib.Path) -> pathlib.Path:
    """Export complete forensic case details to formatted JSON file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(case_data, f, indent=2, default=str)
    logger.info(f"Exported case JSON to {output_path}")
    return output_path
