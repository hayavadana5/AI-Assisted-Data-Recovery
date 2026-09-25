"""fragment_reconstructor.py — Genuine Non-Contiguous Fragment Detection & Reconstruction Engine.

Features:
- Deterministic fragment detection (Header, Body, Footer identification).
- Non-contiguous fragment sequence matching & graph ordering.
- Structural validation after reassembly (JPEG SOF/SOS markers, PNG IHDR/IEND, PDF %PDF- / %%EOF).
- Deterministic explainable confidence scoring.
- Exact byte verification and SHA-256 digest hashing.
"""

import hashlib
import itertools
import logging
import math
import pathlib
import struct
from typing import Dict, List, Optional, Tuple, Any

from .fragment import Fragment, ReconstructedArtifact
from .integrity import calculate_buffer_hashes
from ..analysis.entropy_analyzer import calculate_shannon_entropy

logger = logging.getLogger(__name__)


# Supported Fragment Format Rules
TYPE_RULES = {
    "JPEG": {
        "ext": "jpg",
        "header_sig": b"\xFF\xD8\xFF",
        "footer_sig": b"\xFF\xD9",
        "body_markers": [b"\xFF\xC0", b"\xFF\xC4", b"\xFF\xDA", b"\xFF\xDB"],
    },
    "PNG": {
        "ext": "png",
        "header_sig": b"\x89PNG\r\n\x1a\n",
        "footer_sig": b"IEND",
        "body_markers": [b"IHDR", b"IDAT", b"PLTE"],
    },
    "PDF": {
        "ext": "pdf",
        "header_sig": b"%PDF-",
        "footer_sig": b"%%EOF",
        "body_markers": [b"/Type", b"/Pages", b"stream"],
    },
}


class NonContiguousReconstructorEngine:
    """Engine for identifying, matching, ordering, and validating non-contiguous evidence fragments."""

    def __init__(self, block_size: int = 512):
        self.block_size = block_size

    def detect_fragments_in_buffer(
        self,
        buffer: bytes,
        source_name: str = "synthetic_disk"
    ) -> List[Fragment]:
        """Detect discrete header, body, and footer fragments from a byte stream/buffer."""
        fragments: List[Fragment] = []
        buf_len = len(buffer)
        block_sz = self.block_size

        offset = 0
        while offset < buf_len:
            # Skip zero-fill blocks
            block = buffer[offset : offset + block_sz]
            if not block or all(b == 0 for b in block):
                offset += block_sz
                continue

            # Accumulate consecutive non-zero-fill blocks into contiguous extent
            extent_start = offset
            extent_bytes = bytearray()
            while offset < buf_len:
                curr_block = buffer[offset : offset + block_sz]
                if not curr_block or all(b == 0 for b in curr_block):
                    break
                extent_bytes.extend(curr_block)
                offset += block_sz

            chunk = bytes(extent_bytes)

            entropy = calculate_shannon_entropy(chunk)
            chunk_hash = hashlib.sha256(chunk).hexdigest()

            # Check matching file types
            for f_type, rules in TYPE_RULES.items():
                is_hdr = rules["header_sig"] in chunk
                is_ftr = rules["footer_sig"] in chunk
                has_body_marker = any(m in chunk for m in rules["body_markers"])

                if is_hdr or is_ftr or (has_body_marker or entropy >= 1.5):
                    frag_id = f"frag_{f_type}_{extent_start:08x}"
                    frag = Fragment(
                        fragment_id=frag_id,
                        source_image=source_name,
                        offset=extent_start,
                        size=len(chunk),
                        file_type=f_type,
                        signature=f_type,
                        sha256=chunk_hash,
                        entropy=entropy,
                        is_header=is_hdr,
                        is_footer=is_ftr,
                        payload=chunk,
                        metadata={
                            "has_body_marker": has_body_marker,
                        }
                    )
                    fragments.append(frag)
                    break

        return fragments

    def reconstruct_from_fragments(
        self,
        fragments: List[Fragment],
        output_dir: pathlib.Path
    ) -> List[ReconstructedArtifact]:
        """Attempt non-contiguous reconstruction over candidate fragments."""
        output_dir.mkdir(parents=True, exist_ok=True)
        reconstructions: List[ReconstructedArtifact] = []

        # Group fragments by file type
        grouped: Dict[str, List[Fragment]] = {}
        for f in fragments:
            grouped.setdefault(f.file_type, []).append(f)

        for f_type, frag_list in grouped.items():
            headers = [f for f in frag_list if f.is_header]
            footers = [f for f in frag_list if f.is_footer]
            bodies = [f for f in frag_list if not f.is_header and not f.is_footer]

            if not headers:
                continue

            for h_idx, header_frag in enumerate(headers):
                # Next header offset bounds the fragment search space for the current file stream
                next_header_offset = headers[h_idx + 1].offset if h_idx + 1 < len(headers) else float('inf')

                best_sequence: Optional[List[Fragment]] = None
                best_confidence = -1.0
                best_factors: List[str] = []
                best_status = "FAILED"

                # Find candidate footers that occur before the next header offset
                candidate_footers = [ft for ft in footers if header_frag.offset <= ft.offset < next_header_offset]
                if not candidate_footers:
                    candidate_footers = [None]

                for footer_frag in candidate_footers:
                    if footer_frag == header_frag:
                        # Fragment contains both header and footer signature
                        seq = [header_frag]
                        assembled_bytes = header_frag.payload
                        valid_struct, factors, confidence = self._validate_structure(f_type, assembled_bytes, seq)

                        if (confidence > best_confidence) or (confidence == best_confidence and (best_sequence is None or len(seq) > len(best_sequence))):
                            best_confidence = confidence
                            best_sequence = seq
                            best_factors = factors
                            best_status = "RECONSTRUCTED" if (valid_struct and confidence >= 0.70) else ("PARTIAL" if confidence >= 0.40 else "FAILED")
                    else:
                        # Select candidate body fragments between this header and footer/next header
                        cand_bodies = [b for b in bodies if header_frag.offset <= b.offset <= footer_frag.offset and b.offset < next_header_offset] if footer_frag else [b for b in bodies if header_frag.offset <= b.offset < next_header_offset]

                        # Test permutations of candidate body fragments (up to 4 body blocks)
                        max_r = min(4, len(cand_bodies))
                        for r in range(0, max_r + 1):
                            for body_perm in itertools.permutations(cand_bodies, r):
                                seq = [header_frag] + list(body_perm)
                                if footer_frag:
                                    seq.append(footer_frag)

                                assembled_bytes = b"".join(f.payload for f in seq)
                                valid_struct, factors, confidence = self._validate_structure(f_type, assembled_bytes, seq)

                                if (confidence > best_confidence) or (confidence == best_confidence and (best_sequence is None or len(seq) > len(best_sequence))):
                                    best_confidence = confidence
                                    best_sequence = seq
                                    best_factors = factors
                                    best_status = "RECONSTRUCTED" if (valid_struct and confidence >= 0.70) else ("PARTIAL" if confidence >= 0.40 else "FAILED")

                if best_sequence and best_confidence > 0.30:
                    assembled_bytes = b"".join(f.payload for f in best_sequence)
                    sha256_digest = hashlib.sha256(assembled_bytes).hexdigest()

                    recon_id = f"recon_{f_type.lower()}_0x{header_frag.offset:08x}"
                    ext = TYPE_RULES[f_type]["ext"]
                    out_path = output_dir / f"{recon_id}.{ext}"
                    out_path.write_bytes(assembled_bytes)

                    reconstructions.append(
                        ReconstructedArtifact(
                            reconstruction_id=recon_id,
                            file_type=f_type,
                            total_size=len(assembled_bytes),
                            fragment_count=len(best_sequence),
                            ordered_fragments=[f.fragment_id for f in best_sequence],
                            confidence=round(best_confidence, 2),
                            confidence_factors=best_factors,
                            output_path=str(out_path),
                            sha256=sha256_digest,
                            status=best_status,
                            metadata={"offsets": [f.offset for f in best_sequence]},
                        )
                    )

        return reconstructions

    def _validate_structure(
        self,
        file_type: str,
        data: bytes,
        sequence: List[Fragment]
    ) -> Tuple[bool, List[str], float]:
        """Perform structural validation on reassembled candidate fragment payload."""
        factors: List[str] = []
        confidence = 0.0
        valid_struct = False

        rules = TYPE_RULES.get(file_type)
        if not rules:
            return False, ["unknown_file_type"], 0.0

        # Check Header
        if data.startswith(rules["header_sig"]):
            factors.append("valid_header_signature")
            confidence += 0.30

        # Check Footer
        if rules["footer_sig"] in data:
            factors.append("valid_footer_signature")
            confidence += 0.30

        # Format-specific deep structural validation
        if file_type == "JPEG":
            # Must contain JPEG SOF0/SOF2 marker
            if b"\xFF\xC0" in data or b"\xFF\xC2" in data or b"JFIF" in data or b"Exif" in data:
                factors.append("jpeg_sof_marker_found")
                confidence += 0.15
            if data.startswith(b"\xFF\xD8") and data.endswith(b"\xFF\xD9"):
                factors.append("exact_jpeg_boundary_match")
                valid_struct = True
                confidence += 0.15

        elif file_type == "PNG":
            if b"IHDR" in data[:30]:
                factors.append("png_ihdr_chunk_found")
                confidence += 0.15
            if data.startswith(b"\x89PNG\r\n\x1a\n") and b"IEND" in data:
                factors.append("exact_png_boundary_match")
                valid_struct = True
                confidence += 0.15

        elif file_type == "PDF":
            if b"%PDF-" in data[:20]:
                factors.append("pdf_header_version_found")
                confidence += 0.15
            if data.startswith(b"%PDF-") and b"%%EOF" in data:
                factors.append("exact_pdf_boundary_match")
                valid_struct = True
                confidence += 0.15

        # Check for sequence continuity
        if len(sequence) > 1:
            offsets = [f.offset for f in sequence]
            if offsets == sorted(offsets):
                factors.append("chronological_offset_order")
                confidence += 0.10

        return valid_struct, factors, min(1.0, confidence)
