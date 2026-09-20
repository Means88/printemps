"""Report which processing devices this runtime can use and what 'auto' resolves to."""
import json
import sys

def main():
    sys.stdin.readline()
    cuda = mps = False
    try:
        import torch
        cuda = bool(torch.cuda.is_available())
        mps = bool(getattr(torch.backends, 'mps', None) and torch.backends.mps.is_available())
    except Exception as error:  # torch missing or broken: report CPU only
        print(json.dumps({'type': 'result', 'cuda': False, 'mps': False, 'auto': 'cpu', 'note': str(error)}), flush=True)
        return
    print(json.dumps({'type': 'result', 'cuda': cuda, 'mps': mps, 'auto': 'cuda' if cuda else 'cpu'}), flush=True)

if __name__ == '__main__':
    main()
