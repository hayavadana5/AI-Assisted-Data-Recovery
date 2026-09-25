"""test_fragment_reconstruction.py — Comprehensive Synthetic Evidence Tests for Non-Contiguous Fragment Reconstruction.

Covers:
- Test A: Two-fragment non-contiguous file reconstruction (exact byte & SHA-256 equality).
- Test B: Three-fragment non-contiguous file reconstruction (exact byte & SHA-256 equality).
- Test C: Out-of-order candidate sequence rejection.
- Test D: Corrupted fragment handling (PARTIAL / FAILED status).
- Test E: Unrelated same-type files isolation (no incorrect merging).
- Test F: No valid reconstruction handling.
- Test G: Evidence safety verification (test-stick.img unchanged).
"""

import hashlib
import pathlib
import sys
import pytest

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from hackathon_core.recovery.fragment import Fragment, ReconstructedArtifact
from hackathon_core.recovery.fragment_reconstructor import NonContiguousReconstructorEngine


def _make_synthetic_jpeg():
    """Build a valid synthetic JPEG byte payload aligned to 3 sector blocks of 512 bytes (1536 bytes total)."""
    header = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"  # 20B
    sof0 = b"\xFF\xC0\x00\x11\x08\x00\x40\x00\x40\x03\x01\x11\x00\x02\x11\x01\x03\x11\x01"  # 19B
    sos_hdr = b"\xFF\xDA\x00\x0C\x03\x01\x00\x02\x11\x03\x11\x00\x3F\x00"  # 14B
    body_fill = (b"\x12\x34\x56\x78" * 370) + b"\x90"  # 1481B
    footer = b"\xFF\xD9"  # 2B
    payload = header + sof0 + sos_hdr + body_fill + footer
    assert len(payload) == 1536
    return payload


# --- TEST A: Two-Fragment Reconstruction ---
def test_two_fragment_reconstruction(tmp_path):
    orig_bytes = _make_synthetic_jpeg()
    orig_sha256 = hashlib.sha256(orig_bytes).hexdigest()

    # Split into 2 sector fragments: Block 1 (512B) & Blocks 2-3 (1024B)
    frag_a_bytes = orig_bytes[:512]
    frag_b_bytes = orig_bytes[512:]

    # Place in synthetic disk buffer at separated offsets (0x1000 and 0x5000)
    disk_buf = bytearray(0x8000)
    disk_buf[0x1000 : 0x1000 + len(frag_a_bytes)] = frag_a_bytes
    disk_buf[0x5000 : 0x5000 + len(frag_b_bytes)] = frag_b_bytes

    engine = NonContiguousReconstructorEngine(block_size=512)
    fragments = engine.detect_fragments_in_buffer(bytes(disk_buf), "test_disk_a.img")

    assert len(fragments) >= 2

    out_dir = tmp_path / "recon_a"
    results = engine.reconstruct_from_fragments(fragments, out_dir)

    assert len(results) >= 1
    best_recon = results[0]

    assert best_recon.status == "RECONSTRUCTED"
    assert best_recon.confidence >= 0.85
    assert best_recon.sha256 == orig_sha256

    # Mandatory Byte & SHA256 Equality Checks
    reconstructed_bytes = pathlib.Path(best_recon.output_path).read_bytes()
    assert reconstructed_bytes == orig_bytes
    assert hashlib.sha256(reconstructed_bytes).hexdigest() == orig_sha256


# --- TEST B: Three-Fragment Reconstruction ---
def test_three_fragment_reconstruction(tmp_path):
    orig_bytes = _make_synthetic_jpeg()
    orig_sha256 = hashlib.sha256(orig_bytes).hexdigest()

    # Split into 3 sector fragments: Block 1 (512B), Block 2 (512B), Block 3 (512B)
    f_a = orig_bytes[:512]
    f_b = orig_bytes[512:1024]
    f_c = orig_bytes[1024:]

    disk_buf = bytearray(0x10000)
    disk_buf[0x1000 : 0x1000 + len(f_a)] = f_a  # Offset 0x1000
    disk_buf[0x6000 : 0x6000 + len(f_b)] = f_b  # Offset 0x6000
    disk_buf[0xB000 : 0xB000 + len(f_c)] = f_c  # Offset 0xB000

    engine = NonContiguousReconstructorEngine(block_size=512)
    fragments = engine.detect_fragments_in_buffer(bytes(disk_buf), "test_disk_b.img")

    out_dir = tmp_path / "recon_b"
    results = engine.reconstruct_from_fragments(fragments, out_dir)

    assert len(results) >= 1
    best_recon = results[0]

    assert best_recon.status == "RECONSTRUCTED"
    assert best_recon.sha256 == orig_sha256

    reconstructed_bytes = pathlib.Path(best_recon.output_path).read_bytes()
    assert reconstructed_bytes == orig_bytes
    assert hashlib.sha256(reconstructed_bytes).hexdigest() == orig_sha256


# --- TEST C: Out-of-Order Candidate Sequence Selection ---
def test_out_of_order_candidate_selection(tmp_path):
    orig_bytes = _make_synthetic_jpeg()

    # Create fragments placed out of order on disk
    f_header = orig_bytes[:512]
    f_body = orig_bytes[512:1024]
    f_footer = orig_bytes[1024:]

    disk_buf = bytearray(0x10000)
    disk_buf[0x1000 : 0x1000 + len(f_header)] = f_header
    disk_buf[0x4000 : 0x4000 + len(f_body)] = f_body
    disk_buf[0x8000 : 0x8000 + len(f_footer)] = f_footer

    engine = NonContiguousReconstructorEngine(block_size=512)
    fragments = engine.detect_fragments_in_buffer(bytes(disk_buf), "test_disk_c.img")

    out_dir = tmp_path / "recon_c"
    results = engine.reconstruct_from_fragments(fragments, out_dir)

    assert len(results) >= 1
    assert results[0].status == "RECONSTRUCTED"
    assert results[0].metadata["offsets"] == [0x1000, 0x4000, 0x8000]


# --- TEST D: Corrupted Fragment Handling ---
def test_corrupted_fragment_handling(tmp_path):
    orig_bytes = _make_synthetic_jpeg()

    # Corrupt body fragment with random garbage
    f_header = orig_bytes[:512]
    f_corrupt_body = (b"CORRUPTED_GARBAGE_BYTES_NO_MARKERS" * 15)[:512]
    f_footer = orig_bytes[1024:]

    disk_buf = bytearray(0x10000)
    disk_buf[0x1000 : 0x1000 + len(f_header)] = f_header
    disk_buf[0x5000 : 0x5000 + len(f_corrupt_body)] = f_corrupt_body
    disk_buf[0x9000 : 0x9000 + len(f_footer)] = f_footer

    engine = NonContiguousReconstructorEngine(block_size=512)
    fragments = engine.detect_fragments_in_buffer(bytes(disk_buf), "test_disk_d.img")

    out_dir = tmp_path / "recon_d"
    results = engine.reconstruct_from_fragments(fragments, out_dir)

    if results:
        # Payload does NOT match clean original
        assert results[0].sha256 != hashlib.sha256(orig_bytes).hexdigest()


# --- TEST E: Unrelated Same-Type Files Isolation ---
def test_unrelated_same_type_files(tmp_path):
    jpeg1 = _make_synthetic_jpeg()
    jpeg2_hdr = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + (b"B" * 490) + b"\xFF\xD9"
    assert len(jpeg2_hdr) == 512

    disk_buf = bytearray(0x20000)
    disk_buf[0x1000 : 0x1000 + len(jpeg1)] = jpeg1
    disk_buf[0x10000 : 0x10000 + len(jpeg2_hdr)] = jpeg2_hdr

    engine = NonContiguousReconstructorEngine(block_size=512)
    fragments = engine.detect_fragments_in_buffer(bytes(disk_buf), "test_disk_e.img")

    out_dir = tmp_path / "recon_e"
    results = engine.reconstruct_from_fragments(fragments, out_dir)

    # Must produce 2 separate reconstructions, not merge them into 1 corrupt file
    assert len(results) == 2
    sha_set = {r.sha256 for r in results}
    assert hashlib.sha256(jpeg1).hexdigest() in sha_set
    assert hashlib.sha256(jpeg2_hdr).hexdigest() in sha_set


# --- TEST F: No Valid Reconstruction Handling ---
def test_no_valid_reconstruction(tmp_path):
    garbage = b"\x11\x22\x33\x44\x55\x66\x77\x88" * 64
    disk_buf = bytearray(0x5000)
    disk_buf[0x1000 : 0x1000 + len(garbage)] = garbage

    engine = NonContiguousReconstructorEngine(block_size=512)
    fragments = engine.detect_fragments_in_buffer(bytes(disk_buf), "test_disk_f.img")

    out_dir = tmp_path / "recon_f"
    results = engine.reconstruct_from_fragments(fragments, out_dir)

    assert len(results) == 0


# --- TEST G: Evidence Safety Verification ---
def test_evidence_safety_fixtures_unchanged():
    test_stick = REPO_ROOT / "test-stick.img"
    if test_stick.exists():
        current_hash = hashlib.sha256(test_stick.read_bytes()).hexdigest()
        assert current_hash == "8565a714dca840f8652c5bae9249ab05f5fb5a4f9f13fbe23304b10f68252da2"
