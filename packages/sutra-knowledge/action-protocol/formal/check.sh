#!/bin/sh
set -eu
cd "$(dirname "$0")"
JAR="$(mktemp /tmp/sutra-tlc.XXXXXX)"
WORK="$(mktemp -d)"
trap 'rm -f "$JAR"; rm -rf "$WORK"' EXIT
curl --fail --silent --show-error --location --max-time 60 https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar -o "$JAR"
printf '%s  %s\n' fdffef247f563ef6edbfd44958d2a82db79e7564e07cb673262d896353fa6713 "$JAR" | sha256sum -c -
java -version
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/safe" -config Safe.cfg Recovery.tla > "$WORK/safe.log" 2>&1 || { cat "$WORK/safe.log"; exit 1; }
cat "$WORK/safe.log"
grep -F 'No error has been found' "$WORK/safe.log"
if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/unsafe" -config Unsafe.cfg Recovery.tla > "$WORK/unsafe.log" 2>&1; then
 cat "$WORK/unsafe.log"; echo 'unsafe model unexpectedly succeeded' >&2; exit 1
fi
cat "$WORK/unsafe.log"
grep -F 'Invariant AtMostOnce is violated' "$WORK/unsafe.log"
python3 recovery_model.py
