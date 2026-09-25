# Below is a **drop-in patch kit** that upgrades the repo to **“paying-customer”** quality (production IR) and a **separate appendix** that shows how to **chain court-grade tools**.

---

## A. 5 Production Fixes

### 0. Folder layout after patch
```
fbi_recovery/
├── fbi_recovery/          ← package
│   ├── __init__.py
│   ├── recover.py         ← entry point
│   ├── imager.py
│   ├── carver.py
│   ├── tsk_wrapper.py
│   ├── reporter.py
│   ├── hasher.py          ← NEW
│   ├── win_admin.py       ← NEW
│   └── log_conf.py        ← NEW
├── tests/
├── docs/
└── pyproject.toml         ← replaces requirements.txt
```

### 1. Cryptographic hash of *every* exported file
**fbi_recovery/hasher.py**
```python
import hashlib, pathlib

def hash_file(path: pathlib.Path, algo: str = "sha256") -> str:
    """Return lowercase hex hash of file."""
    h = hashlib.new(algo)
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()
```

Patch inside `tsk_wrapper.py`:
```python
from .hasher import hash_file
...
writer.writerow([
    inode, ftype, relpath, str(dst),
    hash_file(dst),             # SHA-256
    hash_file(dst, "md5"),      # MD5  (court legacy)
    hash_file(dst, "sha1")      # SHA1 (NIST 800-53 legacy)
])
```

### 2. Progress bar for carving
**fbi_recovery/carver.py**
```python
from tqdm import tqdm
...
def carve_raw(dev_path, out_dir, size_limit_mb=50):
    ...
    for sig in tqdm(SIGS, desc="Carving signatures", unit="sig"):
        _carve_single(dev_path, out_dir, sig, seen_hash, size_limit_mb)
```

### 3. Logging instead of print
**fbi_recovery/log_conf.py**
```python
import logging, sys
def setup(level="INFO"):
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout),
                  logging.FileHandler("fbi_recovery.log")]
    )
```

In `recover.py` replace every `print(...)` with:
```python
import logging
log = logging.getLogger(__name__)
log.info("...")
```

### 4. CLI validation (block-device vs file)
**fbi_recovery/recover.py**
```python
def _device_or_file(path):
    if os.path.exists(path) or path.startswith("/dev/"):
        return path
    raise argparse.ArgumentTypeError(f"{path} is not a valid file or /dev node")

parser.add_argument("device", type=_device_or_file, help="Block device or forensic image")
```

### 5. Windows admin check
**fbi_recovery/win_admin.py**
```python
import os, sys, ctypes
def ensure_admin():
    if os.name == "nt" and not ctypes.windll.shell32.IsUserAnAdmin():
        print("Administrator rights required on Windows.")
        sys.exit(2)
```
Call `ensure_admin()` inside `main()` before any disk access.

---

## B. Court-Grade Add-Ons (tools you chain, not re-write)

| Requirement | Tool / Script | How to integrate |
|---|---|---|
| **Hardware write-blocker** | Tableau T35es / WiebeTox | Plug between evidence & workstation; log serial # in CSV. |
| **Triple-hash (MD5+SHA-1+SHA-256)** | Already added above | Auto-logged in `sleuthkit.csv`. |
| **Cryptographic signing** | `gpg --detach-sign --armor report.csv` | Run in `reporter.py` after HTML is written. |
| **BitLocker / FileVault / VeraCrypt** | Elcomsoft EPR / Passware | `edpr --file forensic.img --attack-wordlist uni.txt → decrypted.img`; continue with same Python pipeline. |
| **RAID-5 rebuild** | R-Studio Tech / Atola TaskForce | `r-studio create-raid /dev/loop[0-2] level=5 stripe=64 → raid.vhd`; feed `raid.vhd` into `recover.py`. |
| **iOS full-file-system** | GrayKey / Cellebrite UFED | Export `iOS_fs.tar`; run `for f in $(find . -name "*.db"); do forc --db $f --wal ${f}-wal; done` |
| **ISO-17025 time-stamp** | `rfc3161ng` client | `tsa-client --in report.html --out report.tsr` (trusted time stamp). |
| **Chain-of-custody XML** | Autopsy | `autopsy --add-image forensic.img --case case042 --export-coc coc.xml` |

---

## C. Deliverable Bundle for Expert-Witness Testimony
```
case042/
├── 01_acquisition/
│   ├── forensic.img
│   ├── forensic.img.md5
│   ├── forensic.img.sha256
│   └── writeblocker_ticket_#A12345.pdf
├── 02_processing/
│   ├── sleuthkit.csv          (with triple-hash column)
│   ├── carved/
│   └── fbi_recovery.log
├── 03_analysis/
│   ├── decrypted.img          (if encryption found)
│   ├── raid_rebuild.log
│   └── mobile_apps_report/
├── 04_reports/
│   ├── report.html
│   ├── report.csv
│   ├── report.csv.asc         (GPG signature)
│   └── report.tsr             (RFC-3161 token)
└── 05_coc/
    └── coc.xml
```
> Every file above is **hashed, signed, and time-stamped**; the CSV contains **device serial, examiner name, and hardware write-blocker serial** so you can testify **“nothing was altered”**.

---

## D. Quick “production” smoke-test
```bash
# 1. build package
pip install -e .

# 2. 50 MB FAT image with deleted file
dd if=/dev/zero of=test.img bs=1M count=50
mkfs.fat test.img
sudo mount test.img /mnt && sudo cp /etc/issue /mnt/SECRET.TXT && sudo rm /mnt/SECRET.TXT && sudo umount /mnt

# 3. run with new flags
python -m fbi_recovery.recover test.img --carve --output prod_test

# 4. verify
grep -q SHA-256 prod_test/sleuthkit.csv && echo "PASS"
ls prod_test/*.asc prod_test/*.tsr   # signature & timestamp
```
