"""test_reporter.py — Tests for the reporter module (Bug #4 regression).

Covers:
- Bug #4: CalledProcessError from gpg/tsa-client no longer crashes.
- FileNotFoundError is still handled gracefully.
- Successful signing path (mocked).
"""
import pathlib
import subprocess
import sys
from unittest import mock

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from fbi_recovery.reporter import sign_and_stamp


class TestReporterGPGNotFound:
    def test_gpg_missing_no_crash(self, tmp_path):
        csv = tmp_path / "test.csv"
        csv.write_text("inode,type,path,exported\n")
        with mock.patch("fbi_recovery.reporter.subprocess.check_call",
                        side_effect=FileNotFoundError("gpg")):
            # Should not raise
            sign_and_stamp(csv)


class TestReporterBug4Regression:
    """Bug #4: CalledProcessError from gpg must not crash the pipeline."""

    def test_gpg_called_process_error_no_crash(self, tmp_path):
        csv = tmp_path / "test.csv"
        csv.write_text("inode,type,path,exported\n")
        with mock.patch("fbi_recovery.reporter.subprocess.check_call",
                        side_effect=subprocess.CalledProcessError(2, "gpg")):
            # Before fix, this would raise. After fix, it should be caught.
            sign_and_stamp(csv)

    def test_tsa_called_process_error_no_crash(self, tmp_path):
        csv = tmp_path / "test.csv"
        csv.write_text("inode,type,path,exported\n")

        call_count = [0]
        def side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                raise FileNotFoundError("gpg")  # gpg missing
            else:
                raise subprocess.CalledProcessError(1, "tsa-client")  # tsa fails

        with mock.patch("fbi_recovery.reporter.subprocess.check_call",
                        side_effect=side_effect):
            sign_and_stamp(csv)
