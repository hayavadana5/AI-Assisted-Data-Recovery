# 1. Install the **native libraries first**, then the Python wheels:

```bash
# 1.  native libs (no ‘sleuthkit’ meta-package in 22.04)
sudo apt update
sudo apt install -y \
     libtsk-dev \
     libewf-dev \
     libewf2 \
     build-essential \
     python3-dev \
     foremost

# 2.  Python side – drop pyewf (no wheel), keep the rest
pip install tqdm rich pytsk3

# 3.  (optional) build pyewf from source if you really need E01 support
git clone https://github.com/libyal/libewf.git
cd libewf
./synclibs.sh
./autogen.sh
./configure --enable-python
make -j$(nproc)
sudo make install
sudo ldconfig
pip install .
```

After that the script will run; `fls`/`icat` are already in `/usr/bin` once `libtsk-dev` is installed.

---

# 2. Skip the heavy compile—**you don’t need pyewf** unless you want to read E01 images.  
Just finish the *essential* parts and use the pure-Python carver:

```bash
# 1.  back out of the broken clone
cd ..
rm -rf libewf

# 2.  install only what we really need
sudo apt update
sudo apt install -y libtsk-dev foremost
pip install tqdm rich pytsk3

# 3.  quick sanity check
which fls      # → /usr/bin/fls
python3 -c "import pytsk3, tqdm, rich; print('OK')"
```

Now run the recovery script exactly as shown earlier—everything works without pyewf.

---


# 3. The script is asking for the **block device or disk image** you want to scan.  
In a Codespace the only safe, non-destructive target you can use for a demo is a **small test image** (or an empty USB-stick image you create yourself).  
Create one now and re-run:

```bash
# 1.  50 MB fake “USB-stick” with a couple of deleted files
dd if=/dev/zero of=test-stick.img bs=1M count=50
mkfs.fat test-stick.img          # FAT32 so fls can show deleted entries
sudo mkdir -p /mnt/fat
sudo mount -o loop test-stick.img /mnt/fat
sudo cp /etc/passwd /mnt/fat/secret.txt   # dummy file
sudo rm /mnt/fat/secret.txt               # “delete” it
sudo umount /mnt/fat

# 2.  run the recovery tool on that image
python3 fbi_recovery/recover.py test-stick.img --carve --image
```

You’ll get:

```
recovery_20260115_XXXXX/
├── forensic.img            # bit-copy you just made
├── forensic.img.sha256     # hash for chain-of-custody
├── sleuthkit/
│   └── sleuthkit.csv       # deleted “secret.txt” entry
└── carved/
    ├── PDF_xxxxxx.pdf      # anything that matched magic bytes
    └── TXT_xxxxxx.txt
```

That’s the intended usage—replace `test-stick.img` with a real device path (`/dev/sdb`, `/dev/sdc`, etc.) when you run it on your own machine.