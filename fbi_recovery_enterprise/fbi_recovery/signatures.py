from dataclasses import dataclass

@dataclass
class Sig:
    name: str
    ext: str
    header: bytes
    footer: bytes | None = None
    max_size: int = 50 * 1024 * 1024

SIGS = [
    Sig("JPEG", "jpg", bytes.fromhex("FFD8FF"), bytes.fromhex("FFD9")),
    Sig("PNG", "png", bytes.fromhex("89504E470D0A1A0A"), bytes.fromhex("49454E44AE426082")),
    Sig("PDF", "pdf", bytes.fromhex("25504446"), bytes.fromhex("0A2525454F46")),
    Sig("ZIP", "zip", bytes.fromhex("504B0304")),
    Sig("DOCX", "docx", bytes.fromhex("504B0304")),  # same header – filtered later
    Sig("MP4", "mp4", bytes.fromhex("6674797069736F6D"), max_size=200 * 1024 * 1024),
    Sig("WAV", "wav", bytes.fromhex("52494646"), max_size=10 * 1024 * 1024),
]