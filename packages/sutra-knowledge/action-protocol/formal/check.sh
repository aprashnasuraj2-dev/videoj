#!/bin/sh
set -eu
cd "$(dirname "$0")"
JAR="$(mktemp /tmp/sutra-tlc.XXXXXX)"
WORK="$(mktemp -d)"
trap 'rm -f "$JAR"; rm -rf "$WORK"' EXIT
curl --fail --silent --show-error --location --max-time 60 https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar -o "$JAR"
# Explicitly reviewed V2-175 development dependency migration. The upstream
# v1.8.0 prerelease was republished on 2026-11-26; the older exact pin is
# retained in docs/sutra-v2/TLC-PROVENANCE.md. Never trust a dynamic digest,
# retry with another version, accept either hash, or execute a mismatched JAR.
test "$(wc -c < "$JAR" | tr -d '[:space:]')" = 4511244
printf '%s  %s\n' 67f9575c3b9ef7a0787b1bded34812862ffe79d711298e5a75b1a77720b19928 "$JAR" | sha256sum -c -
printf '%s  %s\n' fc4b766626acf025b4661242f58e246d946b9d6b "$JAR" | sha1sum -c -
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


# Independent pre-effect admission fence. This is additive: the original
# post-effect witness bridge and its simultaneous-clone counterexample remain.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/fence-safe" -config FenceAdmissionSafe.cfg FenceAdmission.tla > "$WORK/fence-safe.log" 2>&1 || { cat "$WORK/fence-safe.log"; exit 1; }
cat "$WORK/fence-safe.log"
grep -F 'No error has been found' "$WORK/fence-safe.log"
for entry in 'Bypass AdmissionBeforeEffect' 'Early FenceNotAhead' 'Drop AdmissionBeforeEffect' 'Ack AckNotAhead'; do
 set -- $entry
 if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/fence-$1" -config "FenceAdmission$1.cfg" FenceAdmission.tla > "$WORK/fence-$1.log" 2>&1; then
  cat "$WORK/fence-$1.log"; echo "fence admission mutant $1 unexpectedly succeeded" >&2; exit 1
 fi
 cat "$WORK/fence-$1.log"
 grep -F "Invariant $2 is violated" "$WORK/fence-$1.log"
done
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/fence-fair" -config FenceAdmissionFair.cfg FenceAdmission.tla > "$WORK/fence-fair.log" 2>&1 || { cat "$WORK/fence-fair.log"; exit 1; }
cat "$WORK/fence-fair.log"
grep -F 'No error has been found' "$WORK/fence-fair.log"
for entry in 'Unfair PreparedEventuallySettles' 'UnconditionalAck SettledEventuallyAcknowledged'; do
 set -- $entry
 if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/fence-$1" -config "FenceAdmission$1.cfg" FenceAdmission.tla > "$WORK/fence-$1.log" 2>&1; then
  cat "$WORK/fence-$1.log"; echo "fence liveness negative control $1 unexpectedly succeeded" >&2; exit 1
 fi
 cat "$WORK/fence-$1.log"
 grep -F "Temporal property $2 was violated" "$WORK/fence-$1.log"
done

# Two cloned authorities share one independent admission owner. Safe admission
# must allow at most one local effect; each mutant has an exact named failure.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/fence-clones-safe" -config FenceClonesSafe.cfg FenceClones.tla > "$WORK/fence-clones-safe.log" 2>&1 || { cat "$WORK/fence-clones-safe.log"; exit 1; }
cat "$WORK/fence-clones-safe.log"
grep -F 'No error has been found' "$WORK/fence-clones-safe.log"
for entry in 'Double AtMostOneEffect' 'Bypass EffectRequiresAdmission'; do
 set -- $entry
 if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/fence-clones-$1" -config "FenceClones$1.cfg" FenceClones.tla > "$WORK/fence-clones-$1.log" 2>&1; then
  cat "$WORK/fence-clones-$1.log"; echo "fence clone mutant $1 unexpectedly succeeded" >&2; exit 1
 fi
 cat "$WORK/fence-clones-$1.log"
 grep -F "Invariant $2 is violated" "$WORK/fence-clones-$1.log"
done
python3 fence_model.py


# Grant-policy freshness: signed historical snapshots remain parseable, but
# dispatch requires a fresh challenge-bound view matching the live policy head.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/grant-policy-safe" -config GrantPolicyFreshSafe.cfg GrantPolicyFreshness.tla > "$WORK/grant-policy-safe.log" 2>&1 || { cat "$WORK/grant-policy-safe.log"; exit 1; }
cat "$WORK/grant-policy-safe.log"
grep -F 'No error has been found' "$WORK/grant-policy-safe.log"
for entry in 'Replay NoStaleDispatch' 'NoCheck DispatchWasFresh' 'Coordinated WitnessMonotonic'; do
 set -- $entry
 if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/grant-policy-$1" -config "GrantPolicyFresh$1.cfg" GrantPolicyFreshness.tla > "$WORK/grant-policy-$1.log" 2>&1; then
  cat "$WORK/grant-policy-$1.log"; echo "grant policy mutant $1 unexpectedly succeeded" >&2; exit 1
 fi
 cat "$WORK/grant-policy-$1.log"
 grep -F "Invariant $2 is violated" "$WORK/grant-policy-$1.log"
done
python3 grant_policy_model.py


# Returning-client exact policy ancestry. A numeric high-water alone is not a
# history proof: alternate 2-prime/3-prime branches must not cross effect admission.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/client-ancestry-safe" -config ClientPolicyAncestrySafe.cfg ClientPolicyAncestry.tla > "$WORK/client-ancestry-safe.log" 2>&1 || { cat "$WORK/client-ancestry-safe.log"; exit 1; }
cat "$WORK/client-ancestry-safe.log"
grep -F 'No error has been found' "$WORK/client-ancestry-safe.log"
if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/client-ancestry-numeric" -config ClientPolicyAncestryNumeric.cfg ClientPolicyAncestry.tla > "$WORK/client-ancestry-numeric.log" 2>&1; then
 cat "$WORK/client-ancestry-numeric.log"; echo "numeric-only client ancestry mutant unexpectedly succeeded" >&2; exit 1
fi
cat "$WORK/client-ancestry-numeric.log"
grep -F 'Invariant NoUnpinnedEffect is violated' "$WORK/client-ancestry-numeric.log"
# Permanent trust-root counterexample: a new client provisioned after coordinated
# rollback can legitimately pin the rolled pair because it never observed newer history.
if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/client-ancestry-provision" -config ClientPolicyAncestryProvision.cfg ClientPolicyAncestry.tla > "$WORK/client-ancestry-provision.log" 2>&1; then
 cat "$WORK/client-ancestry-provision.log"; echo "fresh-provisioning rollback counterexample unexpectedly absent" >&2; exit 1
fi
cat "$WORK/client-ancestry-provision.log"
grep -F 'Invariant NoEffectBelowExternalMax is violated' "$WORK/client-ancestry-provision.log"
python3 client_policy_ancestry.py


# Admission availability is intentionally separate from admission safety.
# Losing the reservation owner's durable evidence must fail liveness rather than
# silently clear the fence. The steal-orphan mutant restores availability by
# clearing another writer's reservation and must violate AtMostOneEffect once a
# delayed arbitrary external effect is allowed to arrive.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/fence-availability-safe" -config FenceAvailabilitySafe.cfg FenceAvailability.tla > "$WORK/fence-availability-safe.log" 2>&1 || { cat "$WORK/fence-availability-safe.log"; exit 1; }
cat "$WORK/fence-availability-safe.log"
grep -F 'No error has been found' "$WORK/fence-availability-safe.log"
if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/fence-availability-orphan" -config FenceAvailabilityOrphan.cfg FenceAvailability.tla > "$WORK/fence-availability-orphan.log" 2>&1; then
 cat "$WORK/fence-availability-orphan.log"; echo 'orphaned admission unexpectedly satisfied liveness' >&2; exit 1
fi
cat "$WORK/fence-availability-orphan.log"
grep -F 'Temporal property PendingEventuallySettles was violated' "$WORK/fence-availability-orphan.log"
if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/fence-availability-steal" -config FenceAvailabilitySteal.cfg FenceAvailability.tla > "$WORK/fence-availability-steal.log" 2>&1; then
 cat "$WORK/fence-availability-steal.log"; echo 'steal-orphan mutant unexpectedly preserved one effect' >&2; exit 1
fi
cat "$WORK/fence-availability-steal.log"
grep -F 'Invariant AtMostOneEffect is violated' "$WORK/fence-availability-steal.log"
python3 fence_availability.py

# An orphan may regain availability only when a separately trusted upstream
# authority permanently closes the exact idempotency identity without applying
# it. A lying closure must expose the delayed double-effect counterexample.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/fence-absence-proof" -config FenceAvailabilityProof.cfg FenceAvailability.tla > "$WORK/fence-absence-proof.log" 2>&1 || { cat "$WORK/fence-absence-proof.log"; exit 1; }
cat "$WORK/fence-absence-proof.log"
grep -F 'No error has been found' "$WORK/fence-absence-proof.log"
if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/fence-absence-lie" -config FenceAvailabilityLie.cfg FenceAvailability.tla > "$WORK/fence-absence-lie.log" 2>&1; then
 cat "$WORK/fence-absence-lie.log"; echo 'lying closure proof unexpectedly preserved one effect' >&2; exit 1
fi
cat "$WORK/fence-absence-lie.log"
grep -F 'Invariant AtMostOneEffect is violated' "$WORK/fence-absence-lie.log"
python3 fence_absence.py


# Exact-idempotency terminal authority. The safe machine is intentionally scoped
# to one current authority history. Rollback and signer+snapshot cloning retain
# the outside-world effect while recreating unused local state and must violate
# AtMostOnePhysicalEffect.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/upstream-terminal-safe" -config UpstreamTerminalSafe.cfg UpstreamTerminal.tla > "$WORK/upstream-terminal-safe.log" 2>&1 || { cat "$WORK/upstream-terminal-safe.log"; exit 1; }
cat "$WORK/upstream-terminal-safe.log"
grep -F 'No error has been found' "$WORK/upstream-terminal-safe.log"
if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/upstream-terminal-rollback" -config UpstreamTerminalRollback.cfg UpstreamTerminal.tla > "$WORK/upstream-terminal-rollback.log" 2>&1; then
 cat "$WORK/upstream-terminal-rollback.log"; echo 'upstream rollback mutant unexpectedly preserved one physical effect' >&2; exit 1
fi
cat "$WORK/upstream-terminal-rollback.log"
grep -F 'Invariant AtMostOnePhysicalEffect is violated' "$WORK/upstream-terminal-rollback.log"
if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/upstream-terminal-clone" -config UpstreamTerminalClone.cfg UpstreamTerminal.tla > "$WORK/upstream-terminal-clone.log" 2>&1; then
 cat "$WORK/upstream-terminal-clone.log"; echo 'upstream clone mutant unexpectedly preserved one physical effect' >&2; exit 1
fi
cat "$WORK/upstream-terminal-clone.log"
grep -F 'Invariant AtMostOnePhysicalEffect is violated' "$WORK/upstream-terminal-clone.log"
python3 upstream_terminal.py


# Independently retained upstream terminal head. Receiver-only signed snapshot
# rollback remains safe relative to the witness. Clone effects before post-effect
# CAS and coordinated receiver+witness rollback are permanent counterexamples.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/upstream-witness-safe" -config UpstreamWitnessSafe.cfg UpstreamWitness.tla > "$WORK/upstream-witness-safe.log" 2>&1 || { cat "$WORK/upstream-witness-safe.log"; exit 1; }
cat "$WORK/upstream-witness-safe.log"
grep -F 'No error has been found' "$WORK/upstream-witness-safe.log"
if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/upstream-witness-clone" -config UpstreamWitnessClone.cfg UpstreamWitness.tla > "$WORK/upstream-witness-clone.log" 2>&1; then
 cat "$WORK/upstream-witness-clone.log"; echo 'upstream witness clone mutant unexpectedly preserved one physical effect' >&2; exit 1
fi
cat "$WORK/upstream-witness-clone.log"
grep -F 'Invariant AtMostOnePhysicalEffect is violated' "$WORK/upstream-witness-clone.log"
if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/upstream-witness-coordinated" -config UpstreamWitnessCoordinated.cfg UpstreamWitness.tla > "$WORK/upstream-witness-coordinated.log" 2>&1; then
 cat "$WORK/upstream-witness-coordinated.log"; echo 'coordinated upstream+witness rollback unexpectedly preserved one physical effect' >&2; exit 1
fi
cat "$WORK/upstream-witness-coordinated.log"
grep -F 'Invariant AtMostOnePhysicalEffect is violated' "$WORK/upstream-witness-coordinated.log"
python3 upstream_witness.py

# Compensation is a new effect and requires both an exact prior APPLIED source
# and a separately scoped causal authorization. The unsafe profiles prove that
# a compensation label, ordinary primary grant or missing source is insufficient.
java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/compensation-safe" -config CompensationAuthoritySafe.cfg CompensationAuthority.tla > "$WORK/compensation-safe.log" 2>&1 || { cat "$WORK/compensation-safe.log"; exit 1; }
cat "$WORK/compensation-safe.log"
grep -F 'No error has been found' "$WORK/compensation-safe.log"
for profile in NoAuth Primary NoPrior; do
 cfg="CompensationAuthority${profile}.cfg"
 log="$WORK/compensation-${profile}.log"
 if java -cp "$JAR" tlc2.TLC -workers 1 -metadir "$WORK/compensation-${profile}" -config "$cfg" CompensationAuthority.tla > "$log" 2>&1; then
  cat "$log"; echo "compensation unsafe profile ${profile} unexpectedly satisfied causal authority" >&2; exit 1
 fi
 cat "$log"
 grep -F 'Invariant CompensationRequiresCausalAuthority is violated' "$log"
done
python3 compensation_authority.py
