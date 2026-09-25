import pathlib
import hashlib

def make_synthetic_jpeg():
    header = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"  # 20B
    sof0 = b"\xFF\xC0\x00\x11\x08\x00\x40\x00\x40\x03\x01\x11\x00\x02\x11\x01\x03\x11\x01"  # 19B
    sos_hdr = b"\xFF\xDA\x00\x0C\x03\x01\x00\x02\x11\x03\x11\x00\x3F\x00"  # 14B
    body_fill = (b"\x12\x34\x56\x78" * 370) + b"\x90"  # 1481B
    footer = b"\xFF\xD9"  # 2B
    payload = header + sof0 + sos_hdr + body_fill + footer
    assert len(payload) == 1536, f"Length is {len(payload)}"
    return payload

def main():
    orig_jpeg = make_synthetic_jpeg()
    orig_sha256 = hashlib.sha256(orig_jpeg).hexdigest()

    # Split into 3 discrete sector fragments:
    frag_a = orig_jpeg[:512]       # Header (offset 0x1000)
    frag_b = orig_jpeg[512:1024]   # Body   (offset 0x6000)
    frag_c = orig_jpeg[1024:]      # Footer (offset 0xB000)

    # Contiguous intact PDF file
    pdf_data = b"%PDF-1.4\n1 0 obj\n<< /Title (TOP SECRET OPERATION PLAN) /Author (CyberUnit) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"

    # High priority RSA credential key
    key_data = b"-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0syntheticKeyStreamForForensicTesting\n-----END RSA PRIVATE KEY-----\n"

    # Build a 128KB synthetic disk image buffer
    disk = bytearray(128 * 1024)

    # Place fragments non-contiguously across separated clusters:
    disk[0x1000 : 0x1000 + len(frag_a)] = frag_a
    disk[0x6000 : 0x6000 + len(frag_b)] = frag_b
    disk[0xB000 : 0xB000 + len(frag_c)] = frag_c

    # Place contiguous PDF at 0xE000
    disk[0xE000 : 0xE000 + len(pdf_data)] = pdf_data

    # Place credential key at 0x12000
    disk[0x12000 : 0x12000 + len(key_data)] = key_data

    out_path = pathlib.Path("synthetic_evidence/sample_evidence.img")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(bytes(disk))

    print("Synthetic evidence image created at:", out_path)
    print("Disk size:", len(disk), "bytes")
    print("Target Fragmented JPEG Original SHA-256:", orig_sha256)

if __name__ == "__main__":
    main()
