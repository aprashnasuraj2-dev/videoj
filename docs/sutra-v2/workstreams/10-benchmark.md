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


## V2-183 candidate — independent held-out FinQA comparative benchmark
Freeze the semantic operation profile on the disjoint FinQA ID-ranked development slice 1–24, then benchmark ranks 25–64 (40 cases) without changing supported operations after inspection. The full 1,147-ID FNV rank inventory proves label-blind selection. Seven offline arms are compared case-by-case: SUTRA exact gold-program IR, Float64 gold-program execution, single-step exact, first-step exact, final-literal exact, a naive question-number difference heuristic, and abstain-all. An independently implemented Python Fraction scorer validates the third-party gold programs, scores coverage and correctness separately, emits Wilson 95% intervals, declared operation counts, failure IDs and paired errors versus SUTRA. The expected counterexample is explicit: Float64 can tie exact arithmetic on these simple cases, so no arithmetic-superiority claim is permitted. This is a held-out benchmark of annotated program execution/abstention, not natural-language retrieval/program induction, live LLMs, production latency/cost, or financial advice. Dedicated CI uploads predictions and score artifacts. FinQA is MIT licensed; exact upstream commit/blob are retained. Exact CI pending.
