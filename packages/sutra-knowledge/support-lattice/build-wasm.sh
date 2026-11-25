#!/bin/sh
# Reproducible build recipe for the isolated browser support module.
# The runner's exact rustc version is recorded in CI; no peer-provided code.
set -eu
cd "$(dirname "$0")/../../.."
out=apps/sutra-v2/public/support-lattice.wasm
pin=apps/sutra-v2/src/generated-support-pin.js
mkdir -p apps/sutra-v2/public
rustc --version
rustc --edition=2021 --target wasm32-unknown-unknown --crate-type=cdylib \
  -C opt-level=s -C panic=abort -C strip=symbols \
  packages/sutra-knowledge/support-lattice/wasm.rs -o "$out"
hash=$(sha256sum "$out" | cut -d ' ' -f 1)
case "$hash" in
  *[!0-9a-f]*|'') exit 1 ;;
esac
[ "${#hash}" -eq 64 ]
printf "export const SUPPORT_WASM_SHA256='%s';\n" "$hash" > "$pin"
printf '%s  %s\n' "$hash" "$out"
