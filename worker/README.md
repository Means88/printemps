# Local inference worker

`separate.py` accepts one JSON request on stdin and writes progress/completion JSON lines to stdout. It runs pinned vendored MSST BS-Roformer model code, using verified local model/config paths. No model download occurs in the worker.

Development setup: `python3 -m venv .venv && .venv/bin/python -m pip install --require-hashes -r worker/requirements.lock` (Windows: `.venv/Scripts/python`). A release must bundle a tested Python runtime and dependencies; asking end users to install Python is not the final product design.

Multiple requested targets are extracted sequentially from the current residual. This produces an explicit remainder, but output can depend on selection order and is not identical to running each model independently on the original mix. Preserve selection order and validate perceptual quality before release.

Upstream source attribution and pinned revision are in `vendor/SOURCE.json`; upstream MIT license is preserved in `vendor/LICENSE`.

## Local music analysis

Run `.venv/bin/python worker/setup-assets.py` once during development/build preparation. It downloads the official Beat This `small0` checkpoint and checks the byte size and SHA-256 in `analysis-manifest.json`. The ignored `assets/small0.ckpt` must be included with the packaged worker. Application analysis never invokes this setup script or performs downloads; it requires the verified local checkpoint and overrides Beat This's URL fallback.

`analyze.py` receives `{ "input": "<private canonical WAV>" }` and emits beat/downbeat timestamps on CPU. `key.cjs` runs official Essentia.js 0.1.3 WASM KeyExtractor in a separate Node worker thread. The main-process analysis adapter combines results with separate beat/key error reporting. There is no native Essentia Python dependency. Torch and torchaudio are pinned to 2.11.0 to keep their binaries compatible. macOS arm64 development uses Python 3.14.7. The WASM key engine removes the unavailable Windows Essentia wheel and its macOS 15 constraint; other native dependencies still require Windows/Linux and macOS-version validation.

Recommendations are derived in `src/shared/analysis.ts`. Global tempo is the median pulse interval when sufficiently stable. Stable 3/4/5 pulse counts can suggest a quarter-note meter, explicitly labeled as an assumption; two pulses do not automatically imply 2/4 instead of 6/8. Sparse or inconsistent beats yield no meter/first-beat recommendation. Essentia strength >= 0.6 is a provisional engineering filter, not a calibrated probability or validated accuracy claim. These thresholds still need a varied music evaluation set.

Essentia.js is distributed under its upstream AGPL license (commercial licensing is also offered upstream); preserve notices and resolve application redistribution requirements before releasing installers. Beat This package/source is MIT. Do not treat a working local Python environment as completed runtime packaging.

Release runtime installation uses `requirements.lock`, with exact direct/transitive versions, platform markers and distribution hashes. `requirements.txt` is the input used when intentionally updating the lock. Keep the bundled runtime manifest's lock hash in sync by rerunning `pnpm run runtime:prepare`; do not manually mark an old runtime as rebuilt. The current NumPy macOS arm64 wheel declares macOS 14.0, so the app's macOS packaging minimum is 14.0. Package preflight checks wheel minimum tags against that declaration.
