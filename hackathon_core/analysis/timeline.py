"""timeline.py — Digital Evidence MACB & Forensic Event Timeline Synthesizer.

Synthesizes filesystem timestamps (Modified, Accessed, Changed, Created),
carved evidence discovery events, EXIF metadata dates, and chain-of-custody audit logs
into a unified chronological forensic timeline.
"""

import dataclasses
import datetime
import json
import logging
import pathlib
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


@dataclasses.dataclass
class TimelineEvent:
    timestamp: str
    event_type: str  # e.g., "FILE_MODIFIED", "FILE_CREATED", "FILE_DELETED", "EXIF_TAKEN", "EVIDENCE_CARVED"
    source: str
    description: str
    file_id: str
    severity: str = "INFO"  # "INFO", "WARNING", "CRITICAL"
    details: Dict[str, Any] = dataclasses.field(default_factory=dict)


class ForensicTimelineSynthesizer:
    """Builds interactive chronological timeline from multi-source evidence."""

    def __init__(self):
        self.events: List[TimelineEvent] = []

    def add_event(
        self,
        timestamp: str,
        event_type: str,
        source: str,
        description: str,
        file_id: str,
        severity: str = "INFO",
        details: Optional[Dict[str, Any]] = None
    ):
        self.events.append(
            TimelineEvent(
                timestamp=timestamp,
                event_type=event_type,
                source=source,
                description=description,
                file_id=file_id,
                severity=severity,
                details=details or {},
            )
        )

    def ingest_recovered_files(self, recovered_files: List[Dict[str, Any]]):
        """Ingest recovered filesystem and carved files into the timeline."""
        for file_info in recovered_files:
            file_id = file_info.get("file_id") or file_info.get("path") or "unknown"
            
            if file_info.get("is_deleted"):
                self.add_event(
                    timestamp=file_info.get("mtime") or datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    event_type="FILE_DELETED",
                    source="FILESYSTEM_ENUM",
                    description=f"Deleted file entry detected in MFT/Directory: {file_id}",
                    file_id=file_id,
                    severity="WARNING",
                    details=file_info,
                )
            else:
                self.add_event(
                    timestamp=file_info.get("mtime") or datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    event_type="FILE_RECOVERED",
                    source="CARVER_V2",
                    description=f"Carved file extracted at offset 0x{file_info.get('original_offset', 0):08x}",
                    file_id=file_id,
                    severity="INFO",
                    details=file_info,
                )

    def get_chronological_timeline(self) -> List[Dict[str, Any]]:
        """Return timeline events sorted chronologically."""
        sorted_events = sorted(self.events, key=lambda e: e.timestamp)
        return [dataclasses.asdict(e) for e in sorted_events]
