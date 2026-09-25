"""fragment.py — Data structures for non-contiguous evidence fragments & reconstructed artifacts.
"""

import dataclasses
import hashlib
from typing import Dict, List, Optional, Any


@dataclasses.dataclass
class Fragment:
    fragment_id: str
    source_image: str
    offset: int
    size: int
    file_type: str
    signature: str
    sha256: str
    entropy: float
    sequence: int = -1
    confidence: float = 0.0
    reconstruction_status: str = "UNASSIGNED"
    is_header: bool = False
    is_footer: bool = False
    payload: bytes = b""
    metadata: Dict[str, Any] = dataclasses.field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "fragment_id": self.fragment_id,
            "source_image": self.source_image,
            "offset": self.offset,
            "size": self.size,
            "file_type": self.file_type,
            "signature": self.signature,
            "sha256": self.sha256,
            "entropy": self.entropy,
            "sequence": self.sequence,
            "confidence": self.confidence,
            "reconstruction_status": self.reconstruction_status,
            "is_header": self.is_header,
            "is_footer": self.is_footer,
            "metadata": self.metadata,
        }


@dataclasses.dataclass
class ReconstructedArtifact:
    reconstruction_id: str
    file_type: str
    total_size: int
    fragment_count: int
    ordered_fragments: List[str]
    confidence: float
    confidence_factors: List[str]
    output_path: str
    sha256: str
    status: str  # "RECONSTRUCTED", "PARTIAL", "FAILED", "LOW_CONFIDENCE"
    metadata: Dict[str, Any] = dataclasses.field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "reconstruction_id": self.reconstruction_id,
            "file_type": self.file_type,
            "total_size": self.total_size,
            "fragment_count": self.fragment_count,
            "ordered_fragments": self.ordered_fragments,
            "confidence": self.confidence,
            "confidence_factors": self.confidence_factors,
            "output_path": self.output_path,
            "sha256": self.sha256,
            "status": self.status,
            "metadata": self.metadata,
        }
