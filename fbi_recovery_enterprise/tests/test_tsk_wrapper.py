"""test_tsk_wrapper.py — Tests for the SleuthKit wrapper (fls/icat).

Covers:
- Bug #1 regression: inode parsing from fls output lines.
- Graceful handling when fls binary is not available.
- Graceful handling when fls fails (no filesystem on image).
- CSV header is always written even on failure.
- _parse_fls_line unit tests for various fls output formats.
"""
import csv
import pathlib
import sys
from unittest import mock

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from fbi_recovery.tsk_wrapper import sleuthkit_extract, _parse_fls_line


class TestParseFLSLine:
    """Unit tests for _parse_fls_line — the core of Bug #1 fix."""

    def test_regular_file(self):
        # fls output: 'r/r 34:\tsecret.txt'
        result = _parse_fls_line("r/r 34:\tsecret.txt")
        assert result is not None
        inode, ftype, relpath = result
        assert inode == "34"
        assert ftype == "r"
        assert relpath == "secret.txt"

    def test_directory_entry(self):
        result = _parse_fls_line("d/d 5:\tsome_dir")
        assert result is not None
        inode, ftype, relpath = result
        assert inode == "5"
        assert ftype == "d"

    def test_nested_path(self):
        result = _parse_fls_line("r/r 42:\tsome/nested/path/file.txt")
        assert result is not None
        inode, ftype, relpath = result
        assert inode == "42"
        assert relpath == "some/nested/path/file.txt"

    def test_path_with_leading_slash_stripped(self):
        result = _parse_fls_line("r/r 42:\t/leading/slash/file.txt")
        assert result is not None
        _, _, relpath = result
        assert not relpath.startswith("/"), "Leading slash should be stripped"

    def test_inode_with_attribute(self):
        # Some fls output has inode:attr format like '34:128-1'
        result = _parse_fls_line("r/r 34:128-1:\tfile.dat")
        assert result is not None
        inode, _, _ = result
        # Should get '34' (before the first colon in the inode field)
        # parts[0] = 'r/r 34:128-1:' → split() → ['r/r', '34:128-1:']
        # → split(':') → ['34', '128-1', ''] → [0] = '34'
        assert inode == "34"

    def test_rejects_short_line(self):
        assert _parse_fls_line("no tab here") is None

    def test_rejects_unknown_type(self):
        # 'v' is not r or d
        assert _parse_fls_line("v/v 10:\tvolume") is None

    def test_rejects_line_with_no_inode_field(self):
        # Only one token before tab
        assert _parse_fls_line("r\tfile.txt") is None

    def test_bug1_regression_inode_not_filename(self):
        """Bug #1: Old code did parts[1].split(':')[0] which returned the
        FILENAME ('secret.txt') instead of the inode ('34').

        This test explicitly verifies the fix produces the inode, not
        the filename.
        """
        line = "r/r 34:\tsecret.txt"
        result = _parse_fls_line(line)
        assert result is not None
        inode, _, _ = result
        assert inode == "34", f"Expected inode '34', got '{inode}' — Bug #1 regression!"
        assert inode != "secret.txt", "Bug #1 regression: inode is the filename!"


class TestSleuthkitExtractFLSNotFound:
    """When fls binary is not installed, extraction should fail gracefully."""

    def test_missing_fls_creates_csv_header(self, tmp_path):
        img = tmp_path / "dummy.img"
        img.write_bytes(b"\x00" * 1024)
        out = tmp_path / "sleuthkit"

        with mock.patch("fbi_recovery.tsk_wrapper.subprocess.check_output",
                        side_effect=FileNotFoundError("fls")):
            sleuthkit_extract(img, out)

        csv_path = out / "sleuthkit.csv"
        assert csv_path.exists(), "CSV should be created even if fls is missing"
        with csv_path.open() as f:
            reader = csv.reader(f)
            header = next(reader)
            assert "inode" in header
            # No data rows
            rows = list(reader)
            assert len(rows) == 0


class TestSleuthkitExtractFLSFailure:
    """When fls fails (e.g., no filesystem), extraction should fail gracefully."""

    def test_fls_failure_creates_csv_header(self, tmp_path):
        img = tmp_path / "no_fs.img"
        img.write_bytes(b"\x00" * 1024)
        out = tmp_path / "sleuthkit"

        import subprocess
        with mock.patch("fbi_recovery.tsk_wrapper.subprocess.check_output",
                        side_effect=subprocess.CalledProcessError(1, "fls", stderr="no fs")):
            sleuthkit_extract(img, out)

        csv_path = out / "sleuthkit.csv"
        assert csv_path.exists()
        with csv_path.open() as f:
            reader = csv.reader(f)
            header = next(reader)
            assert "inode" in header
            rows = list(reader)
            assert len(rows) == 0


class TestSleuthkitExtractWithMockedFLS:
    """Test the full extraction flow with mocked fls/icat."""

    def test_successful_extraction(self, tmp_path):
        img = tmp_path / "test.img"
        img.write_bytes(b"\x00" * 1024)
        out = tmp_path / "sleuthkit"

        fls_output = "r/r 34:\tsecret.txt\nr/r 35:\tanother.dat\n"

        with mock.patch("fbi_recovery.tsk_wrapper.subprocess.check_output",
                        return_value=fls_output):
            with mock.patch("fbi_recovery.tsk_wrapper.subprocess.check_call") as mock_icat:
                # Make icat write some bytes to the output file
                def fake_icat(cmd, stdout=None):
                    if stdout:
                        stdout.write(b"recovered data")
                mock_icat.side_effect = fake_icat

                sleuthkit_extract(img, out)

        csv_path = out / "sleuthkit.csv"
        assert csv_path.exists()
        with csv_path.open() as f:
            reader = csv.reader(f)
            header = next(reader)
            rows = list(reader)
            assert len(rows) == 2
            # Verify icat was called with correct inode values (not filenames)
            assert rows[0][0] == "34"  # inode
            assert rows[1][0] == "35"  # inode

    def test_icat_failure_logged_as_failed(self, tmp_path):
        img = tmp_path / "test.img"
        img.write_bytes(b"\x00" * 1024)
        out = tmp_path / "sleuthkit"

        fls_output = "r/r 99:\tbad_file.txt\n"

        with mock.patch("fbi_recovery.tsk_wrapper.subprocess.check_output",
                        return_value=fls_output):
            with mock.patch("fbi_recovery.tsk_wrapper.subprocess.check_call",
                            side_effect=Exception("icat failed")):
                sleuthkit_extract(img, out)

        csv_path = out / "sleuthkit.csv"
        with csv_path.open() as f:
            reader = csv.reader(f)
            next(reader)  # header
            rows = list(reader)
            assert len(rows) == 1
            assert rows[0][3] == "FAILED"
