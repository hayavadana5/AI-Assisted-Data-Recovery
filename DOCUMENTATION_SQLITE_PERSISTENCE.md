# Stage 5 — Persistent Evidence Storage Architecture (SQLite + SQLAlchemy)

## 1. Why SQLite Was Selected
SQLite provides a zero-friction, serverless, single-file relational database ideal for local digital forensics casework and hackathon deployments. It avoids external server processes (e.g. PostgreSQL/MySQL) while ensuring ACID transactional compliance, immediate local query capabilities, and complete application restart persistence.

---

## 2. Database Location
- Default local path: `data/forensics.db` (project root)
- Overridable via `init_db(custom_path)` for test environments.
- The original evidence image (`test-stick.img`) remains **100% read-only** and is never placed or written inside the database directory.

---

## 3. Schema & Entities

The persistence layer defines 9 core SQLAlchemy ORM models ([`hackathon_core/db/models.py`](file:///c:/Users/hayavadana/Desktop/Data_Recovery_Hackathon/hackathon_core/db/models.py)):

1. **`CaseModel` (`cases`)**:
   - `id`, `case_id`, `name`, `examiner`, `status`, `target_image`, `image_size`, `image_sha256`, `image_md5`, `image_sha1`, `created_at`, `updated_at`.
2. **`EvidenceSourceModel` (`evidence_sources`)**:
   - `id`, `case_id` (FK), `path`, `source_type`, `size`, `hashes_json`, `acquisition_metadata_json`, `created_at`.
3. **`ArtifactModel` (`artifacts`)**:
   - `id`, `case_id` (FK), `filename`, `path`, `offset`, `size`, `extension`, `mime_type`, `sha256`, `md5`, `sha1`, `sha512`, `category`, `priority`, `confidence`, `repaired`, `tags_json`, `findings_json`, `recovery_method`, `created_at`.
4. **`FragmentModel` (`fragments`)**:
   - `id`, `fragment_id`, `case_id` (FK), `artifact_id` (FK), `source_image`, `offset`, `size`, `file_type`, `signature`, `sha256`, `entropy`, `sequence`, `confidence`, `reconstruction_status`.
5. **`ReconstructionModel` (`reconstructions`)**:
   - `id`, `case_id` (FK), `reconstruction_id`, `artifact_id` (FK), `fragment_count`, `output_path`, `output_size`, `sha256`, `confidence`, `confidence_factors_json`, `status`, `created_at`.
6. **`ReconstructionFragmentModel` (`reconstruction_fragments`)**:
   - `id`, `reconstruction_id` (FK), `fragment_id` (FK), `sequence_order` (preserves exact fragment assembly sequence).
7. **`IntegrityResultModel` (`integrity_results`)**:
   - `id`, `artifact_id` (FK), `validation_status`, `corruption_status`, `corruption_details_json`, `entropy_info_json`, `repair_status`, `hashes_json`, `timestamp`.
8. **`FindingModel` (`findings`)**:
   - `id`, `artifact_id` (FK), `finding_type`, `description`, `severity`, `evidence_support_json`, `created_at`.
9. **`ChainOfCustodyEventModel` (`chain_of_custody_events`)**:
   - `id`, `case_id` (FK), `event_id_num`, `timestamp`, `action`, `actor`, `target`, `description`, `current_hash`, `prev_hash`, `notes`.

---

## 4. Entity Relationships

```text
CaseModel
 ├── EvidenceSourceModel
 ├── ArtifactModel
 │    ├── IntegrityResultModel
 │    └── FindingModel
 ├── FragmentModel
 ├── ReconstructionModel
 │    └── ReconstructionFragmentModel (Many-to-Many Association with FragmentModel)
 └── ChainOfCustodyEventModel
```

---

## 5. How Case Data, Reconstruction & Custody Are Persisted
- When `POST /api/scan` is triggered, initial case metadata is saved via `ForensicRepository(session).save_case_manifest()`.
- During scan execution, evidence registration, entropy mapping, file carving, fragment reconstruction, and custody log events are recorded.
- At scan completion, `ForensicRepository.save_case_manifest()` commits all artifacts, fragments, ordered reconstructions, and chain of custody events to SQLite.

---

## 6. Relationship Between SQLite & JSON Export
- **SQLite Database** (`data/forensics.db`): The **canonical persistent source of truth**. All API queries (`GET /api/cases`, `GET /api/cases/{case_id}`, `GET /api/files/{case_id}`) read directly from SQLite.
- **JSON Manifest** (`cases_output/<case_id>/Case_Export_<case_id>.json`): The **portable export representation**, compiled directly from SQLite data via `export_case_json()`.

---

## 7. Development Database Reset Procedure
To reset the development database:
```bash
python -c "import pathlib; p = pathlib.Path('data/forensics.db'); p.unlink() if p.exists() else None"
```
Or delete `data/forensics.db`. The application will automatically recreate all tables on next startup via `init_db()`.

---

## 8. Evidence Safety Guarantees
- The database stores **only metadata**.
- Evidence images (`test-stick.img`) are opened strictly in read-only (`"rb"`) mode.
- Verified by unit test `test_evidence_immutability` (SHA-256 remains `8565a714dca840f8652c5bae9249ab05f5fb5a4f9f13fbe23304b10f68252da2`).

---

## 9. Known Limitations
- Database uses SQLite file locking (suitable for single-instance / local desktop forensic analysis).
