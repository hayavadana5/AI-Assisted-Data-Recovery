# PROJECT_CONTEXT.md
**AI-Assisted Intelligent Data Recovery and Digital Evidence Reconstruction**
Audit performed on repository: `hayavadana5/Data_Recovery_Using_Python`
Audit stage: AUDIT → TEST → UNDERSTAND → DOCUMENT (no new features implemented)
Evidence used for all live testing: `test-stick.img` only.

---

## 1. Project Objective

Build an AI-assisted layer on top of an **existing** open-source forensic
recovery toolkit that already performs (or claims to perform) disk imaging,
SHA-256 hashing, Sleuth Kit–based deleted-file recovery, and signature-based
file carving. The hackathon layer must add, **without breaking the existing
deterministic recovery engine**:

1. Intelligent fragment reconstruction
2. Data integrity & corruption assessment
3. Classification & prioritization of recovered artifacts
4. Investigative decision support (dashboard, explanations, optional Gemini
   assistant)

This document is the factual baseline every later stage should build from.
Every claim below was verified by reading the actual source and by running
it — nothing here is taken from the README at face value.

---

## 2. Existing Architecture

The repository contains **two independent, parallel implementations** of the
same tool, not one project with a library and an app:

```
Data_Recovery_Using_Python/
├── fbi_recovery/                 # "Community" edition — flat scripts
│   ├── recover.py                # CLI entry point (script, not package)
│   ├── carver.py
│   ├── signatures.py
│   ├── utils.py                  # dd_image() + sha256
│   └── docs/{INSTALL.md, ERROR-RESOLVE.md}
├── fbi_recovery_enterprise/
│   ├── fbi_recovery/             # "Enterprise" edition — proper package
│   │   ├── __init__.py
│   │   ├── recover.py            # CLI entry point (fbi-recover console script)
│   │   ├── imager.py             # dd_image() + sha256 + progress bar + .sha256 file
│   │   ├── tsk_wrapper.py        # fls/icat wrapper + per-file hashing
│   │   ├── carver.py             # same carving algorithm as community edition
│   │   ├── signatures.py         # same 7 signatures, dataclass form
│   │   ├── hasher.py             # generic hash_file() helper
│   │   ├── reporter.py           # GPG-sign + RFC-3161 timestamp the CSV only
│   │   ├── log_conf.py           # logging setup
│   │   └── win_admin.py          # Windows elevation check
│   ├── pyproject.toml            # packaging + `fbi-recover` console script
│   └── docs/{README.md, INSTALLATION.md}
├── libewf/                       # EMPTY directory — dead, unused
├── recovery_20260115_033107/     # Leftover output from a PRIOR failed run
│   ├── forensic.img              # 52,428,800 bytes, all zero bytes
│   └── sleuthkit/sleuthkit.csv   # header row only, no data rows
├── requirements.txt              # unrelated Jupyter/dev-env pip freeze
├── test-stick.img                # 52,428,800 bytes, ENTIRELY zero bytes
└── README.md
```

There is **no shared library** between the two editions — `carver.py`,
`signatures.py`, and the imaging/hashing logic are duplicated with only
cosmetic differences (type hints, `pathlib.Path` vs `str`, dataclass vs
plain class). The core algorithms and their bugs are byte-for-byte identical
in both editions.

---

## 3. Existing Modules

| Module | Edition | Verified purpose |
|---|---|---|
| `recover.py` | both | CLI entry point; orchestrates imaging → TSK extraction → carving → (enterprise only) sign/stamp |
| `utils.py` / `imager.py` | both | `dd`-based bit copy + SHA-256 of the resulting image. Enterprise adds a progress bar and writes `<img>.sha256` to disk; community only prints the hash. |
| `carver.py` | both | Signature-based raw carving over 512 KB chunks |
| `signatures.py` | both | 7 hard-coded signatures (see §12) |
| `tsk_wrapper.py` (enterprise) / inline function in community `recover.py` | both | Runs `fls -r -d` to list deleted entries, then `icat` to export each one; enterprise adds SHA-256/MD5/SHA-1 per exported file |
| `hasher.py` (enterprise) | enterprise | Generic streaming file hasher, reused by `tsk_wrapper.py` |
| `reporter.py` (enterprise) | enterprise | **Not a report generator.** Only GPG-signs and RFC-3161 timestamps the existing `sleuthkit.csv`. No HTML/CSV/PDF summary is produced anywhere in the codebase. |
| `log_conf.py` (enterprise) | enterprise | `logging` setup, console + file handler |
| `win_admin.py` (enterprise) | enterprise | Refuses to run on Windows unless elevated |
| `libewf/` | — | Empty directory; remnant of an abandoned `libewf`/E01 build attempt described (and then reversed) in `fbi_recovery/docs/ERROR-RESOLVE.md`. Not imported or referenced by any code. |

---

## 4. Existing Functionality (What Actually Works, Verified)

Confirmed working, with evidence:

- **Imaging (`dd`) + whole-image SHA-256** — works correctly in both
  editions. Enterprise persists the hash to `forensic.img.sha256`;
  community only prints it to stdout and never writes it to disk.
- **Raw signature carving, single-match-per-file-type case** — works
  correctly *only* for the first match of each signature type per scan.
  Verified: a synthetic image containing one JPEG was carved successfully,
  byte-exact, with the footer trimmed correctly, and the byte offset
  correctly encoded in the filename.
- **Whole-file per-artifact hashing (enterprise `hasher.py`)** — correct in
  isolation, but never actually exercised in practice because the step
  that calls it (`icat` export) fails 100% of the time (see §10, Bug #1).

Confirmed **broken or absent**, with evidence (see §10 for full detail):

- **Deleted-file recovery via Sleuth Kit (`fls`/`icat`)** — 100% failure
  rate in both editions due to an inode-parsing bug. No deleted file has
  ever been successfully exported by this codebase, including in the
  pre-existing `recovery_20260115_033107/` run left in the repo.
- **Carving of multiple instances of the same file type in one image** —
  broken by a file-cursor desynchronization bug; only the first match per
  signature is ever found, even when more valid matches exist later in the
  same file/image.
- **HTML report generation** — does not exist anywhere in the code, despite
  being shown in the README's "Quick Peek" and output-tree diagram.
- **`.docx` extraction** — never produces output; see §10 Bug #6.
- **EWF/E01 image support** — not implemented; `libewf/` is dead code.

---

## 5. Actual Execution Instructions (Verified, Not From README)

### Environment setup that was actually required to run this project
The README/docs are optimistic about zero-friction setup. In a clean
Ubuntu 24.04 container, the following had to be installed manually before
anything would run:
```bash
apt-get install -y sleuthkit dosfstools foremost   # fls, icat, mkfs.fat, foremost binaries
pip install tqdm rich --break-system-packages       # enterprise edition's only real deps
```
`pytsk3` (listed in `requirements.txt` and in `docs/ERROR-RESOLVE.md`) is
**never imported by any source file** — TSK is invoked exclusively via
`subprocess` calls to the `fls`/`icat` command-line binaries, not via Python
bindings. Installing `pytsk3` is unnecessary for this codebase as it stands.

### Community edition
Must be run **from inside** `fbi_recovery/` because its imports
(`from utils import dd_image`, `from carver import carve_raw`) are
same-directory imports, not package-relative:
```bash
cd fbi_recovery
python3 recover.py <device_or_image> [-o OUTPUT_DIR] [--image] [--carve]
```

### Enterprise edition
Proper package; can be run as a module or installed as a console script:
```bash
cd fbi_recovery_enterprise
python3 -m fbi_recovery.recover <device_or_image> [-o OUTPUT_DIR] [--image] [--carve] [-v]
# or, after `pip install -e .`:
fbi-recover <device_or_image> [-o OUTPUT_DIR] [--image] [--carve] [-v]
```

### Exact commands run during this audit (all against `test-stick.img` only)
```bash
# 1. README's documented "quick scan" command, verbatim intent, against the provided evidence
python3 fbi_recovery/recover.py test-stick.img
# → CRASHES: "Cannot determine file system type" / unhandled CalledProcessError, exit code 1

# 2. Full imaging + carving, community edition
python3 fbi_recovery/recover.py test-stick.img --image --carve -o run1
# → Imaging + hashing succeed; TSK step crashes the same way; carving never runs
#   because the crash happens before the --carve branch is reached.

# 3. Carving engine in isolation (no CLI crash to work around)
python3 -c "from carver import carve_raw; carve_raw('test-stick.img', 'out', size_limit_mb=50)"
# → Runs cleanly, 0 files produced (test-stick.img contains no byte patterns at all)
```
Because `test-stick.img` as shipped contains no filesystem and no file
signatures (see §7), a second, clearly-separate **synthetic verification
image** (`synthetic_verification.img`, built locally with `mtools`/`dd`,
**not** part of the case evidence, containing only dummy placeholder bytes)
was used strictly to confirm whether the code paths function at all when
given real content. That image is not evidence and was not carried forward
as a result; it only served to isolate bugs in the code itself. All
findings about `test-stick.img` itself in §7–§10 come from `test-stick.img`
directly.

---

## 6. Actual Recovery Pipeline (Code-Verified, Not README's Diagram)

The README shows: `Image → Hash → SleuthKit → Carve → Report`. What the code
actually does:

```
argparse: device, -o, --image, --carve[, -v]
        │
        ├─ if --image OR device is not an existing file:
        │      dd copy device → out/forensic.img
        │      sha256(out/forensic.img)
        │         community: printed to stdout only
        │         enterprise: also written to out/forensic.img.sha256, logged
        │      device := out/forensic.img
        │
        ├─ UNCONDITIONALLY (no flag controls this):
        │      fls -r -d <device>            (list deleted entries)
        │      for each deleted entry:
        │          icat <device> <inode>  →  out/sleuthkit/<relpath>
        │          write row to out/sleuthkit/sleuthkit.csv
        │      [BUG: inode field mis-parsed, icat always fails — §10 Bug #1]
        │      [community: any fls/icat failure that raises is UNCAUGHT and
        │       kills the whole program here, before carving ever runs]
        │
        ├─ if --carve:
        │      for each of 7 signatures:
        │          scan device in 512 KB chunks for header bytes
        │          on match: seek to offset, read up to max_size (or to footer)
        │          dedupe by SHA-256 of extracted bytes (across ALL signatures)
        │          write out/carved/<SIG>_<10-digit offset>.<ext>
        │      [BUG: reading up to max_size desyncs the chunk offset tracker
        │       from the real file cursor — §10 Bug #2]
        │
        └─ enterprise only:
               gpg --detach-sign --armor out/sleuthkit/sleuthkit.csv
               tsa-client --in ... --out ...
               [BUG: any gpg/tsa-client failure other than "not installed"
                is UNCAUGHT and crashes here — §10 Bug #4]

No report.html, no consolidated JSON/CSV manifest of results, and no
fragment/integrity/classification step exists anywhere in this pipeline.
```

### Inputs
- A raw block device path (`/dev/sdX`) or an existing disk-image file.
  Only `test-stick.img` was used in this audit, per instructions.

### Intermediate files
- `out/forensic.img` — bit-for-bit image (only created if `--image` or the
  source wasn't already a file).
- In-memory 512 KB read chunks during carving (not persisted).

### Output files (as actually produced, verified)
```
<output_dir>/
├── forensic.img                 # only if --image used or source wasn't a file
├── forensic.img.sha256          # enterprise only
├── sleuthkit/
│   └── sleuthkit.csv            # community: 4 columns; enterprise: 7 columns
│                                 # (in practice: always empty of real data —
│                                 #  every row says exported/FAILED, see §10)
├── sleuthkit/<name>              # 0-byte stub files left behind by failed icat calls
└── carved/
    └── <SIGNAME>_<10-digit-offset>.<ext>   # only if --carve, only first match per type
```
No `report.html`, no `.csv.asc`, no `.csv.tsr` were ever actually produced
in any run performed during this audit (the GPG/timestamp step always
crashed before producing its outputs on this machine — see §10 Bug #4).

---

## 7. Test Evidence Details

`test-stick.img`:
- Size: 52,428,800 bytes (50 MiB), matches docs' description.
- Content: **verified 100% null bytes** — no partition table, no FAT
  filesystem, no file signatures of any kind. `file test-stick.img` reports
  generic `data`.
- SHA-256 (original, unmodified throughout this entire audit):
  `8565a714dca840f8652c5bae9249ab05f5fb5a4f9f13fbe23304b10f68252da2`
- This directly contradicts `fbi_recovery/docs/ERROR-RESOLVE.md`, which
  describes creating this exact file via `mkfs.fat` + mounting + copying
  and deleting `/etc/passwd` as `secret.txt`. Whatever image was originally
  built that way was not the file committed to the repository, or the
  filesystem-creation step silently failed/was skipped before commit.
- Practical consequence: **no deleted file and no carve-able artifact can
  be recovered from the evidence file as shipped**, regardless of whether
  the code is correct. This is a property of the sample data, not (only)
  of the code — but it also means the two verified code bugs (§10 #1, #2)
  could not have been discovered by simply running the tool against
  `test-stick.img` and reading the output; they required direct code
  reading and controlled unit-level tests of `carver.py`/the inode-parsing
  logic.

`recovery_20260115_033107/` (pre-existing in the repo, not produced by this
audit): its `forensic.img` is also exactly 52,428,800 bytes of all-zero
data, and its `sleuthkit.csv` contains only the 4-column community-edition
header with zero data rows. This is independent, pre-existing evidence that
a previous real run of the community tool hit the exact same TSK crash
documented in §10 Bug #1/#3.

---

## 8. Important Functions / Classes / Data Structures

| Name | File | Notes |
|---|---|---|
| `main()` | `recover.py` (both) | CLI orchestration; **no try/except around the TSK step** in community edition |
| `dd_image(src, dst, block)` | `utils.py` / `imager.py` | Returns/writes SHA-256; correct and reusable as-is |
| `sleuthkit_extract(image, out_dir)` | community `recover.py` / enterprise `tsk_wrapper.py` | Contains the inode-parsing bug (§10 #1) |
| `carve_raw(dev_path, out_dir, size_limit_mb=50)` | `carver.py` (both) | Top-level per-signature loop |
| `_carve_single(path, out_dir, sig, seen_hash, limit_mb)` | `carver.py` (both) | Contains the cursor-desync bug (§10 #2); `seen_hash` is a **cross-signature, whole-scan** dedupe set — root cause of §10 #6 |
| `class Sig` | `signatures.py` (both) | `name, ext, header, footer, max_size` — no offset/confidence/fragment fields exist |
| `SIGS` | `signatures.py` (both) | List of 7 `Sig` instances — see §12 |
| `hash_file(path, algo)` | `hasher.py` (enterprise) | Generic, correct, reusable |
| `sign_and_stamp(csv_path)` | `reporter.py` (enterprise) | Only catches `FileNotFoundError`, not `CalledProcessError` (§10 #4) |
| `setup(level, log_file)` | `log_conf.py` (enterprise) | `log_file` default is CWD-relative, not case-output-relative (§10 #8) |

There is no manifest/database data structure anywhere — carving results
exist only as files on disk named by convention; TSK results exist only as
CSV rows.

---

## 9. Metadata Available Today

- **Carved files:** byte offset (encoded in filename only, not in a
  sidecar record), signature name, extension, whole-file SHA-256 (used
  internally for dedupe, not written out anywhere for the user). **No**
  fragment id, **no** confidence/validity score, **no** partial/corrupted
  flag, **no** timestamp.
- **TSK/deleted-file path:** inode number (as reported by `fls`), file vs.
  directory type flag, original path, export destination, plus SHA-256/
  MD5/SHA-1 in the enterprise edition — but this entire path has a 100%
  failure rate currently (§10 #1), so in practice **no real metadata is
  ever produced by it**.
- **Image-level:** whole-image SHA-256 (works correctly).
- Nothing tracks fragment boundaries, adjacency, ordering, or relationships
  between artifacts. This is a completely greenfield area for the
  hackathon's Requirement 1.

---

## 10. Bugs Discovered (All Reproduced, With Evidence)

1. **CRITICAL — TSK inode-parsing bug (both editions, identical code).**
   `inode = parts[1].split(':')[0]` reads the **filename** field of `fls`
   output instead of the **inode** field (`parts[0]`). Every `icat` call
   fails with `Invalid inode address: <filename>`. Verified via raw `fls`
   output inspection and reproduced against two different images (a
   synthetic FAT image with two files, and the pre-existing
   `recovery_20260115_033107/` artifact). **Deleted-file recovery has never
   worked in this codebase.**
2. **CRITICAL — Carving file-cursor desync.** After any signature match,
   `_carve_single` does `f.read(min(sig.max_size, limit_mb*MB))`, which is
   typically tens of MB — far larger than the actual matched artifact —
   advancing the real file cursor to EOF (or a distant position) that the
   `offset` counter (incremented only by a fixed 512 KB per outer-loop
   iteration) never accounts for. **Verified experimentally:** a 2 MB test
   file containing two independent, valid JPEG images (with correct
   headers and footers) at different offsets yielded only the **first**
   JPEG; the second, fully valid one, was never found. This means the
   carving engine cannot currently be relied on to find more than one
   instance of a given file type per image — a direct obstacle to the
   hackathon's fragment-reconstruction goal, which assumes multiple
   fragments can even be located.
3. **HIGH — Uncaught crash propagation (community edition).** `recover.py`
   has no error handling around the TSK step. Because of Bug #1 (and
   because `test-stick.img` has no filesystem at all), running the
   README's own documented "quick scan" command against the provided
   evidence file crashes with an unhandled traceback and exit code 1,
   **before carving ever runs**, even when `--carve` is passed.
4. **HIGH — Enterprise `reporter.sign_and_stamp` uncaught crash.** Only
   `FileNotFoundError` is caught for `gpg`/`tsa-client`; a
   `subprocess.CalledProcessError` (e.g., `gpg` installed but no secret key
   configured — the common case on a fresh machine) is not, so the entire
   run crashes at the very last step, immediately after imaging and
   carving have already completed successfully. Reproduced twice.
5. **MEDIUM — Signature count mismatch.** README and both docs claim
   "40+ file types" / "40+ file headers/footers". The actual
   `signatures.py` (identical in both editions) defines exactly **7**
   signatures.
6. **MEDIUM — DOCX extraction is silently dead code.** `ZIP` and `DOCX`
   share an identical header, no footer, and the same `max_size`, so they
   always extract byte-identical data at a given offset. Because the
   dedupe set (`seen_hash`) is shared **across all signature types** in one
   scan, and `ZIP` is processed before `DOCX` in `SIGS`, the DOCX entry is
   always discarded as a "duplicate." **A `.docx` file has never been, and
   currently cannot be, produced by this carver**, regardless of the
   underlying data — contradicting the code comment "same header, filtered
   later," which describes filtering logic that does not exist. Verified
   experimentally.
7. **MEDIUM — `report.html` does not exist.** No HTML/PDF/consolidated
   summary generator exists anywhere in either edition's source, despite
   being shown in the README's "Quick Peek" example and output-tree
   diagram. `reporter.py` (enterprise-only) does GPG signing/timestamping
   of the raw CSV and nothing else.
8. **LOW — Log file location bug.** `log_conf.py`'s default `log_file`
   (`"fbi_recovery.log"`) is relative to the current working directory,
   not to the case output directory (`-o`). Verified: running the tool
   from inside the source tree wrote the log file directly into the
   package source directory instead of alongside the rest of the case
   evidence — a chain-of-custody/organizational problem for real casework.
9. **LOW — `requirements.txt` is unrelated to the project.** It is a
   generic JupyterLab/dev-container `pip freeze`, not this project's
   dependency list. The project's real dependencies (per
   `fbi_recovery_enterprise/pyproject.toml`) are only `tqdm` and `rich`,
   plus the system binaries `dd`, `fls`, `icat`, and optionally `gpg`/
   `tsa-client`. `pytsk3`, listed in `requirements.txt`, is never imported
   anywhere.
10. **LOW — README badge/clone URL points to a different GitHub account**
    (`alok-kumar8765`) than the actual repository owner (`hayavadana5`);
    no `.github/workflows` exist at all, so the CI badge is permanently
    broken/misleading.
11. **LOW — `libewf/` is dead, empty code.** Left over from an abandoned
    build attempt documented in `fbi_recovery/docs/ERROR-RESOLVE.md`; not
    referenced by any source file. EWF/E01 support does not exist.
12. **LOW — No tests exist anywhere**, despite the README's Contributing
    section asking PR authors to "add a test case under tests/," and
    despite the enterprise docs showing a `tests/` folder in their own
    "folder layout after patch" diagram.

---

## 11. Existing Tests

**None.** No `tests/` directory, no test files, no CI workflow exist
anywhere in the repository, in either edition, despite both the top-level
README and the enterprise docs referencing tests that were never actually
added.

---

## 12. Current Limitations (Beyond the Bugs)

- Only 7 file signatures are defined: JPEG, PNG, PDF, ZIP, DOCX (dead,
  see Bug #6), MP4, WAV. No TXT, no Office-legacy formats, no generic
  binary/entropy-based detection.
- Carving only recognizes **contiguous** header→footer (or header→cap)
  spans; there is no concept of a fragmented/discontiguous file at all,
  even before considering Bug #2.
- No database or manifest — every consumer of results (a future
  classifier, dashboard, or API) would currently have to re-parse CSV
  files and re-derive metadata from carved filenames.
- No encryption, RAID, SSD-TRIM, or mobile-extraction handling of any
  kind (this is explicitly and correctly disclosed in the docs).
- Two duplicated codebases (community vs. enterprise) must currently be
  kept in sync manually; there is no shared package.

---

## 13. Missing Hackathon Requirements (Summary Table)

| Requirement | Existing support | Reusable component | Missing work |
|---|---|---|---|
| **1. Intelligent Fragment Reconstruction** | None. Carver extracts one contiguous span per match; Bug #2 prevents even finding multiple same-type matches in one image. | Byte offset is already computed per match (currently only encoded in filenames) — a starting point for a fragment index. Chunked file-reading loop structure in `carver.py` is a base to extend. | Fix Bug #2 first. Then: fragment feature extraction, fragment-to-fragment matching, ordering heuristics, and an actual reconstruction algorithm — all currently absent. |
| **2. Data Integrity & Corruption Assessment** | None. No entropy analysis, no structural validation (e.g., valid JPEG marker sequence, valid ZIP central directory), no partial/corrupted flag. | `hasher.py` / `utils.py` hashing helpers are correct and reusable as integrity-check building blocks. Whole-image SHA-256 gives an image-level integrity anchor. | Per-artifact structural validation, an intact/corrupted/partial classification, a transparent confidence/integrity score, and surfacing logic. |
| **3. Classification & Prioritization** | None beyond the signature name/extension assigned at carve time, and TSK's raw file/dir type flag. | Signature/extension metadata from carving is a usable first classification feature. | An actual classifier (rule-based to start), a priority/value score, and human-readable explanations tied to specific evidence. |
| **4. Investigative Decision Support** | None — CLI only, print/log statements, no dashboard, no unified summary, no natural-language assistant. | `sleuthkit.csv` and `carved/` are a base "results source"; enterprise's structured logging is a base for a status/audit trail. | A unified case manifest joining carving + TSK + hashing + classification results; a FastAPI layer; a React dashboard; a Gemini-based Q&A layer that only reads derived summaries, never raw evidence. |

---

## 14. Recommended Extension Points (Do Not Implement Yet)

| Future capability | Where it should hook in, and why |
|---|---|
| Fragment feature extraction | New module (e.g. `fragments/features.py`), run **after** `carve_raw` — but only after Bug #2 (cursor desync) is fixed, since that bug currently causes whole regions of an image to be silently skipped for a given signature type. |
| Fragment matching | New module (e.g. `fragments/matcher.py`), consuming carved output plus a new "unclaimed byte ranges" pass over the image (a capability that doesn't exist yet — the current carver never records what it *didn't* match). |
| Fragment reconstruction | New module (e.g. `fragments/reconstruct.py`), downstream of the matcher. Should write to a **new** `reconstructed/` output folder — never overwrite or replace `carved/`. |
| Integrity analysis / corruption detection | New module (e.g. `integrity/`), operating **read-only** on files already written to `carved/`/`sleuthkit/` — must never touch `forensic.img` or the original evidence. |
| Artifact classification & prioritization | New module (e.g. `classify/`), consuming a unified manifest (see storage, below) rather than re-parsing CSVs/filenames directly. |
| Evidence relationship graph | New module (e.g. `graph/`), built from the manifest plus fragment-matcher output. |
| Database / storage | Introduce one manifest (SQLite or JSON) that both carving and TSK results feed into, replacing scattered CSV files and filename-encoded metadata as the single source of truth for everything downstream. This should wrap the existing pipeline, not replace it. |
| FastAPI API | New top-level `api/` package with **read-only** endpoints over the manifest. Should never be able to trigger writes to evidence. |
| React dashboard | Separate `dashboard/`/`frontend/` project, talking only to the FastAPI layer. |
| Gemini investigator assistant | New module (e.g. `assistant/gemini_client.py`), fed only manifest/derived summaries — never raw evidence bytes — and clearly labeled as AI-derived, separate from deterministic findings. |
| Final reporting | New `reporting/` module generating the HTML/PDF case summary the README always claimed existed. Keep it separate from enterprise's existing `reporter.py`, which should keep its narrower job (GPG signing/timestamping) — don't overload it. |

---

## 15. Recommended Implementation Order

0. **Pick one canonical codebase** (recommend `fbi_recovery_enterprise`,
   since it already has proper packaging, structured logging, and per-file
   hashing) and treat `fbi_recovery/` as a frozen reference/legacy copy, to
   avoid double-maintaining two near-identical, independently-buggy trees.
1. **Fix the two verified core bugs** before building anything new on top
   of them: the TSK inode-parsing bug (§10 #1) and the carving cursor
   desync (§10 #2). New features built on broken primitives will inherit
   silent data loss.
2. **Introduce a unified case manifest/storage layer** (SQLite or JSON)
   that both carving and TSK results feed into, replacing today's
   ad hoc CSVs and filename-encoded metadata.
3. **Build integrity/corruption assessment** on top of manifest entries
   (deterministic, read-only, testable independently).
4. **Build fragment feature extraction → matching → reconstruction**
   (deterministic; depends on the fixed carver and the manifest).
5. **Build classification/prioritization** (rule-based first, explainable)
   on top of the manifest, integrity results, and fragment results.
6. **Build the FastAPI layer** as a read-only view over the manifest.
7. **Build the React dashboard** against that API.
8. **Add the Gemini investigator assistant last**, reading only from the
   manifest/derived summaries, never raw evidence — see "DO NOT BREAK"
   below.
9. **Build the final HTML/PDF reporting pass**, consuming everything
   above — this is also where the README's long-promised (but never
   implemented) `report.html` finally gets built for real.

---

## 16. Files That Should Be Modified Later (Bug Fixes / Extension Targets)

- `fbi_recovery_enterprise/fbi_recovery/tsk_wrapper.py` (and the equivalent
  inline function in `fbi_recovery/recover.py`) — fix the inode-parsing bug.
- `fbi_recovery_enterprise/fbi_recovery/carver.py` (and
  `fbi_recovery/carver.py`) — fix the cursor-desync bug; later, add the
  fragment-feature-extraction hook.
- `fbi_recovery_enterprise/fbi_recovery/reporter.py` — fix the uncaught
  `CalledProcessError`; keep its scope narrow (signing/stamping) rather
  than overloading it with new report-generation logic.
- `fbi_recovery_enterprise/fbi_recovery/log_conf.py` — fix the log path to
  be case-output-relative, not CWD-relative.
- `recover.py` (both editions) — add error handling around the TSK step so
  a TSK failure doesn't abort carving; add orchestration hooks for the new
  manifest/fragment/integrity/classification stages as they're built.

### Files That Should Remain Untouched (Working, Don't Rewrite for Its Own Sake)
- `fbi_recovery_enterprise/fbi_recovery/imager.py` — imaging + hashing is
  correct and reliable, verified.
- `fbi_recovery_enterprise/fbi_recovery/hasher.py` — correct, reusable.
- `fbi_recovery/utils.py` — `dd_image()` is correct.
- `fbi_recovery_enterprise/fbi_recovery/win_admin.py` — fine as-is.
- `signatures.py` (both) — extend by **adding** entries, don't rewrite the
  structure.
- `test-stick.img` — **never write to this file.** It should also be kept
  as-is (all-zero) as a known "no-signal" regression fixture, distinct from
  any richer synthetic test images the team builds going forward.
- `recovery_20260115_033107/` — keep as a historical fixture/proof of Bug
  #1/#3; do not delete or "fix" it retroactively.

Flagged for the team to decide on (not touched by this audit): `libewf/`
(dead, empty — candidate for removal) and `requirements.txt` (unrelated to
the project — candidate for replacement with the real dependency list from
`pyproject.toml`).

---

## DO NOT BREAK

- **Never modify original evidence.** `test-stick.img` must never be
  written to, mounted read-write, or altered in any way.
- **Work read-only on evidence.** All new analysis (integrity, fragment
  matching, classification) must read from `forensic.img`/`carved/`/
  `sleuthkit/` outputs, never from the source evidence directly in a
  write-capable mode.
- **Preserve existing forensic recovery functionality.** Bug fixes to
  `tsk_wrapper.py`/`carver.py` should fix the identified defects without
  changing their fundamental external behavior/output format in ways that
  would break scripts or tests already depending on it.
- **Reuse the existing carver.** Don't replace `carve_raw`/`_carve_single`
  wholesale; fix the desync bug in place and extend it for fragment
  awareness rather than writing a parallel carving engine.
- **Do not unnecessarily rewrite working modules.** `imager.py`,
  `hasher.py`, and `utils.py` are correct — leave them alone.
- **Keep deterministic recovery separate from AI.** Carving, hashing, TSK
  extraction, integrity checks, and classification logic must remain
  deterministic, testable, and independent of any LLM call.
- **AI must not invent forensic findings.** The Gemini assistant may only
  summarize, explain, or answer questions about data that the
  deterministic pipeline already produced and recorded in the manifest —
  it must never fabricate recovered content, hashes, offsets, or
  classifications.
- **AI must not modify evidence.** No AI-driven component may write to
  `forensic.img`, the original evidence, or any file under `sleuthkit/`/
  `carved/` produced by the deterministic pipeline.
- **Every new feature should have tests.** The current repository has
  zero tests; every new module introduced from this point forward should
  break that pattern, not continue it.
- **Avoid unnecessary microservices and infrastructure.** A single FastAPI
  service and a single manifest store are sufficient for a 12-hour
  hackathon scope; do not introduce message queues, multiple databases, or
  distributed services.

---

*Document generated by the AUDIT → TEST → UNDERSTAND → DOCUMENT stage.
No source files in the repository were modified. No new features
(fragment reconstruction, integrity scoring, classification, FastAPI,
React, or Gemini integration) were implemented as part of this stage.*
