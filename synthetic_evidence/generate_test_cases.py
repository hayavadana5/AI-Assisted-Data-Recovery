from pathlib import Path
import hashlib

OUT_DIR = Path(__file__).parent


def make_test_jpeg():
    header = (
        b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01"
        b"\x00\x60\x00\x60\x00\x00"
    )

    body = (
        b"AEGIS_TC03_FRAGMENT_TEST_"
        + (b"\x12\x34\x56\x78" * 300)
    )

    footer = b"\xFF\xD9"

    return header + body + footer


def create_tc03():
    original = make_test_jpeg()
    original_hash = hashlib.sha256(original).hexdigest()

    # Split the JPEG into 3 fragments.
    fragment_size = len(original) // 3

    frag1 = original[:fragment_size]
    frag2 = original[fragment_size:fragment_size * 2]
    frag3 = original[fragment_size * 2:]

    # 128 KiB synthetic evidence image.
    disk = bytearray(128 * 1024)

    # Deliberately non-contiguous locations.
    offsets = [
        0x2000,
        0x7000,
        0xC000,
    ]

    disk[offsets[0]:offsets[0] + len(frag1)] = frag1
    disk[offsets[1]:offsets[1] + len(frag2)] = frag2
    disk[offsets[2]:offsets[2] + len(frag3)] = frag3

    output = OUT_DIR / "TC03_fragmented.img"
    output.write_bytes(disk)

    print("TC03 created:", output)
    print("Image size:", len(disk), "bytes")
    print("Original JPEG size:", len(original), "bytes")
    print("Original JPEG SHA-256:", original_hash)

    for i, offset in enumerate(offsets, start=1):
        print(f"Fragment {i}: offset=0x{offset:X}, size={len([frag1, frag2, frag3][i-1])}")

def create_tc04():
    disk = bytearray(128 * 1024)

    synthetic_key = (
        b"-----BEGIN RSA PRIVATE KEY-----\n"
        b"SYNTHETIC_AEGIS_TEST_KEY_DO_NOT_USE\n"
        b"-----END RSA PRIVATE KEY-----\n"
    )

    sensitive_document = (
        b"%PDF-1.4\n"
        b"AEGIS SYNTHETIC FORENSIC DOCUMENT\n"
        b"CONFIDENTIAL TEST DATA\n"
        b"PASSWORD: SYNTHETIC_TEST_PASSWORD\n"
        b"API_KEY: AEGIS_SYNTHETIC_TEST_KEY\n"
        b"ACCOUNT: SYNTHETIC_USER_001\n"
        b"%%EOF"
    )

    normal_text = (
        b"AEGIS ordinary synthetic investigation notes.\n"
        b"No real personal information is contained here.\n"
    )

    # Synthetic RSA key.
    disk[0x2000:0x2000 + len(synthetic_key)] = synthetic_key

    # Synthetic sensitive-looking document.
    disk[0x6000:0x6000 + len(sensitive_document)] = sensitive_document

    # Ordinary text artifact.
    disk[0xA000:0xA000 + len(normal_text)] = normal_text

    output = OUT_DIR / "TC04_sensitive.img"
    output.write_bytes(disk)

    print("TC04 created:", output)
    print("Image size:", len(disk), "bytes")
    print("Synthetic key offset: 0x2000")
    print("Sensitive document offset: 0x6000")
    print("Ordinary text offset: 0xA000")

def create_tc05():
    # Completely zero-filled synthetic evidence.
    disk = bytearray(128 * 1024)

    output = OUT_DIR / "TC05_empty.img"
    output.write_bytes(disk)

    print("TC05 created:", output)
    print("Image size:", len(disk), "bytes")
    print("Content: completely zero-filled")
def create_tc06():
    disk = bytearray(128 * 1024)

    # 1. Synthetic fragmented JPEG
    jpeg = (
        b"\xFF\xD8\xFF\xE0"
        b"AEGIS_TC06_FRAGMENTED_IMAGE_"
        + (b"\x12\x34\x56\x78" * 250)
        + b"\xFF\xD9"
    )

    split1 = len(jpeg) // 3
    split2 = (len(jpeg) * 2) // 3

    frag1 = jpeg[:split1]
    frag2 = jpeg[split1:split2]
    frag3 = jpeg[split2:]

    disk[0x2000:0x2000 + len(frag1)] = frag1
    disk[0x6000:0x6000 + len(frag2)] = frag2
    disk[0xA000:0xA000 + len(frag3)] = frag3

    # 2. Synthetic document
    document = (
        b"%PDF-1.4\n"
        b"AEGIS SYNTHETIC MIXED-EVIDENCE DOCUMENT\n"
        b"CONFIDENTIAL TEST MATERIAL\n"
        b"CASE-ID: SYNTHETIC-TC06\n"
        b"%%EOF"
    )

    disk[0xC000:0xC000 + len(document)] = document

    # 3. Synthetic credential artifact
    credential = (
        b"-----BEGIN RSA PRIVATE KEY-----\n"
        b"AEGIS_TC06_SYNTHETIC_ONLY\n"
        b"-----END RSA PRIVATE KEY-----\n"
    )

    disk[0xE000:0xE000 + len(credential)] = credential

    # 4. Deliberate unrelated/corrupted-looking data region
    disk[0x11000:0x11000 + 256] = bytes(
        ((i * 37) % 256) for i in range(256)
    )

    output = OUT_DIR / "TC06_mixed.img"
    output.write_bytes(disk)

    print("TC06 created:", output)
    print("Image size:", len(disk), "bytes")
    print("Fragmented JPEG fragments:")
    print(f"  0x2000 -> {len(frag1)} bytes")
    print(f"  0x6000 -> {len(frag2)} bytes")
    print(f"  0xA000 -> {len(frag3)} bytes")
    print("Synthetic document offset: 0xC000")
    print("Synthetic credential offset: 0xE000")
    print("Additional test-data region: 0x11000")


if __name__ == "__main__":
    create_tc04()
    create_tc05()
    create_tc06()
