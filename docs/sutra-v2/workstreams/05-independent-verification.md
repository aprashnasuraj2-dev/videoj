# Independent verification and replay

**Candidate / draft / no merge or release.** Parent: `092c7971602ee9e294e467efbb0d72c44121e480`.

## Existing open gates
V2-P07-WASM, V2-D01, V2-D02, V2-D03, V2-O04, V2-LK14

## Initial slice
Add a separate verification manifest and acceptance plan for exact replay profiles, not a wrapper around same implementation.

State: Acceptance contract only; implementation pending.

## Next dependency-ready work
Implement independent rational/interval profile parity, mutation corpus, clean build evidence and resource bounds.

## Acceptance and adversaries
Independent implementation rejects forged receipt, missing input and stale pins; no universal truth or certification.

## Verification boundary
Child JS regression is not full integration evidence. Maintain exact source revision, actual job and failure evidence in this file. No automatic authority, deployment, paid inference, or merge. Shared central registers are updated on integration; original open gates remain open.


## Parallel session candidate
Execute existing independently implemented Python Fraction/hashlib verifier from child JS CI on 13 generated positive and 12 forged receipt cases. Cover zero division, propagated blocking, negative rationals, dimensional incompatibility and actual fresh/cache parity. Same-project independent algorithm, not external independent operation. Next: independent domain semantic and interval profiles.
Exact child CI pending.


## V2-182 candidate
Independent Python replay now challenges revision with identical derived sum but changed premises, permutation, dangling references, duplicates and cycles. Three valid and four invalid cases execute independently; same numerical result cannot authorize stale provenance. Cross-language domain-specific verification still pending.
Exact child CI pending.


## V2-184 reuse-first independent interval candidate
The existing independent Python Fraction verifier and actual browser interval replay already exist. Do not recreate them. Extend their bounded differential coverage using the original JS fixture and verifier: eight positive profiles (strict/inclusive, point, mixed signs, identity/dependency, zero and positive divisors, unused range, rational boundary), eight self-repinned authority mutants, one forged node bound and one stale plan pin. Exact child CI pending. This does not establish calibrated uncertainty, probability or full statistical semantics.
