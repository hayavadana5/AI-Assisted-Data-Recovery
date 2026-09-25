"""conftest.py — Shared fixtures for all recovery-engine tests.

Every fixture that creates files does so inside ``tmp_path`` (a fresh
temporary directory per test, managed by pytest).  No test ever
writes to *test-stick.img* or *recovery_20260115_033107/*.
"""
import pathlib
import struct
import pytest

# ──────────────────────────────────────────────────────────
# Path constants
# ──────────────────────────────────────────────────────────
REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
EVIDENCE_IMG = REPO_ROOT / "test-stick.img"
RECOVERY_FIXTURE = REPO_ROOT / "recovery_20260115_033107"

# SHA-256 of the evidence fixtures at audit time — used by the
# "evidence not modified" guard test.
EVIDENCE_IMG_SHA256 = "8565a714dca840f8652c5bae9249ab05f5fb5a4f9f13fbe23304b10f68252da2"
RECOVERY_FORENSIC_IMG_SHA256 = "fe17d72b3fec22928879293c1221017274f4aa00da433f42f1a7b71898431f09"
RECOVERY_SLEUTHKIT_CSV_SHA256 = "f20f62e08ebc1b2fa57e5a427b0a86e2476f7d00d9ef027072624f7ccf8069fa"


# ──────────────────────────────────────────────────────────
# Synthetic JPEG builder
# ──────────────────────────────────────────────────────────
JPEG_HEADER = b"\xff\xd8\xff"
JPEG_FOOTER = b"\xff\xd9"

def _make_jpeg(payload: bytes = b"\x00" * 100) -> bytes:
    """Return a minimal byte sequence with JPEG header, payload, and footer."""
    return JPEG_HEADER + payload + JPEG_FOOTER


# ──────────────────────────────────────────────────────────
# Synthetic PNG builder
# ──────────────────────────────────────────────────────────
PNG_HEADER = bytes.fromhex("89504E470D0A1A0A")
PNG_FOOTER = bytes.fromhex("49454E44AE426082")

def _make_png(payload: bytes = b"\x00" * 80) -> bytes:
    return PNG_HEADER + payload + PNG_FOOTER


# ──────────────────────────────────────────────────────────
# Synthetic PDF builder
# ──────────────────────────────────────────────────────────
PDF_HEADER = bytes.fromhex("25504446")  # %PDF
PDF_FOOTER = bytes.fromhex("0A2525454F46")  # \n%%EOF

def _make_pdf(payload: bytes = b"\x00" * 120) -> bytes:
    return PDF_HEADER + payload + PDF_FOOTER


# ──────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────

@pytest.fixture
def all_zero_image(tmp_path: pathlib.Path) -> pathlib.Path:
    """50 MiB image of all null bytes — mirrors ``test-stick.img``."""
    img = tmp_path / "all_zero.img"
    img.write_bytes(b"\x00" * (50 * 1024 * 1024))
    return img


@pytest.fixture
def single_jpeg_image(tmp_path: pathlib.Path) -> pathlib.Path:
    """Image containing exactly one JPEG at offset 0."""
    jpeg = _make_jpeg(b"\xAB" * 200)
    # Pad to 1 MiB
    img = tmp_path / "single_jpeg.img"
    data = jpeg + b"\x00" * (1024 * 1024 - len(jpeg))
    img.write_bytes(data)
    return img


@pytest.fixture
def two_jpeg_image(tmp_path: pathlib.Path) -> pathlib.Path:
    """Image containing TWO valid JPEGs at different offsets.

    This is the critical regression test for Bug #2 (cursor desync).
    Both JPEGs must be discovered by the carver.
    """
    jpeg1 = _make_jpeg(b"\xAA" * 300)
    jpeg2 = _make_jpeg(b"\xBB" * 400)

    # Place jpeg1 at offset 0, jpeg2 at offset 1 MiB
    gap = 1024 * 1024
    data = jpeg1 + b"\x00" * (gap - len(jpeg1)) + jpeg2
    # Pad to 2 MiB total
    data += b"\x00" * (2 * 1024 * 1024 - len(data))

    img = tmp_path / "two_jpeg.img"
    img.write_bytes(data)
    return img


@pytest.fixture
def multi_type_image(tmp_path: pathlib.Path) -> pathlib.Path:
    """Image containing a JPEG, a PNG, and a PDF at different offsets."""
    jpeg = _make_jpeg(b"\xCC" * 200)
    png = _make_png(b"\xDD" * 150)
    pdf = _make_pdf(b"\xEE" * 180)

    chunk = 512 * 1024  # 512 KiB
    data = bytearray(3 * chunk)
    data[0:len(jpeg)] = jpeg
    data[chunk:chunk + len(png)] = png
    data[2 * chunk:2 * chunk + len(pdf)] = pdf

    img = tmp_path / "multi_type.img"
    img.write_bytes(bytes(data))
    return img


@pytest.fixture
def carved_output_dir(tmp_path: pathlib.Path) -> pathlib.Path:
    d = tmp_path / "carved"
    d.mkdir()
    return d
