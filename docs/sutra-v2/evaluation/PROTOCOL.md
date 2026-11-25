# Living knowledge comparative evaluation protocol (V2-060)

## Freeze and provenance
Target 200 investigations: 40 semantic ambiguity/mistranslation, 40 assumption/counterexample, 40 revision/withdrawal, 30 ancestry, 30 acquisition, 20 replay/tampering. The initial 16-case file is synthetic developer-authored development data, not independently annotated or held out. Never report it as meeting the 200-case gate. Reserve held-out public and expert-reviewed material with distinct provenance, frozen content hash, author/reviewer role, explicit expected outcomes and adjudication. Do not tune implementation against the held-out split. Record exclusions and failures.

## Baselines and measures
Compare matched LLM-only, LLM+search/execution, LLM+solver, multi-agent critique, domain-specific conventional software, SUTRA with same model, and SUTRA with offline/low-cost model. Equalize evidence, model/token/tool budgets, time, review effort and decision stakes. Report accuracy alongside coverage, unsupported decisive conclusions, semantic fidelity and material error discovery, clarification and review time, revision latency and calculation reuse separately, reproducibility, security, cost, task completion and perceived usefulness. Report intervals on properly sampled evaluations; developer-authored pilot counts are not population estimates. Record provider/model/version and actual calls, failures and costs; scripted baselines are not live model evidence.

## First executable pilot
The exact frozen spec and runner live in packages/sutra-knowledge/evaluation/. Compare first-candidate ablation, enumerate-all conditional agreement using the exact compiler, and SUTRA triage. Same reviewed sources and candidate programs are available to all; no semantic generation or source selection measured. The simple enumerate-all baseline is expected to match SUTRA on this narrow task; the integrated workflow must demonstrate value elsewhere (revision, provenance, review effort and discovery). Report the equality if observed; no inflated novelty or performance claim. All expected states are explicit independent of runner outputs, but authored by project development, not external adjudication.

Future: pairwise semantic blind evaluation by independent reviewers; frozen domain-specific public evidence with permission; compare end-to-end user tasks, not only formula results. No fabricated live model results or external disclosure.


## V2-080 — Scoped revision selection pilot

V2-077 and V2-078 exact 10/10 green. Freeze four development cases (two single-source, two all-source edits) with explicit retained/reselected IDs and expected conditional states. Compare exact rebuilt and restored/reselected version bytes; report full and targeted selection counts, and separate diagnostic projected node reuse. All-source controls require zero selection savings. The comparator is full reselection, not a strong incremental editor; no general speed, accuracy, human or novelty claim. Workflow prints and uploads result; exact CI pending. V2-079 pending at observation.


## Prior-art-derived matched experiments

Use [PRIOR_ART.md](PRIOR_ART.md) and prior-art.json as the hypothesis-to-test map, not proof of novelty. Add an execution-signature majority ablation using identical programs and perturbations, a simple enumerate-all comparator, a stepwise review baseline, and full replay versus actual incremental runtime (not projected reuse counts). Freeze independent ambiguity annotations before testing generation; score recall and precision, unsupported decisive conclusions, minority-correct retention, review time, residual errors, and cost. For every reported advantage publish a counterexample or failure mode and matched coverage. Do not copy research datasets without license checks or declare independence of developer-authored cases.


## V2-122 — Freeze 40 assumption development cases before runner

Dataset `packages/sutra-knowledge/evaluation/assumption-development-v1.json`, exact sha256:7b38b07b1c5b3abf904fa527d34945a5192e7c6dd850b36e5e0daf4335fdfd75, 40 fixed cases in ten families. Separate authoring-only exact rational oracle fixed expected baseline states, evaluated world states, structural duplicate groups, distinguishing/unresolved pairs and optimum budgeted review subset. Includes strict/inclusive thresholds, period ambiguity, two- and three-way interaction, wrong population denominator, relative/absolute change, negation, equivalent negative controls, review budget, truncation/refused/unresolved. This is synthetic developer-authored development material; zero external annotations, held-out or live model trials. The 200-case independently reviewed target remains open. Dataset is committed before implementing the evaluator; do not alter expected answers to fit implementation. Next commit adds matched first-world, single-change, greedy and exact subset comparators, with coverage, all-cell correctness and negative results. V2-119 exact nine returned PR workflows green; V2-120/121 pending at observation. Separate push run not exposed.


## V2-123 — Execute frozen assumption development benchmark and repair replay journey

V2-121 exact browser job 139572311602 failed at browser.cjs:718: digest read from collapsed independent-replay details returned empty; knowledge job 139572312178 passed. Preserve failed evidence; open actual disclosure before reading and verify both downloaded pin files, including exact plan digest. Add executable 40-case frozen benchmark (V2-122 digest unchanged), checking baseline, structural groups, every evaluated cell, unresolved and witness pairs, coverage and exact optimum against precommitted rational oracle. Compare equal-grid/equal-budget prefix, single-coordinate greedy, unrestricted greedy and exact selectors; retain case mismatches, negative controls, and greedy counterexamples. No independent labels or measured review time; no 200-case gate credit. CI pending.


## V2-125 — Grounded change workflow and verified 40-case development result

V2-123 exact 977ece7: all nine returned PR workflows green, knowledge 139574926959 and browser 139574927193. Frozen 40/40 matched precommitted expectations; 181 evaluated worlds, 410 executed candidate cells, 28 unresolved cells, 6 no-discovered-pair cases. Equal-grid/equal-budget comparison: prefix 13/42 discovered pairs, 57 review items; single-coordinate greedy 30/42, 26; unrestricted greedy and exact both 40/42, 36 items, 50 changed bindings, zero greedy counterexamples. No advantage over strong greedy in this set; no human-time/semantic-truth/held-out claim. Actual focused-probe browser download independently replayed and tamper-tested. Extend existing mapping panel (not a new parallel workflow): explicit direct/change grammar, exact three selections, conditional expressions shown, preserve blocked alternatives, clear stale previews upon mode/contract/mapping changes. Browser synthetic Unicode two-threshold journey and independent downloaded verifier plus mutations. V2-124 exact CI pending at observation; new candidate CI pending.
