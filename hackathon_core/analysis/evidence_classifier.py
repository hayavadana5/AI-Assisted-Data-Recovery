"""evidence_classifier.py — AI Evidence Classifier & Intelligence Extractor.

Inspects recovered files for sensitive data patterns (passwords, private keys,
credit card numbers, API tokens, GPS geotags, metadata) and categorizes
evidence into severity classes (HIGH, MEDIUM, LOW) for forensic investigation.
"""

import json
import logging
import pathlib
import re
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# Forensic Regular Expression Detectors
REGEX_PATTERNS = {
    "private_key": re.compile(r"-----BEGIN (?:RSA|OPENSSH|EC|PGP) PRIVATE KEY-----"),
    "aws_access_key": re.compile(r"(?:AKIA|ASIA)[0-9A-Z]{16}"),
    "jwt_token": re.compile(r"ey[A-Za-z0-9_-]{10,}\.ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    "email": re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
    "ip_address": re.compile(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"),
    "password_keyword": re.compile(r"(?:password|passwd|secret|token|api_key|credentials)\s*[:=]\s*[\"']?([^\s\"']+)[\"']?", re.IGNORECASE),
    "bitcoin_address": re.compile(r"\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\b"),
}


class EvidenceClassifier:
    """Intelligent classification and pattern extraction for recovered files."""

    def classify_file(self, file_path: pathlib.Path, file_info: Dict[str, Any]) -> Dict[str, Any]:
        findings: List[Dict[str, Any]] = []
        category = "DOCUMENT"
        priority = "LOW"
        tags: List[str] = []

        ext = file_path.suffix.lstrip(".").lower()

        # Classify by Extension & MIME
        if ext in ("jpg", "jpeg", "png", "gif", "bmp", "webp"):
            category = "IMAGE"
            tags.append("media")
        elif ext in ("pdf", "doc", "docx", "xls", "xlsx", "txt", "csv", "json"):
            category = "DOCUMENT"
            tags.append("document")
        elif ext in ("zip", "tar", "gz", "7z", "rar"):
            category = "ARCHIVE"
            tags.append("compressed")
        elif ext in ("mp4", "avi", "mkv", "wav", "mp3"):
            category = "AUDIO_VIDEO"
            tags.append("media")
        else:
            category = "UNCLASSIFIED"

        # Content inspection for text / raw files
        if file_path.exists() and file_path.stat().st_size <= 10 * 1024 * 1024:
            try:
                content = file_path.read_bytes()

                # Text pattern scanning
                text_content = content.decode("utf-8", errors="ignore")
                for name, regex in REGEX_PATTERNS.items():
                    matches = regex.findall(text_content)
                    if matches:
                        match_sample = matches[:3]
                        findings.append({
                            "type": name,
                            "count": len(matches),
                            "sample": [str(m) for m in match_sample],
                        })

                        if name in ("private_key", "aws_access_key", "password_keyword", "bitcoin_address"):
                            priority = "HIGH"
                            tags.append("SENSITIVE_CREDENTIAL")
                        elif name in ("jwt_token", "email", "ip_address") and priority != "HIGH":
                            priority = "MEDIUM"
                            tags.append("INTEL")

                # EXIF Geotag Check for JPEGs
                if ext in ("jpg", "jpeg") and b"Exif" in content[:200]:
                    tags.append("GEOLOCATION_DATA")
                    if priority == "LOW":
                        priority = "MEDIUM"

            except Exception as e:
                logger.debug(f"Content scanning error on {file_path}: {e}")

        # Check filename indicators
        fname_lower = file_path.name.lower()
        if any(w in fname_lower for w in ["secret", "pass", "confidential", "fbi", "evidence", "key", "vault"]):
            priority = "HIGH"
            tags.append("KEYWORD_MATCH")

        return {
            "file_id": file_path.name,
            "category": category,
            "priority": priority,
            "tags": list(set(tags)),
            "findings": findings,
            "finding_count": len(findings),
        }
