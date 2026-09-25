# Non-Contiguous Fragment Detection & Reconstruction Engine

## 1. What a Fragment Is
A **fragment** ([`Fragment`](file:///c:/Users/hayavadana/Desktop/Data_Recovery_Hackathon/hackathon_core/recovery/fragment.py)) is a discrete, localized block of binary evidence identified on a raw disk image that contains file structural markers or characteristic data patterns.

Each fragment tracks:
- `fragment_id`: Unique identifier formatted as `frag_<type>_<offset_hex>`
- `source_image`: Disk image filename
- `offset`: Byte offset from disk image origin
- `size`: Byte length of fragment
- `file_type`: Format signature (`JPEG`, `PNG`, `PDF`, etc.)
- `signature`: Format signature tag
- `sha256`: SHA-256 digest of fragment payload
- `entropy`: Shannon entropy score ($0.0 \le H \le 8.0$)
- `sequence`: Reconstruction sequence position index
- `confidence`: Fragment reliability score
- `reconstruction_status`: Current assignment status (`UNASSIGNED`, `RECONSTRUCTED`, `PARTIAL`, `FAILED`)
- `is_header`: Boolean flag indicating header signature presence (`\xFF\xD8\xFF`, `\x89PNG`, `%PDF-`)
- `is_footer`: Boolean flag indicating footer signature presence (`\xFF\xD9`, `IEND`, `%%EOF`)

---

## 2. Fragment Detection
Fragment detection ([`NonContiguousReconstructorEngine.detect_fragments_in_buffer`](file:///c:/Users/hayavadana/Desktop/Data_Recovery_Hackathon/hackathon_core/recovery/fragment_reconstructor.py#L45-L115)) operates deterministically:
1. Disk buffer is scanned in sector block steps (e.g., 512-byte blocks).
2. Zero-fill blocks (100% `0x00`) are skipped.
3. Contiguous non-zero block extents are accumulated into candidate byte chunks.
4. Each chunk is evaluated for header signatures, footer signatures, and format body markers (`SOF0`, `IHDR`, `stream`).
5. Shannon entropy is computed to verify non-zero entropy data.

---

## 3. Candidate Fragment Matching
Candidate matching groups detected fragments by file type (`JPEG`, `PNG`, `PDF`).

For a given header fragment $H$ at offset $O_H$:
1. The search space is bounded by the next header $O_{H_{next}}$ of the same type.
2. Candidate footers $F$ are filtered to those occurring at $O_H \le O_F < O_{H_{next}}$.
3. Candidate body fragments $B_i$ are filtered to those occurring within $O_H \le O_{B_i} < O_{H_{next}}$.

---

## 4. Ordering & Permutation Analysis
For each candidate set $(H, B_1, \dots, B_n, F)$:
1. Permutations of candidate body blocks are generated in chronological disk order.
2. Candidate sequence bytes are concatenated: $H \parallel B_1 \parallel \dots \parallel B_n \parallel F$.
3. Structural validation is performed on assembled candidate payload.
4. If a header fragment also contains its own footer (contiguous file), single-fragment assembly is assigned without duplicating blocks.

---

## 5. Confidence Calculation
Confidence is computed using deterministic evidence-derived scoring factors:
- `valid_header_signature`: +0.30 (Valid header magic bytes at start)
- `valid_footer_signature`: +0.30 (Valid footer magic bytes at end)
- `format_structural_marker`: +0.15 (Format-specific header marker found, e.g. JPEG `SOF0`, PNG `IHDR`, PDF `%PDF-`)
- `exact_boundary_match`: +0.15 (Header and footer bound sequence cleanly)
- `chronological_offset_order`: +0.10 (Fragment offsets are strictly increasing)

Status Assignment:
- `RECONSTRUCTED`: Confidence $\ge 0.70$ and structural validation passed.
- `PARTIAL`: Confidence $\ge 0.40$ but incomplete footer/body markers.
- `FAILED`: Confidence $< 0.40$ or structural validation failed.

---

## 6. Structural Validation
Reassembled payloads undergo format-specific structural checks:
- **JPEG**: Must start with `\xFF\xD8`, end with `\xFF\xD9`, and contain `SOF0`/`SOF2` frame header or `JFIF`/`Exif` APP markers.
- **PNG**: Must start with `\x89PNG\r\n\x1a\n`, contain `IHDR` chunk, and end with `IEND`.
- **PDF**: Must start with `%PDF-` and end with `%%EOF`.

---

## 7. Known Limitations & Unsupported Cases
- **Interleaved Fragment Cross-Stitching Across Formats**: Non-contiguous fragments interleaved with fragments of *different* file types are supported, but fragments of *identical* formats without distinct SOF/IHDR headers rely on chronological offset ordering.
- **Encrypted/Compressed Gaps**: Disjointed compressed stream fragments lacking internal markers depend on contiguous boundary extents.
- **File System Cluster Mapping**: File allocation table (FAT/NTFS) cluster chain hints, when available, are prioritized over brute-force permutation.
