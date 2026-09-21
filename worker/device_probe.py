"""Report whether this interpreter can run separation, which devices it offers, and what 'auto' resolves to."""
import json
import sys

# What separate.py and the vendored BS-Roformer implementation import.
REQUIRED = ('numpy', 'soundfile', 'yaml', 'torch', 'einops', 'rotary_embedding_torch', 'beartype', 'packaging')

def main():
    sys.stdin.readline()
    missing = [name for name in REQUIRED if not _importable(name)]
    version, cuda, mps, note, backend = '', False, False, '', ''
    if 'torch' not in missing:
        try:
            import torch
            version = str(torch.__version__)
            # A ROCm build reaches AMD GPUs through the same torch.cuda API; torch.version.hip tells them apart.
            backend = 'rocm' if getattr(torch.version, 'hip', None) else ('cuda' if getattr(torch.version, 'cuda', None) else '')
            cuda = bool(torch.cuda.is_available())
            mps = bool(getattr(torch.backends, 'mps', None) and torch.backends.mps.is_available())
        except Exception as error:  # torch present but unusable
            note = str(error)
    print(json.dumps({'type': 'result', 'cuda': cuda, 'mps': mps, 'auto': 'cuda' if cuda else 'cpu',
                      'torch': version, 'backend': backend, 'missing': missing, 'note': note}), flush=True)

def _importable(name):
    try:
        __import__(name)
        return True
    except Exception:
        return False

if __name__ == '__main__':
    main()
