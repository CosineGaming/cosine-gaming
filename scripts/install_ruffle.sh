#!/usr/bin/env bash
# Download @ruffle-rs/ruffle into static/ruffle/ for self-hosted Flash playback.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/static/ruffle"

if [[ -f "$DEST/ruffle.js" ]]; then
	echo "Ruffle already installed at static/ruffle/"
	exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
	echo "npm is required to install Ruffle. Install Node.js/npm and re-run." >&2
	exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$DEST"
cd "$TMP"
npm pack @ruffle-rs/ruffle
tar -xzf ruffle-rs-ruffle-*.tgz
cp -a package/* "$DEST/"

echo "Installed Ruffle to static/ruffle/"
