"""test_carver.py — Tests for the signature-based file carver.

Covers:
- Bug #2 regression: multiple instances of the same file type in one image
  must all be found (cursor desync fix verification).
- Zero-signal image: carving an all-zero image produces zero output files.
- Single-match extraction: a single embedded JPEG is extracted correctly.
- Multi-type extraction: different signature types are carved independently.
- Deduplication: identical embedded files are not double-extracted.
- Footer trimming: JPEG footer terminates extraction correctly.
"""
import hashlib
import pathlib
import sys

import pytest

# Ensure the enterprise package and test directory are importable
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from fbi_recovery.carver import carve_raw, _carve_single, CHUNK
from fbi_recovery.signatures import SIGS, Sig

from conftest import (
    JPEG_HEADER, JPEG_FOOTER,
    PNG_HEADER, PNG_FOOTER,
    PDF_HEADER, PDF_FOOTER,
    _make_jpeg, _make_png, _make_pdf,
)


class TestCarverAllZero:
    """Carving an all-zero image must produce zero output files."""

    def test_no_files_carved_from_zeros(self, all_zero_image, carved_output_dir):
        carve_raw(all_zero_image, carved_output_dir)
        carved = list(carved_output_dir.iterdir())
        assert carved == [], f"Expected no carved files, got {carved}"


class TestCarverSingleJPEG:
    """A single embedded JPEG should be found and extracted correctly."""

    def test_single_jpeg_found(self, single_jpeg_image, carved_output_dir):
        carve_raw(single_jpeg_image, carved_output_dir)
        jpegs = [f for f in carved_output_dir.iterdir() if f.suffix == ".jpg"]
        assert len(jpegs) == 1, f"Expected 1 JPEG, got {len(jpegs)}: {jpegs}"

    def test_single_jpeg_offset_in_filename(self, single_jpeg_image, carved_output_dir):
        carve_raw(single_jpeg_image, carved_output_dir)
        jpegs = [f for f in carved_output_dir.iterdir() if f.suffix == ".jpg"]
        assert len(jpegs) == 1
        # JPEG is at offset 0
        assert "0000000000" in jpegs[0].name

    def test_single_jpeg_content_correct(self, single_jpeg_image, carved_output_dir):
        carve_raw(single_jpeg_image, carved_output_dir)
        jpegs = [f for f in carved_output_dir.iterdir() if f.suffix == ".jpg"]
        assert len(jpegs) == 1
        data = jpegs[0].read_bytes()
        # Must start with JPEG header and end with JPEG footer
        assert data[:3] == JPEG_HEADER
        assert data[-2:] == JPEG_FOOTER


class TestCarverCursorDesyncRegression:
    """Bug #2 regression: TWO valid JPEGs in one image must BOTH be found.

    Before the fix, the carver's file cursor advanced past the second
    JPEG because f.read(max_size) consumed far more bytes than one chunk,
    but the offset counter only advanced by CHUNK bytes.
    """

    def test_two_jpegs_both_found(self, two_jpeg_image, carved_output_dir):
        carve_raw(two_jpeg_image, carved_output_dir)
        jpegs = sorted(
            [f for f in carved_output_dir.iterdir() if f.suffix == ".jpg"],
            key=lambda p: p.name,
        )
        assert len(jpegs) == 2, (
            f"Bug #2 regression: expected 2 JPEGs, found {len(jpegs)}. "
            f"Files: {[f.name for f in jpegs]}"
        )

    def test_two_jpegs_different_offsets(self, two_jpeg_image, carved_output_dir):
        carve_raw(two_jpeg_image, carved_output_dir)
        jpegs = sorted(
            [f for f in carved_output_dir.iterdir() if f.suffix == ".jpg"],
            key=lambda p: p.name,
        )
        assert len(jpegs) == 2
        # Extract offsets from filenames: JPEG_OOOOOOOOOO.jpg
        offsets = [int(f.stem.split("_")[-1]) for f in jpegs]
        assert offsets[0] != offsets[1], "Two JPEGs at the same offset is wrong"
        assert offsets[0] == 0
        assert offsets[1] == 1024 * 1024  # 1 MiB

    def test_two_jpegs_different_content(self, two_jpeg_image, carved_output_dir):
        carve_raw(two_jpeg_image, carved_output_dir)
        jpegs = sorted(
            [f for f in carved_output_dir.iterdir() if f.suffix == ".jpg"],
            key=lambda p: p.name,
        )
        assert len(jpegs) == 2
        h1 = hashlib.sha256(jpegs[0].read_bytes()).hexdigest()
        h2 = hashlib.sha256(jpegs[1].read_bytes()).hexdigest()
        assert h1 != h2, "Two different JPEGs should have different hashes"


class TestCarverMultiType:
    """Different file types at different offsets are carved independently."""

    def test_jpeg_png_pdf_all_found(self, multi_type_image, carved_output_dir):
        carve_raw(multi_type_image, carved_output_dir)
        files = list(carved_output_dir.iterdir())
        exts = sorted(f.suffix for f in files)
        assert ".jpg" in exts, "JPEG not carved"
        assert ".png" in exts, "PNG not carved"
        assert ".pdf" in exts, "PDF not carved"


class TestCarverDeduplication:
    """Identical embedded files should only be extracted once."""

    def test_identical_jpegs_deduped(self, tmp_path):
        jpeg = _make_jpeg(b"\xFF" * 200)
        gap = 512 * 1024
        # Two identical JPEGs at different offsets
        data = jpeg + b"\x00" * (gap - len(jpeg)) + jpeg
        data += b"\x00" * (2 * 1024 * 1024 - len(data))
        img = tmp_path / "dup_jpeg.img"
        img.write_bytes(data)

        out = tmp_path / "carved"
        out.mkdir()
        carve_raw(img, out)

        jpegs = [f for f in out.iterdir() if f.suffix == ".jpg"]
        assert len(jpegs) == 1, (
            f"Identical JPEGs should be deduped to 1, got {len(jpegs)}"
        )


class TestCarverFooterTrimming:
    """JPEG footer should correctly terminate extraction."""

    def test_footer_trims_data(self, tmp_path):
        # JPEG with 100 bytes of payload, then footer, then 500 bytes of garbage
        jpeg_body = JPEG_HEADER + b"\xAA" * 100 + JPEG_FOOTER + b"\xBB" * 500
        data = jpeg_body + b"\x00" * (1024 * 1024 - len(jpeg_body))
        img = tmp_path / "footer_test.img"
        img.write_bytes(data)

        out = tmp_path / "carved"
        out.mkdir()
        carve_raw(img, out)

        jpegs = [f for f in out.iterdir() if f.suffix == ".jpg"]
        assert len(jpegs) == 1
        carved_data = jpegs[0].read_bytes()
        # Carved file should end at footer, not include the garbage
        assert carved_data.endswith(JPEG_FOOTER)
        expected_len = len(JPEG_HEADER) + 100 + len(JPEG_FOOTER)
        assert len(carved_data) == expected_len
