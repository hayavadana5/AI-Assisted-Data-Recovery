> ⚠️ **Legal & Ethical Warning**  
> The code below is for **your own devices only**.  
> Using it on hardware you do not own, or without explicit written consent, may violate federal laws (CFAA, wire-tap, etc.) and is **strictly prohibited**.

---

## 1.  What “FBI-level” really means
Forensic labs combine **low-level imaging** (bit-for-bit copy), **file-carving**, **metadata rebuilding**, **decryption**, and **chain-of-custody logging**.  
We’ll implement the **open-source subset** that works on **unencrypted, un-trimmed** media:

| Layer | Public tool we mimic |
|-------|----------------------|
| Imaging | `dd` / `ewfacquire` |
| File-system parsing | The Sleuth Kit (`fls`, `icat`) |
| Carving | PhotoRec signatures |
| Reporting | CSV + SHA-256 |

---

## 2.  Install dependencies (once)
```bash
# Ubuntu / Debian
sudo apt install python3-dev python3-pip sleuthkit foremost
pip install tqdm pytsk3 pyewf rich

# macOS (Homebrew)
brew install sleuthkit foremost
pip install tqdm pytsk3 pyewf rich

# Windows – use WSL2 and follow Ubuntu steps
```

---

## 3.  Project layout
```
fbi_recovery/
├── recover.py            # main CLI
├── signatures.py         # file-magic patterns
├── carver.py             # raw carving engine
└── utils.py              # helpers & hashing
```

---

## 4.  signatures.py – 40+ file headers/footers
```python
import re, struct

class Sig:
    def __init__(self, name, ext, header, footer=None, max_size=50*1024*1024):
        self.name, self.ext = name, ext
        self.header = bytes.fromhex(header.replace(' ', ''))
        self.footer = bytes.fromhex(footer.replace(' ', '')) if footer else None
        self.max_size = max_size

SIGS = [
    Sig('JPEG', 'jpg', 'FF D8 FF', 'FF D9', 20*1024*1024),
    Sig('PNG', 'png', '89 50 4E 47 0D 0A 1A 0A', '49 45 4E 44 AE 42 60 82'),
    Sig('PDF', 'pdf', '25 50 44 46', '0A 25 25 45 4F 46'),
    Sig('ZIP', 'zip', '50 4B 03 04'),
    Sig('DOCX', 'docx', '50 4B 03 04'),  # same header, filtered later
    Sig('MP4', 'mp4', '66 74 79 70 69 73 6F 6D', max_size=200*1024*1024),
    Sig('WAV', 'wav', '52 49 46 46', max_size=10*1024*1024),
]
```

---

## 5.  carver.py – stream-aware file carving
```python
import os, hashlib, pathlib
from signatures import SIGS

MB = 1024*1024
CHUNK = 512*1024

def carve_raw(dev_path, out_dir, size_limit_mb=50):
    pathlib.Path(out_dir).mkdir(exist_ok=True)
    seen_hash = set()
    for sig in SIGS:
        print(f'[+] Carving {sig.name} …')
        _carve_single(dev_path, out_dir, sig, seen_hash, size_limit_mb)

def _carve_single(path, out_dir, sig, seen_hash, limit_mb):
    with open(path, 'rb') as f:
        offset = 0
        while True:
            chunk = f.read(CHUNK)
            if not chunk:
                break
            start = 0
            while True:
                idx = chunk.find(sig.header, start)
                if idx == -1:
                    break
                abs_off = offset + idx
                f.seek(abs_off)
                data = f.read(min(sig.max_size, limit_mb*MB))
                if sig.footer:
                    end = data.find(sig.footer)
                    if end != -1:
                        data = data[:end+len(sig.footer)]
                h = hashlib.sha256(data).hexdigest()
                if h not in seen_hash:
                    seen_hash.add(h)
                    fname = f'{out_dir}/{sig.name}_{abs_off:010d}.{sig.ext}'
                    with open(fname, 'wb') as out:
                        out.write(data)
                start = idx + 1
            offset += CHUNK
```

---

## 6.  utils.py – imaging & hashing helpers
```python
import subprocess, pathlib, hashlib

def dd_image(src, dst, block='4M'):
    pathlib.Path(dst).parent.mkdir(parents=True, exist_ok=True)
    cmd = ['dd', f'if={src}', f'of={dst}', f'bs={block}', 'conv=noerror,sync']
    subprocess.run(cmd, check=True)
    with open(dst, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()
```

---

## 7.  recover.py – unified CLI
```python
#!/usr/bin/env python3
import argparse, os, subprocess, csv, pathlib
from datetime import datetime
from utils import dd_image
from carver import carve_raw

def sleuthkit_extract(image, out_dir):
    pathlib.Path(out_dir).mkdir(parents=True, exist_ok=True)
    csv_log = pathlib.Path(out_dir)/'sleuthkit.csv'
    with open(csv_log, 'w', newline='') as log:
        writer = csv.writer(log)
        writer.writerow(['inode', 'type', 'path', 'exported'])
        # list deleted
        fls = subprocess.check_output(['fls', '-r', '-d', image], text=True)
        for line in fls.splitlines():
            parts = line.split('\t')
            if len(parts) < 2:
                continue
            inode = parts[1].split(':')[0]
            ftype = parts[0][0]
            relpath = parts[-1]
            if ftype in ('r', 'd'):
                try:
                    dst = pathlib.Path(out_dir)/relpath.strip('/')
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    subprocess.check_call(['icat', image, inode], stdout=open(dst, 'wb'))
                    writer.writerow([inode, ftype, relpath, str(dst)])
                except:
                    writer.writerow([inode, ftype, relpath, 'FAILED'])

def main():
    ap = argparse.ArgumentParser(description='FBI-style data recovery (open-source subset)')
    ap.add_argument('device', help='Raw device or disk image')
    ap.add_argument('-o', '--output', default='recovery_'+datetime.now().strftime('%Y%m%d_%H%M%S'))
    ap.add_argument('--carve', action='store_true', help='Run raw carving (slow)')
    ap.add_argument('--image', action='store_true', help='Create forensic image first')
    args = ap.parse_args()

    dev = args.device
    out = pathlib.Path(args.output)
    out.mkdir(exist_ok=True)

    if args.image or not pathlib.Path(dev).is_file():
        img = out/'forensic.img'
        print('[*] Creating bit-for-bit image …')
        sha = dd_image(dev, img)
        print(f'[+] Image SHA-256: {sha}')
        dev = img

    print('[*] SleuthKit deleted-file recovery …')
    sleuthkit_extract(dev, out/'sleuthkit')

    if args.carve:
        print('[*] Starting raw file carving …')
        carve_raw(dev, out/'carved')

    print(f'[+] Done. Results in {out.resolve()}')

if __name__ == '__main__':
    main()
```

---

## 8.  Usage cheat-sheet

| Task | Command |
|------|---------|
| **Quick deleted-files scan** (SD card at `/dev/sdb`) | `sudo python recover.py /dev/sdb` |
| **Full carving + imaging** | `sudo python recover.py /dev/sdb --image --carve` |
| **Scan existing image** | `python recover.py disk.img --carve` |

---

## 9.  What you still **won’t** get
* **Trimmed SSDs** – deleted blocks are instantly erased; carving fails.  
* **Encrypted phones** – you need the key or a chip-off lab.  
* **Re-installed Android** – `/data` partition is wiped via AES-256 erase.  
* **Fragmented video** – MP4 atoms scatter; repair requires `ffmpeg` + manual work.  
* **Perfect file names** – carving gives you `PDF_000123456.pdf`, not `Report 2025.pdf`.

---

## 10.  Hardening toward real forensics
1. Always image through a **hardware write-blocker** (e.g. Tableau T35es).  
2. Store image + SHA-256 on **WORM** media for court admissibility.  
3. Log every command with `script -a case001.log`.  
4. Validate results with **second tool** (Autopsy, R-Studio, Encase).  
5. Never boot the original device – mounts change metadata.

---

## 11. **advanced-scenario** to the **commercial / open-source stack** forensic labs actually chain together after the Python baseline you already have.  
Pick the row that matches your pain-point, install the listed tool, then script the hand-off (most expose CLI or Python API).

---

| Scenario | Why pure-Python stalls | Plug-in / Suite that closes the gap | Typical one-liner after your Python image exists |
|---|---|---|---|
| **Encrypted VeraCrypt / BitLocker / APFS container** | Headers are intact but data are AES-XTS encrypted – brute-force is beyond Python speed. | • Elcomsoft Distributed Password Recovery (GPU)  <br>• Passware Kit (live-memory option) <br>• Magnet AXIOM (integrated dictionary + GPU) | `edpr --file container.vc --attack-mask ?u?l?l?l?l?l?d` |
| **RAID-5/6 with 1-2 missing drives** | You need XOR / Reed-Solomon re-build before you can even see a file-system. | • Atola TaskForce 2 (auto-detect + reassemble)  <br>• R-Studio Tech (virtual RAID)  <br>• open-source: `mdadm --assemble --run --force` (Linux) | `r-studio create-raid /dev/sd[b-c-e] level=5 stripe=64 > raid.xml` |
| **Virtual-machine disk images (VHD/VHDX/VDI/VMWare)** | They look like a single flat file until you mount the internal snapshots & differencing disks. | • R-Studio (mounts them natively)  <br>• Arsenal Image Mounter (Windows) <br>• `qemu-nbd` (Linux) | `r-studio my.vhdx` # appears as physical disk |
| **Mobile SQLite + WAL + deleted pages** | Python can carve the DB but misses **uncommitted WAL records** and **freelist pages**. | • FORC (open-source, Android-centric)  <br>• Belkasoft X, Magnet AXIOM, Oxygen Detective | `forc --db Photos.sqlite --wal Photos.wal --output csv` |
| **iOS full-file-system (non-jailbroken)** | You need an exploit (checkm8, Fugu, etc.) to decrypt the live filesystem; Python can’t talk to Secure-Enclave. | • Elcomsoft iOS Forensic Toolkit <br>• GrayKey (Cellebrite) <br>• open-source: libimobiledevice + checkra1n | `./ios-extract --datapath /var/mobile` |
| **App-specific crypto (Signal, WhatsApp, Snapchat)** | Databases are encrypted with hardware-backed keys; brute-force is impossible without the key-file. | • Oxygen Forensics (extracts keys from rooted dump) <br>• Cellebrite Physical Analyzer | `ofd-decrypt --backup.tar --keychain.plist` |

---

### Chaining workflow (example)

1. Your Python script finishes → produces `forensic.img`  
2. **VeraCrypt detected**  
   ```bash
   edpr --file forensic.img --attack-dictionary top1M.txt
   # → outputs decrypted.img
   ```
3. **RAID inside**  
   ```bash
   r-studio create-raid /dev/loop0 missing /dev/loop2 level=5
   # → virtual RAID block device
   ```
4. **SQLite inside**  
   ```bash
   forc --db decrypted.img-Files/photos.sqlite --wal *.wal
   # → CSV with deleted thumbnails
   ```

---



Bottom line: treat the Python suite as the **first 70 %** (imaging, carving, TSK parsing).  
When you hit encryption, RAID parity, or mobile crypto, **drop the image into the specialised tool**, then script the **CSV/JSON export** back into your Python report.

---