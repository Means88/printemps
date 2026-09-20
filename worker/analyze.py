"""Offline analysis: bundled Beat This checkpoint; key analysis uses the sibling WASM worker."""
import contextlib
import hashlib
import json
from pathlib import Path
import sys
import traceback


def emit(**event):
    print(json.dumps(event, allow_nan=False), flush=True)


def run(request):
    with contextlib.redirect_stdout(sys.stderr):
        import numpy as np
        import soundfile as sf
    audio, rate = sf.read(request['input'], dtype='float32', always_2d=True)
    if not len(audio) or rate != 44100 or not np.isfinite(audio).all():
        raise ValueError('Invalid canonical audio')
    mono = audio.mean(axis=1)
    if len(mono) < rate * 2 or float(np.sqrt(np.mean(mono * mono))) < 1e-6:
        emit(type='complete', beats=[], downbeats=[], key=None, strength=None)
        return
    beats, downbeats, key, strength, errors = [], [], None, None, {}
    emit(type='progress', stage='beats')
    try:
        with contextlib.redirect_stdout(sys.stderr):
            import torch
            import beat_this.inference as inference
        checkpoint = Path(__file__).parent / 'assets' / 'small0.ckpt'
        manifest = json.loads((Path(__file__).parent / 'analysis-manifest.json').read_text())
        if not checkpoint.is_file():
            raise RuntimeError('Bundled beat analysis model is missing; reinstall the application')
        if hashlib.sha256(checkpoint.read_bytes()).hexdigest() != manifest['sha256']:
            raise RuntimeError('Bundled beat analysis model is damaged; reinstall the application')
        # Remove upstream download fallback, even if the checked file disappears later.
        def local_checkpoint(filename, device='cpu'):
            return torch.load(filename, map_location=device, weights_only=True)
        inference.load_checkpoint = local_checkpoint
        with contextlib.redirect_stdout(sys.stderr):
            tracker = inference.Audio2Beats(checkpoint_path=str(checkpoint), device='cpu', dbn=False)
            beats, downbeats = tracker(mono, rate)
    except Exception as error:
        errors['beats'] = str(error)
        traceback.print_exc(file=sys.stderr)
    emit(type='complete', beats=[float(t) for t in beats], downbeats=[float(t) for t in downbeats],
         key=key, strength=float(strength) if strength is not None else None, errors=errors)


if __name__ == '__main__':
    try:
        run(json.loads(sys.stdin.readline()))
    except Exception as error:
        traceback.print_exc(file=sys.stderr)
        emit(type='error', message=str(error))
        sys.exit(1)
