# Printemps

An Electron audio separation and listening workspace, based on the approved Pen designs. Audio processing, analysis, playback and export run locally. Selected separation models and application updates are downloaded explicitly.

## Development

Requires Node.js 22.12+ and pnpm 11.6.0 (pinned in `packageManager`). The current verified development host is macOS arm64. Windows, macOS and Linux CI have passed installer builds and packaged analysis checks. macOS native import, separation, project persistence and export have also been exercised; Windows/Linux desktop and actual audio-device validation remain outstanding. The current macOS arm64 package requires macOS 14 or later because of its bundled NumPy wheel; this is a packaging floor, not a claim that every supported OS release has been tested.

```sh
corepack enable
pnpm install --frozen-lockfile
python3 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r worker/requirements.lock
.venv/bin/python worker/setup-assets.py
pnpm run dev
```

When migrating an existing npm checkout, recreate `node_modules` before the first pnpm install. Commit `pnpm-lock.yaml` with dependency changes. CI uses frozen installs. The hoisted layout and explicit dependency build-script allowlist are configured in `pnpm-workspace.yaml` for Electron packaging. See [AGENTS.md](AGENTS.md) for project conventions.

On Windows use `.venv\Scripts\python.exe` for Python commands. `setup-assets.py` prepares the small bundled beat-analysis model at development/build time; the app does not ask users to install Python or download analysis tooling.

```sh
pnpm test
pnpm run build
```

The implemented workflow includes single-file import directly into the workspace, searchable stem selection, verified model caching, local separation with residual tracks, atomic secondary separation replacement, synchronized playback, per-track controls, manual musical parameters, explicit Beat This / Essentia analysis, private project history, WAV/FLAC export and application update controls. The implementation is still being verified; see [implementation status](docs/implementation-status.md) for remaining work and evidence. Designs and synthetic smoke tests are not performance or quality benchmarks.

## Packaging

Prepare a relocatable Python runtime on each target platform/architecture:

```sh
.venv/bin/python -m pip install uv==0.12.17
pnpm run runtime:prepare
pnpm run package
```

`PRINTEMPS_UV` may point to another installed uv executable. Runtime preparation installs managed CPython 3.14.7, installs inference dependencies and verifies the analysis asset. Python dependencies are pinned with distribution hashes in `worker/requirements.lock`. Regenerate it deliberately with `uv pip compile --python-version 3.14 --universal --generate-hashes worker/requirements.txt -o worker/requirements.lock`. Runtime preparation records the lock hash; packaging rejects a stale runtime. Build-input validation also checks macOS wheel minimum-version tags and prevents packaging without the runtime and model. `pnpm run dist` creates distributable targets. Both packaging commands use `--publish never`; they do not publish releases.

The app bundles the Python runtime and analysis weights separately from the renderer archive. Separation checkpoints remain in the user-selected model cache and are not included in installers. The updater uses GitHub Releases for `Means88/printemps`, prefers differential downloads and allows its standard full-download fallback. Release signing/notarization, platform package verification and real release-to-release updates remain required before public distribution. Redistribution notices and dependency licensing also need release review.

## Structure

- `src/main`: private storage, job scheduling, subprocesses, native audio import/export, model cache and updater.
- `src/preload`: restricted renderer bridge.
- `src/shared`: validated data contracts, stem catalog, timeline and recommendation derivation.
- `src/renderer`: React / Radix workspace and dialogs.
- `worker`: local Python inference and analysis code, pinned source attribution and analysis asset manifest.
- `scripts`: runtime preparation and packaging preflight.
- `design`: approved editable-design exports, previews and chronological decisions.

Project media and separation results remain in the app's private directory. Export creates independent copies; the app does not expose private results for external editing.

For a real analysis smoke test after runtime preparation, run `pnpm run test:integration`. To test resources from an actual app bundle, set `PRINTEMPS_TEST_RESOURCES` to its Resources directory. The fixture is synthetic; it verifies loading and orchestration rather than musical accuracy. Essentia key analysis runs as local WASM in a Node worker, removing the native Essentia Python wheel requirement.

### Native build verification

`.github/workflows/native-build.yml` runs tests, prepares the native Python runtime, builds platform installers, and executes real beat/key analysis from their staged packaged resources on Windows, macOS, and Linux. It runs for pull requests or manual dispatch; it does not publish releases. macOS builds use ad-hoc signing for these checks. Run [35482306981](https://github.com/Means88/printemps/actions/runs/35482306981) passed all three platforms at e29bc55, including NSIS, DMG/ZIP and AppImage creation. Later commits and native GUI/install/upgrade behavior require their own evidence; see the implementation status rather than treating a past green build as proof of the current tree.

Local equivalent: `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm run runtime:prepare`, `pnpm run test:integration`, and `pnpm run package`. Set `PRINTEMPS_UV` to the uv executable if it is not in `.venv`. Run `pnpm run test:integration` again with `PRINTEMPS_TEST_RESOURCES` pointing to the unpacked app's `resources` directory (`Printemps.app/Contents/Resources` on macOS). Signing, notarization, GUI/audio-device checks, and release-to-release update verification are separate release gates.

To verify real progressive separation, explicitly provide a local directory containing the pinned drums and bass weights/configs: `PRINTEMPS_TEST_MODELS=/absolute/path/to/models pnpm exec vitest run tests/progressive-runtime.test.ts`. The test verifies cached checksums before starting, uses the managed CPU runtime, and checks intermediate visibility, aligned outputs and residual reconstruction on a synthetic one-second input. It then trims the bass clip to 0.25–0.75 seconds and runs real secondary separation, verifies 0.5-second results at offset 0.25, source retention and inherited mix settings, exports WAV/FLAC, and verifies that editing an export leaves the private audio unchanged. It is skipped by default and is not a perceptual-quality benchmark. `PRINTEMPS_TEST_RESOURCES` optionally points this test at packaged worker/runtime resources too.

Clip buffer allocation across six ten-minute stereo tracks is checked by `PRINTEMPS_TEST_CLIP_MEMORY=1 pnpm exec vitest run tests/clip-memory.test.ts`. It allocates about 1.5 GB of PCM and is skipped by default; it does not verify a real audio device or Electron's overall memory peak.

### UI fixture preview

`pnpm run preview:ui` serves `http://127.0.0.1:5174/preview.html` using the actual renderer components with isolated in-memory example projects. Add `?lang=en` for English. This entry is excluded from the production build. Waveforms are schematic and playback is silent; model, export and native folder operations are deliberately unavailable. Use it for layout/focus review, not as evidence of Electron IPC, persistence, audio output or inference behavior. Add `&saveFailure=once` after `?lang=en` to simulate one failed save and inspect the Retry save flow; this flag exists only in the isolated preview.

### Local Linux packaging check

With Docker running, use an isolated x64 Linux container (the repository is mounted read-only):

```sh
docker run --name printemps-linux-verify --platform linux/amd64 --mount "type=bind,src=$PWD,dst=/source,readonly" node:24-bookworm bash /source/scripts/verify-linux-container.sh
```

The script installs dependencies inside the container, runs tests, prepares the native Python runtime, builds an AppImage and tests analysis from the packaged resources. It preserves the stopped container so `/work/release` and logs can be inspected or copied with `docker cp`. Choose an unused container name for a new run. This does not validate a desktop display, audio device or CUDA hardware.

Linux x64 version 0.1.1 has passed the locked-runtime build and packaged analysis check. Its artifact, runtime manifest, metadata and build log are in `.cache/linux-verification/0.1.1`. The CUDA-enabled AppImage is 3,045,394,056 bytes (about 3.05 GB), so the tiny analysis checkpoint does not imply a tiny application installer. A local HTTP Range test using electron-updater reconstructed this artifact from the 0.1.0 package with 4,042,905 downloaded bytes, including blockmap metadata (99.867% saved), and passed SHA-512 validation. The report is `.cache/linux-verification/delta-0.1.0-to-0.1.1.json`; this verifies this pair of builds, not installation, release hosting or future update ratios.

Those AppImage sizes predate the CPU-only dependency change: on Linux the default PyPI `torch` bundled the whole NVIDIA CUDA stack, which `worker/requirements.txt` now avoids by pinning `torch==2.11.0+cpu` there. Expect a far smaller AppImage from current sources, and treat the delta-update ratios below as historical.

The latest verified Linux build includes retained-project recovery and the AppImage desktop-argument fix. Evidence is in `.cache/linux-verification/history-recovery/` (49 regular tests, updater fallback/corruption checks, source and packaged analysis). Its locally reconstructed update from 0.1.0 downloaded 10,940,143 bytes of a 3,045,393,708-byte artifact, saving 99.641%; this supersedes the earlier pair above for the latest source snapshot. Installation and desktop runtime checks remain outstanding.
