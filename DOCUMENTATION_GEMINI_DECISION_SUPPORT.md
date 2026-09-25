# Stage 6 — Investigator Decision Support using Gemini

## 1. Architectural Overview & Evidence Separation Boundary

The Gemini AI Investigator Decision Support Service provides structured, natural language forensic reasoning over evidence metadata stored in the SQLite database.

It operates under a strict architectural separation:

```text
RAW EVIDENCE DISK IMAGE (test-stick.img)
        │ (100% READ-ONLY)
        ▼
DETERMINISTIC FORENSIC RECOVERY ENGINE
  • SleuthKit/FAT Enumeration
  • Carver 2.0 Signature Scan
  • Non-Contiguous Fragment Reconstructor
  • Multi-Hash Integrity Verification
  • Artifact Classifier & Prioritizer
        │
        ▼
SQLITE FORENSIC PERSISTENCE ENGINE (data/forensics.db)
        │
        ▼
STRUCTURED NON-SENSITIVE METADATA PAYLOAD
  • Case ID, Target Image Hash, Examiner Name
  • File Offsets, Extensions, MIME types, SHA-256 Digests
  • Priority Levels, Category Tags, Fragment Sequences
        │
        ▼
GEMINI DECISION SUPPORT SERVICE (hackathon_core/analysis/gemini_advisor.py)
        │
        ▼
INVESTIGATOR DECISION SUPPORT OUTPUT
  • Executive Summary
  • Important Findings & Investigation Priorities
  • Recovery & Integrity Assessment
  • Recommended Next Forensic Actions
```

---

## 2. Safety Rules & Non-Negotiable Constraints

1. **NO RAW EVIDENCE DISK IMAGE INSPECTION**: Gemini never reads binary bytes, raw disk images (`test-stick.img`), or original evidence files directly.
2. **NO INVENTED OR FABRICATED EVIDENCE**: Gemini is instructed via system instruction to reason ONLY from the provided structured JSON metadata payload. It cannot invent recovered files, fragments, hashes, corruption, or findings.
3. **FACT VS. INTERPRETATION DISTINCTION**: Gemini explicitly distinguishes deterministic engine facts (e.g. SHA-256 match, offset 0x00001400) from AI interpretations or recommendations.
4. **NO HASH-ONLY AUTHENTICITY CLAIMS**: A SHA-256 hash confirms byte integrity against carved outputs, but Gemini does not falsely claim it proves absolute pre-deletion authenticity.
5. **ZERO CREDENTIAL LEAKAGE**: The payload builder (`build_structured_prompt_payload`) filters out all raw file payloads, secret keys, password strings, and binary content before constructing the API request.

---

## 3. Gemini API Key Configuration

The service uses the official Google GenAI Python SDK (`google-genai`).

- **Environment Variable**: `GEMINI_API_KEY`
- Configured in `.env` or system environment:
  ```env
  GEMINI_API_KEY=your_gemini_api_key_here
  ```
- Sample template provided in `.env.example`.

---

## 4. Deterministic Fallback Engine

When `GEMINI_API_KEY` is absent or the Gemini API is offline/unreachable:

- `GeminiDecisionSupportService` automatically falls back to an internal rule-based engine.
- The fallback engine returns the **exact same structured JSON contract**, populating executive summaries, priority findings, recovery assessments, limitations, and recommendations deterministically based on SQLite case data.
- The returned JSON includes `"ai_source": "DETERMINISTIC_FALLBACK_ENGINE"` (or `"GEMINI_2.5_FLASH_LIVE"` when live).

---

## 5. Structured AI Input & Response Contracts

### Input Payload Schema (`build_structured_prompt_payload`)
```json
{
  "case": {
    "case_id": "CAS-20260925-104500",
    "name": "Investigation Case #001",
    "examiner": "Lead Forensic Examiner",
    "target_image": "C:\\...\\test-stick.img",
    "status": "COMPLETED",
    "image_hashes": { "sha256": "8565a714..." }
  },
  "artifacts": [
    {
      "file_id": "FILE-0001",
      "category": "CREDENTIALS",
      "priority": "HIGH",
      "extension": ".txt",
      "mime_type": "text/plain",
      "offset": 5120,
      "size": 1024,
      "sha256": "...",
      "confidence": 0.95,
      "repaired": false,
      "finding_types": ["RSA_PRIVATE_KEY"]
    }
  ],
  "reconstructions": [
    {
      "reconstruction_id": "RECON-0001",
      "file_type": "JPEG",
      "fragment_count": 2,
      "ordered_fragments": ["FRAG-001", "FRAG-002"],
      "confidence": 0.88,
      "status": "RECONSTRUCTED",
      "sha256": "..."
    }
  ],
  "chain_of_custody": {
    "total_events": 5,
    "event_actions": ["EVIDENCE_INGEST", "FILE_CARVED"]
  }
}
```

### Output Response Schema
The response object includes 10 required keys:
- `executive_summary`: Concise case summary.
- `evidence_overview`: Summary of evidence sources and recovered categories.
- `important_findings`: Highlighting high-priority sensitive findings.
- `recovery_assessment`: Explanation of carved & reconstructed files.
- `integrity_assessment`: Hashes and corruption integrity breakdown.
- `investigation_priorities`: High-priority target artifacts and rationale.
- `reconstruction_explanation`: Non-contiguous fragment assembly explanation.
- `limitations`: Explaining metadata-only boundaries and AI scope.
- `recommended_next_actions`: Suggested next steps for human investigator.
- `ai_source`: `"GEMINI_2.5_FLASH_LIVE"` or `"DETERMINISTIC_FALLBACK_ENGINE"`.

---

## 6. API Endpoint Integration

The FastAPI backend exposes the decision support feature via:

```http
GET /api/ai/analysis/{case_id}
```

Example request:
```bash
curl http://localhost:8000/api/ai/analysis/CAS-20260925-104500
```
