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

# Separate multi-key CAS abstraction; preserve original recovery gate above.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/anchored-safe" -config AnchoredSafe.cfg AnchoredRecovery.tla > "$WORK/anchored-safe.log" 2>&1 || { cat "$WORK/anchored-safe.log"; exit 1; }
cat "$WORK/anchored-safe.log"
grep -F 'No error has been found' "$WORK/anchored-safe.log"
for entry in 'Unauthorized Authorized' 'Budget BoundedContacts' 'Rollback NoRollback' 'Stale NoFork'; do
 set -- $entry
 if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/anchored-$1" -config "Anchored$1.cfg" AnchoredRecovery.tla > "$WORK/anchored-$1.log" 2>&1; then
  cat "$WORK/anchored-$1.log"; echo "mutant $1 unexpectedly succeeded" >&2; exit 1
 fi
 cat "$WORK/anchored-$1.log"
 grep -F "Invariant $2 is violated" "$WORK/anchored-$1.log"
done
python3 anchored_model.py

# Fair opportunity resolution; removing the fairness assumption must fail.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/anchored-fair" -config AnchoredFair.cfg AnchoredRecovery.tla > "$WORK/anchored-fair.log" 2>&1 || { cat "$WORK/anchored-fair.log"; exit 1; }
cat "$WORK/anchored-fair.log"
grep -F 'No error has been found' "$WORK/anchored-fair.log"
if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/anchored-unfair" -config AnchoredUnfair.cfg AnchoredRecovery.tla > "$WORK/anchored-unfair.log" 2>&1; then
 cat "$WORK/anchored-unfair.log"; echo 'unfair model unexpectedly satisfied liveness' >&2; exit 1
fi
cat "$WORK/anchored-unfair.log"
grep -F 'Temporal property ConditionalRecovery was violated' "$WORK/anchored-unfair.log"


# Separate two-domain authority/witness crash bridge abstraction.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/witness-bridge-safe" -config WitnessBridgeSafe.cfg WitnessBridge.tla > "$WORK/witness-bridge-safe.log" 2>&1 || { cat "$WORK/witness-bridge-safe.log"; exit 1; }
cat "$WORK/witness-bridge-safe.log"
grep -F 'No error has been found' "$WORK/witness-bridge-safe.log"
for entry in 'Early WitnessNotAhead' 'Double GapBound' 'Clear RecoverableGap' 'Ack AckNotAhead'; do
 set -- $entry
 if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/witness-bridge-$1" -config "WitnessBridge$1.cfg" WitnessBridge.tla > "$WORK/witness-bridge-$1.log" 2>&1; then
  cat "$WORK/witness-bridge-$1.log"; echo "witness bridge mutant $1 unexpectedly succeeded" >&2; exit 1
 fi
 cat "$WORK/witness-bridge-$1.log"
 grep -F "Invariant $2 is violated" "$WORK/witness-bridge-$1.log"
done
python3 witness_bridge_model.py

# Prepared intent must settle under weak fairness; the stuttering model must fail.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/witness-bridge-fair" -config WitnessBridgeFair.cfg WitnessBridge.tla > "$WORK/witness-bridge-fair.log" 2>&1 || { cat "$WORK/witness-bridge-fair.log"; exit 1; }
cat "$WORK/witness-bridge-fair.log"
grep -F 'No error has been found' "$WORK/witness-bridge-fair.log"
if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/witness-bridge-unfair" -config WitnessBridgeUnfair.cfg WitnessBridge.tla > "$WORK/witness-bridge-unfair.log" 2>&1; then
 cat "$WORK/witness-bridge-unfair.log"; echo 'unfair witness bridge unexpectedly satisfied liveness' >&2; exit 1
fi
cat "$WORK/witness-bridge-unfair.log"
grep -F 'Temporal property PreparedEventuallySettles was violated' "$WORK/witness-bridge-unfair.log"


# Exact-consent grant lifecycle: active window, durable admission, revocation and
# reconciliation are a separate bounded model from action/witness persistence.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/grant-safe" -config GrantSafe.cfg GrantLifecycle.tla > "$WORK/grant-safe.log" 2>&1 || { cat "$WORK/grant-safe.log"; exit 1; }
cat "$WORK/grant-safe.log"
grep -F 'No error has been found' "$WORK/grant-safe.log"
for entry in 'Revoked DispatchAuthorized' 'Expired DispatchAuthorized' 'Reconcile ReconcileRequiresAdmission' 'Race DispatchAuthorized' 'EpochRace DispatchAuthorized' 'Duplicate AtMostOneEffect'; do
 set -- $entry
 if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/grant-$1" -config "Grant$1.cfg" GrantLifecycle.tla > "$WORK/grant-$1.log" 2>&1; then
  cat "$WORK/grant-$1.log"; echo "grant lifecycle mutant $1 unexpectedly succeeded" >&2; exit 1
 fi
 cat "$WORK/grant-$1.log"
 grep -F "Invariant $2 is violated" "$WORK/grant-$1.log"
done
python3 grant_model.py

# Wider bridge safety: Go permits later contacts after an unobserved acknowledgement.
# Retain the stricter original profile and its liveness counterexamples above.
for entry in 'Safe' 'Fair'; do
 java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/witness-lossy-$entry" -config "WitnessBridgeLossy$entry.cfg" WitnessBridgeLossy.tla > "$WORK/witness-lossy-$entry.log" 2>&1 || { cat "$WORK/witness-lossy-$entry.log"; exit 1; }
 cat "$WORK/witness-lossy-$entry.log"
 grep -F 'No error has been found' "$WORK/witness-lossy-$entry.log"
done
for entry in 'UnconditionalAck SettledEventuallyAcknowledged' 'UnfairAck QuiescentEventuallyAcknowledged'; do
 set -- $entry
 if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/witness-lossy-$1" -config "WitnessBridgeLossy$1.cfg" WitnessBridgeLossy.tla > "$WORK/witness-lossy-$1.log" 2>&1; then
  cat "$WORK/witness-lossy-$1.log"; echo "lossy witness negative control $1 unexpectedly succeeded" >&2; exit 1
 fi
 cat "$WORK/witness-lossy-$1.log"
 grep -F "Temporal property $2 was violated" "$WORK/witness-lossy-$1.log"
done
