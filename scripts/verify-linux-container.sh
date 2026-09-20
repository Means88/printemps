#!/usr/bin/env bash
# Run inside the disposable Linux verification container; /source is read-only.
set -euo pipefail
test "$(uname -s)" = Linux
test "$(node -p 'process.arch')" = x64
test -f /source/package.json
mkdir -p /work
cp /source/package.json /source/package-lock.json /source/tsconfig.json /source/electron.vite.config.ts /source/index.html /work/
cp -R /source/src /source/tests /source/scripts /source/public /source/worker /work/
cd /work
export DEBIAN_FRONTEND=noninteractive PYTHONDONTWRITEBYTECODE=1 CSC_IDENTITY_AUTO_DISCOVERY=false
apt-get update
apt-get install -y --no-install-recommends python3-venv libgtk-3-0 libnss3 libasound2 libx11-xcb1 libxss1 libgbm1 libatk-bridge2.0-0 libxshmfence1
python3 -m venv /opt/printemps-uv
/opt/printemps-uv/bin/pip install --disable-pip-version-check uv==0.12.17
export PRINTEMPS_UV=/opt/printemps-uv/bin/uv
npm ci --no-audit --no-fund
npm test
node scripts/verify-linux-update-fallback.mjs
npm run runtime:prepare
npm run test:integration
npm run dist -- --linux AppImage --x64
PRINTEMPS_TEST_RESOURCES=/work/release/linux-unpacked/resources npm run test:integration
printf '\nLinux x64 package and packaged analysis verification completed.\n'
