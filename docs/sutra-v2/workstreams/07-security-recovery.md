# Security, privacy and recovery

Draft development only. Parent: `092c7971602ee9e294e467efbb0d72c44121e480`.

Existing open gates: V2-LK19, V2-P01, V2-P04, V2-P05, V2-F11b, V2-P06.

Initial slice: Scan admitted route metadata for enrolled credentials before network dispatch; add zero-contact adversary.

State: implementation candidate; exact CI pending.

Acceptance: Preserve rollback counterexamples, expand trust boundary and consent enforcement; no general DLP claim.

No merge, release, live inference or external contact authorized. Child JS CI is scoped; full integration gates remain mandatory. Record exact source and CI evidence here.


## Parallel session candidate
Scan raw and strictly decoded adapter JSON before reserving or contacting transport. Regression: Unicode-escaped credential introduced by a custom encoder, zero contact and zero reservation. JSON adapters remain trusted code, but accidental exact credential echo is blocked. Arbitrary encodings, split secrets and general DLP remain outside this guarantee. Exact CI pending.


## Credential-set publication fence
Refuse in-flight provider completion if any enrolled credential is added or removed after dispatch. This closes the case where an unrelated removed credential would no longer be scanned on late output without retaining its raw bytes. Keep original removed-handle behavior, unknown budget charges, and no retry. Tests remove another profile during a malicious late result and enroll during benign output. Scope: workspace publication boundary only, not remote cancellation, secure deletion, downstream concurrent decoded review or general DLP. Exact CI pending.


## CI adversary correction
Run 45751715482, job 139680814020 failed on the new test's incorrect immediate-retry expectation. An unknown reservation correctly keeps its per-profile active slot. Correct the test to assert BUDGET on same-profile retry and settlement on a distinct eligible profile under remaining global capacity. No weakening to ledger or credential-set fence. Prior failure retained; new exact CI pending.
