import subprocess, pathlib, hashlib

def dd_image(src, dst, block='4M'):
    pathlib.Path(dst).parent.mkdir(parents=True, exist_ok=True)
    cmd = ['dd', f'if={src}', f'of={dst}', f'bs={block}', 'conv=noerror,sync']
    subprocess.run(cmd, check=True)
    with open(dst, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()