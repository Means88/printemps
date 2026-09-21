# Printemps

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-db61a2?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/Means88)

An Electron audio separation and listening workspace, based on the approved Pen designs. Audio processing, analysis, playback and export run locally. Selected separation models and application updates are downloaded explicitly.

## Development

Requires Node.js 22.12+ and pnpm 11.6.0 (pinned in `packageManager`). On Windows use `.venv\Scripts\python.exe` for the Python commands.

```sh
corepack enable
pnpm install --frozen-lockfile
python3 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r worker/requirements.lock
.venv/bin/python worker/setup-assets.py
pnpm run dev
```

`setup-assets.py` prepares the bundled beat-analysis model; users are never asked to install Python or download analysis tooling.

```sh
pnpm test          # unit and integration tests
pnpm run build     # includes the TypeScript check
pnpm lint          # oxlint plus the design-system checks, must report zero
pnpm preview:ui    # renderer fixture on 127.0.0.1:5174
```

Commit `pnpm-lock.yaml` with dependency changes; CI installs frozen. Conventions are in [AGENTS.md](AGENTS.md); the deeper verification procedures are in [docs/testing.md](docs/testing.md).

## Packaging

```sh
.venv/bin/python -m pip install uv==0.12.17
pnpm run runtime:prepare   # managed CPython plus the pinned inference dependencies
pnpm run package           # unpacked app
pnpm run dist              # installers
```

Python dependencies are hash-pinned in `worker/requirements.lock`, runtime preparation records that hash, and packaging rejects a stale runtime. Neither command publishes. Signing, notarization, artifact limits and the release workflow are in [docs/RELEASE.md](docs/RELEASE.md).

## Structure

- `src/main`: private storage, job scheduling, subprocesses, native audio import/export, model cache and updater.
- `src/preload`: restricted renderer bridge.
- `src/shared`: validated data contracts, stem catalog, timeline and recommendation derivation.
- `src/renderer`: React / Radix workspace and dialogs.
- `worker`: local Python inference and analysis code, pinned source attribution and analysis asset manifest.
- `scripts`: runtime preparation and packaging preflight.
- `design`: approved editable-design exports, previews and chronological decisions.

Project media and separation results stay in the app's private directory; export creates independent copies. The Python runtime and analysis weights ship beside the renderer archive, while separation checkpoints live in the user's model cache and are not part of any installer.

What is verified today, and what is not, is tracked in [docs/implementation-status.md](docs/implementation-status.md).

## Documentation

- [AGENTS.md](AGENTS.md): project conventions and boundaries.
- [docs/testing.md](docs/testing.md): the deeper test and verification procedures.
- [docs/RELEASE.md](docs/RELEASE.md): signing, notarization and the release workflow.
- [docs/DESIGN.md](docs/DESIGN.md): the design system rules.
- [docs/implementation-status.md](docs/implementation-status.md): what is verified today and what is not.
- [printemps.dev/guide](https://printemps.dev/guide): the user-facing guide.
