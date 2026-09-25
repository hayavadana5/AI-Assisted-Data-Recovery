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