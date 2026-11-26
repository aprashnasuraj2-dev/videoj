# Independent benchmarking and prior art

Draft development only. Parent: `092c7971602ee9e294e467efbb0d72c44121e480`.

Existing open gates: V2-LK17, V2-LK18, V2-B01.

Initial slice: Implement paired comparison scoring with distinct coverage and correctness denominators, refuse mismatched case sets and unknown labels; no real benchmark result implied.

State: implementation candidate; exact CI pending.

Acceptance: Freeze matched budgets and held-out cases before comparison; preserve all failures, report confidence and no unsupported superiority.

No merge, release, live inference or external contact authorized. Child JS CI is scoped; full integration gates remain mandatory. Record exact source and CI evidence here.


## Parallel session candidate
Add strict pinned common per-case budget protocol and usage admission for both paired arms. Missing, duplicated, unknown or over-cap cases refuse. Distinguish declared held-out split/caps from actual frozen benchmark, metering and independent annotation. Next: independently annotated case manifest, actual run logs and comparison against seven baselines.
Exact child CI pending.


## V2-182 candidate
Add pinned split manifest audit with exact per-case content digest and declared source-lineage collision detection across development/held-out splits; match held-out case IDs to independently pinned gold labels, preserve unknown ancestry. No real benchmark run or training contamination claim. Next: rights-cleared independently annotated cases and actual paired metering.
Exact child CI pending.
