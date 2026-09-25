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