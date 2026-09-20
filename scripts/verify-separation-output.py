"""Verify a completed worker smoke run; does not score perceptual separation quality."""
import argparse
import json
from pathlib import Path
import numpy as np
import soundfile as sf

parser = argparse.ArgumentParser()
parser.add_argument('request', type=Path)
parser.add_argument('events', type=Path)
args = parser.parse_args()
request = json.loads(args.request.read_text())
events = [json.loads(line) for line in args.events.read_text().splitlines() if line.strip()]
if not events or events[-1].get('type') != 'complete':
    raise SystemExit('Worker did not report completion')
result = events[-1]
source, rate = sf.read(request['input'], dtype='float32', always_2d=True)
expected = [target['id'] for target in request['targets']]
if [item['stem'] for item in result['outputs']] != expected:
    raise SystemExit('Output targets do not match request')
reconstructed = np.zeros(source.shape, dtype=np.float64)
for filename in [result['other'], *[item['path'] for item in result['outputs']]]:
    audio, output_rate = sf.read(filename, dtype='float32', always_2d=True)
    if output_rate != rate or audio.shape != source.shape or not np.isfinite(audio).all():
        raise SystemExit(f'Invalid or misaligned output: {filename}')
    reconstructed += audio
error = float(np.max(np.abs(source - reconstructed)))
if error > 1e-5:
    raise SystemExit(f'Reconstruction error exceeds tolerance: {error}')
print(json.dumps({'device': request['device'], 'sampleRate': rate, 'frames': len(source),
                  'channels': source.shape[1], 'maxReconstructionError': error,
                  'scope': 'Pipeline alignment and residual consistency only'}, indent=2))
