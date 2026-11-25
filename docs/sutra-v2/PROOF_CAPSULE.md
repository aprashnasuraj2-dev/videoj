# Proof Capsule v1 — candidate contract

Scope: the eight-world synthetic conclusion debugger. A capsule is portable evidence for deterministic replay, not a general scientific proof, signed attestation, or freshness protocol.

## Verification

1. Export exact capsule bytes. Retain the expected SHA-256 digest independently (for example, a separately controlled record). Receiving the file and its digest from the same untrusted sender is not authentication.
2. Import into another browser tab or run the Python reference verifier from the same compatible source version.
3. Verify the expected digest against the exact outer bytes, strictly parse the closed envelope, and verify the inner payload digest.
4. Check the fixed computation IDs, mandatory limitations and separately installed case anchor. Reconstruct the entire event-derived state using the reference evaluator. Compare the reconstructed result, including source lineage and observation plan, with the claimed result.
5. Refuse malformed, oversized, changed, ambiguous or semantically fabricated data. Do not mutate the active investigation on import or failure.

CLI from repository root:

    python3 packages/sutra-knowledge/reference/verify_capsule.py capsule.json sha256:<independently-retained-digest>

Maximum input 262144 bytes; existing event bound 24. The outer envelope has exactly format, payloadDigest, payloadText. The payload has exactly format, computation, caseText, caseDigest, state, limitations. The state has version, events, result. The outer pin is not stored in the envelope. JSON permits the closed fixture's safe integer/valid Unicode profile; duplicate keys, malformed UTF-8 and BOM are refused. No network or paid inference is needed.

## Negative controls

A changed byte or whitespace must fail the original pin. If an attacker can replace the pin, rehashed forged results, source bytes, copy ancestry, case and algorithm IDs still fail model replay or admission. An independently retained old pin will verify the matching older valid snapshot: this is intentional and prevents overstating freshness. Coordinated replacement of the trusted pin and valid older snapshot is not detected by this contract. Unknown copying and correlated source errors remain outside the declared model.

The browser verifier shares the JavaScript implementation; independent reproduction is the separate Python evaluator, executed against browser-produced bytes in CI. Candidate until exact-source knowledge push/PR and auxiliary gates pass.

## Verified source

Exact source 0d6305526d28df4064360162f1125835ca8f9962 passed all nine observed workflows. Browser job 139051201292 independently verified the actual exported current and old snapshots, including the old-pin counterexample. This promotes only the stated bounded capsule contract. The separate D03 diagnosis artifact does not alter the capsule v1 wire.
