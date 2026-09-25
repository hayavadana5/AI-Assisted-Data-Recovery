"""test_hasher.py — Tests for the hasher module.

Confirms that hash_file() produces correct, verified digests.
"""
import pathlib
import hashlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from fbi_recovery.hasher import hash_file


class TestHashFile:
    def test_sha256_known_value(self, tmp_path):
        f = tmp_path / "test.bin"
        content = b"hello forensic world"
        f.write_bytes(content)
        expected = hashlib.sha256(content).hexdigest()
        assert hash_file(f, "sha256") == expected

    def test_md5_known_value(self, tmp_path):
        f = tmp_path / "test.bin"
        content = b"md5 test data"
        f.write_bytes(content)
        expected = hashlib.md5(content).hexdigest()
        assert hash_file(f, "md5") == expected

    def test_sha1_known_value(self, tmp_path):
        f = tmp_path / "test.bin"
        content = b"sha1 test data"
        f.write_bytes(content)
        expected = hashlib.sha1(content).hexdigest()
        assert hash_file(f, "sha1") == expected

    def test_empty_file(self, tmp_path):
        f = tmp_path / "empty.bin"
        f.write_bytes(b"")
        expected = hashlib.sha256(b"").hexdigest()
        assert hash_file(f) == expected

    def test_large_file(self, tmp_path):
        """Verify streaming hash matches in-memory hash for >1 MiB files."""
        f = tmp_path / "large.bin"
        content = b"\xAB" * (2 * 1024 * 1024)  # 2 MiB
        f.write_bytes(content)
        expected = hashlib.sha256(content).hexdigest()
        assert hash_file(f) == expected
