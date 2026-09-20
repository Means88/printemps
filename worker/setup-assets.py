"""Build-time only: prepare verified analysis weights for app packaging."""
import hashlib
import json
from pathlib import Path
import urllib.request

root = Path(__file__).parent
manifest = json.loads((root / 'analysis-manifest.json').read_text())
target = root / 'assets' / 'small0.ckpt'
def valid(file):
    return file.is_file() and file.stat().st_size == manifest['bytes'] and hashlib.sha256(file.read_bytes()).hexdigest() == manifest['sha256']
if not valid(target):
    target.parent.mkdir(exist_ok=True)
    temporary = target.with_suffix('.part')
    try:
        with urllib.request.urlopen(manifest['url'], timeout=60) as response, temporary.open('wb') as output:
            while block := response.read(1024 * 1024):
                output.write(block)
                if output.tell() > manifest['bytes']:
                    raise RuntimeError('Analysis asset exceeds expected size')
        if not valid(temporary):
            raise RuntimeError('Analysis asset integrity check failed')
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)
print(f'Analysis asset verified: {manifest["bytes"]} bytes')
