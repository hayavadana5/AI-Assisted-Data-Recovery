"""entropy_analyzer.py — Drive Sector Entropy & Structure Analyzer.

Computes block-by-block Shannon entropy to identify encrypted volumes,
compressed fragments, raw filesystem metadata, plaintext credentials,
and zero-fill regions across disk images.
"""

import math
import pathlib
import struct
from typing import Dict, List, Any


def calculate_shannon_entropy(data: bytes) -> float:
    """Calculate Shannon entropy for a byte block (0.0 = uniform/empty, 8.0 = max entropy/encrypted)."""
    if not data:
        return 0.0

    length = len(data)
    byte_counts = [0] * 256
    for b in data:
        byte_counts[b] += 1

    entropy = 0.0
    for count in byte_counts:
        if count == 0:
            continue
        p = count / length
        entropy -= p * math.log2(p)

    return round(entropy, 4)


def classify_entropy_level(entropy: float) -> str:
    """Classify entropy value into human & forensic readable types."""
    if entropy == 0.0:
        return "ZERO_FILL"
    elif entropy < 3.5:
        return "PLAINTEXT_DATA"
    elif entropy < 6.8:
        return "EXECUTABLE_STRUCT"
    elif entropy < 7.5:
        return "COMPRESSED_DATA"
    else:
        return "HIGH_ENTROPY_ENCRYPTED"


class SectorEntropyAnalyzer:
    """Performs full image sector entropy mapping for UI visualizers."""

    def __init__(self, block_size: int = 4096):
        self.block_size = block_size

    def analyze_image(
        self,
        image_path: pathlib.Path,
        resolution_points: int = 1000
    ) -> Dict[str, Any]:
        """Compute sector entropy heat map suitable for canvas/3D rendering."""
        if not image_path.exists():
            return {"error": "Image file not found"}

        file_size = image_path.stat().st_size
        if file_size == 0:
            return {"error": "Empty image file"}

        total_blocks = math.ceil(file_size / self.block_size)
        step = max(1, total_blocks // resolution_points)

        heatmap: List[Dict[str, Any]] = []
        histogram = {
            "ZERO_FILL": 0,
            "PLAINTEXT_DATA": 0,
            "EXECUTABLE_STRUCT": 0,
            "COMPRESSED_DATA": 0,
            "HIGH_ENTROPY_ENCRYPTED": 0,
        }

        with image_path.open("rb") as f:
            block_idx = 0
            while block_idx < total_blocks:
                offset = block_idx * self.block_size
                f.seek(offset)
                block_bytes = f.read(self.block_size)
                if not block_bytes:
                    break

                entropy = calculate_shannon_entropy(block_bytes)
                classification = classify_entropy_level(entropy)
                histogram[classification] += 1

                heatmap.append({
                    "block_index": block_idx,
                    "offset": offset,
                    "entropy": entropy,
                    "classification": classification,
                })

                block_idx += step

        overall_entropy = sum(b["entropy"] for b in heatmap) / max(1, len(heatmap))

        return {
            "file_size": file_size,
            "total_blocks": total_blocks,
            "sampled_blocks": len(heatmap),
            "average_entropy": round(overall_entropy, 4),
            "histogram": histogram,
            "heatmap": heatmap,
        }
