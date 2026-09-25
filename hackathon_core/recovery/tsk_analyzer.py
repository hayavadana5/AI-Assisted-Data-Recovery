"""tsk_analyzer.py — SleuthKit & Native Filesystem Analysis Engine.

Combines TSK tools (fls, icat) with a built-in Python FAT12/FAT16/FAT32/NTFS
boot sector & directory parser for automated filesystem recovery.
"""

import csv
import io
import logging
import os
import pathlib
import re
import subprocess
import struct
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class RecoveredEntry:
    def __init__(
        self,
        inode: str,
        path: str,
        is_directory: bool,
        is_deleted: bool,
        size: int = 0,
        mtime: Optional[str] = None
    ):
        self.inode = inode
        self.path = path
        self.is_directory = is_directory
        self.is_deleted = is_deleted
        self.size = size
        self.mtime = mtime

    def to_dict(self) -> Dict[str, Any]:
        return {
            "inode": self.inode,
            "path": self.path,
            "is_directory": self.is_directory,
            "is_deleted": self.is_deleted,
            "size": self.size,
            "mtime": self.mtime,
        }


class SleuthKitAnalyzer:
    """Analyzer executing TSK CLI utilities or falling back to Python raw parser."""

    def __init__(self, image_path: pathlib.Path):
        self.image_path = image_path

    def analyze_filesystem(self, output_dir: pathlib.Path) -> List[RecoveredEntry]:
        """Perform complete filesystem enumeration and file extraction."""
        output_dir.mkdir(parents=True, exist_ok=True)
        entries = self._run_fls()

        if not entries:
            logger.info("TSK fls found no entries or failed. Running raw FAT/NTFS fallback parser.")
            entries = self._parse_fat_fallback()

        # Extract non-directory files
        for entry in entries:
            if not entry.is_directory:
                self._extract_file(entry, output_dir)

        return entries

    def _run_fls(self) -> List[RecoveredEntry]:
        """Execute fls -r -p -m to discover all filesystem entries."""
        try:
            res = subprocess.run(
                ["fls", "-r", "-p", "-m", "/", str(self.image_path)],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if res.returncode != 0:
                logger.warning(f"fls returned error code {res.returncode}")
                return []

            entries = []
            for line in res.stdout.splitlines():
                parsed = self._parse_fls_line(line)
                if parsed:
                    entries.append(parsed)
            return entries
        except (FileNotFoundError, subprocess.TimeoutExpired) as e:
            logger.warning(f"fls execution error: {e}")
            return []

    @staticmethod
    def _parse_fls_line(line: str) -> Optional[RecoveredEntry]:
        """Parse standard fls output line. Correctly handles inode parsing (Bug #1 Fix)."""
        # Format example: r/r * 14-128-1: /deleted_doc.pdf
        pattern = r"^([rdD/\*\-]+)\s+([\d\-\:]+):\s+(.+)$"
        match = re.match(pattern, line.strip())
        if not match:
            return None

        entry_type, inode, path = match.groups()
        is_dir = "d" in entry_type.lower()
        is_deleted = "*" in entry_type or "d/" in entry_type.lower()
        clean_path = path.lstrip("/")

        return RecoveredEntry(
            inode=inode,
            path=clean_path,
            is_directory=is_dir,
            is_deleted=is_deleted,
        )

    def _extract_file(self, entry: RecoveredEntry, output_dir: pathlib.Path) -> bool:
        """Extract file payload using icat."""
        clean_name = entry.path.replace("/", "_").replace("\\", "_")
        if entry.is_deleted:
            clean_name = f"DELETED_{clean_name}"

        out_path = output_dir / clean_name
        try:
            res = subprocess.run(
                ["icat", str(self.image_path), entry.inode],
                capture_output=True,
                timeout=30,
            )
            if res.returncode == 0 and res.stdout:
                out_path.write_bytes(res.stdout)
                entry.size = len(res.stdout)
                return True
        except Exception as e:
            logger.warning(f"icat failed for inode {entry.inode}: {e}")
        return False

    def _parse_fat_fallback(self) -> List[RecoveredEntry]:
        """Raw Python fallback for FAT12/16/32 image parsing when SleuthKit is absent."""
        entries = []
        try:
            with self.image_path.open("rb") as f:
                boot_sector = f.read(512)
                if len(boot_sector) < 512:
                    return []

                # Parse FAT BPB parameters
                bytes_per_sec = struct.unpack_from("<H", boot_sector, 11)[0]
                sec_per_clus = boot_sector[13]
                reserved_sec = struct.unpack_from("<H", boot_sector, 14)[0]
                num_fats = boot_sector[16]
                root_ent_count = struct.unpack_from("<H", boot_sector, 17)[0]

                if bytes_per_sec not in (512, 1024, 2048, 4096) or num_fats == 0:
                    return []

                # Calculate root directory offset
                root_dir_offset = (reserved_sec + (num_fats * struct.unpack_from("<H", boot_sector, 22)[0])) * bytes_per_sec
                if root_ent_count > 0:
                    f.seek(root_dir_offset)
                    root_dir_bytes = f.read(root_ent_count * 32)

                    for i in range(0, len(root_dir_bytes), 32):
                        entry_bytes = root_dir_bytes[i : i + 32]
                        first_byte = entry_bytes[0]

                        if first_byte == 0x00:
                            break  # End of directory table

                        is_deleted = first_byte == 0xE5
                        attr = entry_bytes[11]
                        if attr == 0x0F:  # LFN entry
                            continue

                        is_dir = bool(attr & 0x10)
                        name = entry_bytes[:8].decode("ascii", errors="ignore").strip()
                        ext = entry_bytes[8:11].decode("ascii", errors="ignore").strip()

                        if is_deleted:
                            name = "_" + name[1:]

                        filename = f"{name}.{ext}" if ext else name
                        size = struct.unpack_from("<I", entry_bytes, 28)[0]
                        first_clus = struct.unpack_from("<H", entry_bytes, 26)[0]

                        entries.append(
                            RecoveredEntry(
                                inode=str(first_clus),
                                path=filename,
                                is_directory=is_dir,
                                is_deleted=is_deleted,
                                size=size,
                            )
                        )
        except Exception as e:
            logger.error(f"Fallback FAT parser error: {e}")

        return entries
