"""One local task per process. stdin request; stdout JSON events; diagnostics stderr."""
import contextlib
import json
import math
from pathlib import Path
import sys
import traceback

sys.path.insert(0, str(Path(__file__).parent / 'vendor'))

def emit(**event):
    print(json.dumps(event), flush=True)

def run(request):
    import numpy as np
    import soundfile as sf
    import torch
    import yaml
    from models.bs_roformer.bs_roformer import BSRoformer

    class ConfigLoader(yaml.SafeLoader):
        pass
    ConfigLoader.add_constructor('tag:yaml.org,2002:python/tuple', lambda loader, node: tuple(loader.construct_sequence(node)))
    requested = request.get('device', 'auto')
    device = ('cuda' if torch.cuda.is_available() else 'cpu') if requested == 'auto' else requested
    if device == 'cuda' and not torch.cuda.is_available():
        raise RuntimeError('CUDA is unavailable; choose CPU or Auto')
    if device == 'mps' and not torch.backends.mps.is_available():
        raise RuntimeError('MPS is unavailable; choose CPU or Auto')
    if device not in ('cpu', 'cuda', 'mps'):
        raise ValueError('Unsupported device')
    audio, rate = sf.read(request['input'], dtype='float32', always_2d=True)
    if rate != 44100 or audio.shape[1] != 2 or not len(audio):
        raise ValueError('Expected nonempty 44.1 kHz stereo source')
    remainder = audio.T.copy()
    outputs = []
    targets = request['targets']
    if not targets:
        raise ValueError('No target models selected')
    for index, target in enumerate(targets):
        config = yaml.load(Path(target['config']).read_text(), Loader=ConfigLoader)
        options = config['model']
        # PyTorch SDPA also provides memory-efficient CPU attention.
        options['flash_attn'] = True
        with contextlib.redirect_stdout(sys.stderr):
            model = BSRoformer(**options)
            state = torch.load(target['weight'], map_location='cpu', weights_only=True)
            if 'state_dict' in state:
                state = state['state_dict']
            model.load_state_dict(state, strict=True)
            model.to(device).eval()
        chunk = int(config.get('inference', {}).get('chunk_size', config['audio']['chunk_size']))
        overlap = max(2, int(config.get('inference', {}).get('num_overlap', 2)))
        hop = chunk // overlap
        # Reflect padding and normalized overlap-add preserve duration and cover boundaries.
        padding = chunk // 2
        padded = np.pad(remainder, ((0, 0), (padding, padding)), mode='reflect' if remainder.shape[1] > 1 else 'edge')
        output = np.zeros_like(padded)
        weights = np.zeros(padded.shape[-1], dtype=np.float32)
        window = np.maximum(np.hanning(chunk).astype(np.float32), 1e-4)
        starts = list(range(0, padded.shape[-1], hop))
        with torch.inference_mode():
            for number, start in enumerate(starts):
                size = min(chunk, padded.shape[-1] - start)
                segment = np.pad(padded[:, start:start+size], ((0, 0), (0, chunk-size)))
                tensor = torch.from_numpy(segment).unsqueeze(0).to(device)
                with contextlib.redirect_stdout(sys.stderr):
                    prediction = model(tensor)
                result = prediction.detach().float().cpu().numpy().reshape(-1, 2, chunk)[0]
                if not np.isfinite(result).all():
                    raise RuntimeError('Model produced non-finite audio')
                output[:, start:start+size] += result[:, :size] * window[:size]
                weights[start:start+size] += window[:size]
                emit(type='progress', stem=target['id'], completed=index, total=len(targets), progress=(index+(number+1)/len(starts))/len(targets))
        separated = (output / np.maximum(weights, 1e-8))[:, padding:padding+audio.shape[0]]
        # Sequential extraction leaves an explicit consistent residual at each stage.
        remainder -= separated
        output_path = str(Path(request['output']) / f'{index}.wav')
        sf.write(output_path, separated.T, rate, subtype='FLOAT')
        outputs.append({'stem': target['id'], 'path': output_path})
        del model
        if device == 'cuda':
            torch.cuda.empty_cache()
    other = str(Path(request['output']) / 'other.wav')
    sf.write(other, remainder.T, rate, subtype='FLOAT')
    emit(type='complete', outputs=outputs, other=other)

if __name__ == '__main__':
    try:
        run(json.loads(sys.stdin.readline()))
    except Exception as error:
        traceback.print_exc(file=sys.stderr)
        emit(type='error', message=str(error))
        sys.exit(1)
