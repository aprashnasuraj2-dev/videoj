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
