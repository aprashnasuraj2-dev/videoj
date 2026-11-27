# SUTRA delegation revision — direct evidence before orchestration

## Decision

Literal source lookup now takes the simplest sufficient path: deterministic local catalog search. Agent/model orchestration remains available for interpretation and portable composition, but the number of agents is not a quality metric.

## Paired engineering result

Exact measured revision: `3a1309bab9cd8d08ce32866118c94f3207a5209e`, [engineering evaluation workflow](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45312799732).

| Measure | Direct lookup | Delegated source learner |
| --- | ---: | ---: |
| Synthetic retrieval cases | 20 | 20 |
| Exact expected cue sets | 20/20 | 20/20 |
| Median same-process time | 0.035867 ms | 3.404983 ms |
| Scripted model calls | 0 | 90 total |
| Median scripted model calls/case | 0 | 4.5 |
| Source-handler RPCs | 0 | 90 |
| Paid-provider tokens | not measured | not measured |
| Semantic precision | not measured | not measured |

The direct path therefore removed 90 scripted model calls and 90 source RPCs in this 20-case literal-retrieval fixture while preserving the exact cue-set result. The timing ratio is a same-process laboratory observation, not production/network latency.

The same evaluation run retained ten adversarial comparison cases, all with the expected safe handling. It does not substitute for the future human-reviewed 40-case held-out set.

## Product revision

The visible learner exposes exact-wording lookup before optional model inference. A matched receipt is independently catalog-validated, can seek only when the exact source/media identity is loaded, and requires explicit review before local persistence. Changing the query clears old actions.

The optional provider path uses the same receipt-action boundary after its model run: model text itself does not authorize media transfer or saving. Interrupted provider runs preserve only independently catalog-matched completed receipts and never completed partial model text.

## Delegation boundary

The source network keeps the learner/evidence roles for cases where orchestration is actually being exercised. Evidence selection remains read-only and bounded; source-reference validation stays outside model preference. The direct path does not pretend the agent graph is necessary for literal search.

## Remaining measurement gap

`SUTRA-P054-01` remains open. Real funded-provider model calls, actual input/output tokens and price basis have not been measured. Therefore phase 054 cannot close under its exit condition yet, and this artifact does not project token cost from scripted calls.

Future live measurement must record the exact provider/model, source revision, token-usage completeness, price basis and failures. If a provider does not return complete usage, report cost as unknown rather than estimating it silently.