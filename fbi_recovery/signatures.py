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