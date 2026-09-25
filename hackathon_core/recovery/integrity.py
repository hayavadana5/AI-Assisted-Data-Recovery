"""integrity.py — Enterprise Hashing, Chain of Custody & Evidence Sealing.

Provides multi-hash computation (MD5, SHA-1, SHA-256, SHA-512),
cryptographic verification, block-level hashing for raw disk images,
and immutable audit log tracking for chain-of-custody compliance.
"""

import hashlib
import hmac
import json
import logging
import os
import pathlib
import time
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Standard buffer size for streaming file reads (64 KB)
BUFFER_SIZE = 64 * 1024


def calculate_file_hashes(file_path: pathlib.Path) -> Dict[str, str]:
    """Calculate MD5, SHA-1, SHA-256, and SHA-512 hashes in a single file pass."""
    md5 = hashlib.md5()
    sha1 = hashlib.sha1()
    sha256 = hashlib.sha256()
    sha512 = hashlib.sha512()

    with file_path.open("rb") as f:
        while chunk := f.read(BUFFER_SIZE):
            md5.update(chunk)
            sha1.update(chunk)
            sha256.update(chunk)
            sha512.update(chunk)

    return {
        "md5": md5.hexdigest(),
        "sha1": sha1.hexdigest(),
        "sha256": sha256.hexdigest(),
        "sha512": sha512.hexdigest(),
    }


def calculate_buffer_hashes(data: bytes) -> Dict[str, str]:
    """Calculate MD5, SHA-1, SHA-256, and SHA-512 hashes for an in-memory byte buffer."""
    return {
        "md5": hashlib.md5(data).hexdigest(),
        "sha1": hashlib.sha1(data).hexdigest(),
        "sha256": hashlib.sha256(data).hexdigest(),
        "sha512": hashlib.sha512(data).hexdigest(),
    }


def compute_hmac_seal(data_bytes: bytes, secret_key: bytes) -> str:
    """Compute an HMAC-SHA256 signature seal for forensic data verification."""
    return hmac.new(secret_key, data_bytes, hashlib.sha256).hexdigest()


class ChainOfCustodyTracker:
    """Maintains an append-only cryptographic audit log for evidence handling."""

    def __init__(self, log_path: pathlib.Path):
        self.log_path = log_path
        self.events: List[Dict[str, Any]] = []
        self._load_or_init()

    def _load_or_init(self):
        if self.log_path.exists():
            try:
                with self.log_path.open("r", encoding="utf-8") as f:
                    self.events = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load chain of custody log: {e}")
                self.events = []

    def record_event(
        self,
        action: str,
        actor: str,
        target: str,
        hashes: Optional[Dict[str, str]] = None,
        notes: str = ""
    ) -> Dict[str, Any]:
        """Record an evidence handling event into the audit log."""
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        prev_hash = self.events[-1]["current_hash"] if self.events else "GENESIS_BLOCK"

        event = {
            "event_id": len(self.events) + 1,
            "timestamp": timestamp,
            "action": action,
            "actor": actor,
            "target": target,
            "hashes": hashes or {},
            "notes": notes,
            "prev_hash": prev_hash,
        }

        # Calculate block chain hash for immutability
        block_bytes = json.dumps(event, sort_keys=True).encode("utf-8")
        event["current_hash"] = hashlib.sha256(block_bytes).hexdigest()

        self.events.append(event)
        self._save()
        return event

    def _save(self):
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        with self.log_path.open("w", encoding="utf-8") as f:
            json.dump(self.events, f, indent=2)

    def verify_integrity(self) -> bool:
        """Verify the cryptographic chain of custody log is untampered."""
        for i, event in enumerate(self.events):
            expected_prev = "GENESIS_BLOCK" if i == 0 else self.events[i - 1]["current_hash"]
            if event["prev_hash"] != expected_prev:
                logger.error(f"Chain of custody broken at block {event['event_id']}")
                return False

            block_copy = dict(event)
            stored_hash = block_copy.pop("current_hash")
            block_bytes = json.dumps(block_copy, sort_keys=True).encode("utf-8")
            calc_hash = hashlib.sha256(block_bytes).hexdigest()

            if calc_hash != stored_hash:
                logger.error(f"Hash mismatch at block {event['event_id']}")
                return False

        return True
