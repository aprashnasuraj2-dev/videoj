# Effort and resource capacity worksheet

Offline arithmetic from 100 original phase estimates and the disabled Worker configurations. Run from root: `node tools/sutra-provider-measurement/capacity.mjs` and `node --test tools/sutra-provider-measurement/capacity.test.mjs`. Not observed provider usage, actual availability, a production forecast or spend approval.

| Workstream | Original person-hours |
| --- | ---: |
| Strategy | 11 |
| Foundations | 17 |
| Browser runtime | 21.5 |
| Peer trust | 18.5 |
| Learner | 17 |
| Grounding/community | 18 |
| Resilience/cost | 14.5 |
| Validation | 21 |
| Public release | 15.5 |
| Submission | 14.5 |
| Total | 168.5 |

15% integration-failure contingency = 25.275 hours; total 193.775 (~193.8). E-only 115, P-only 9, joint 44.5 (count once, not per person). Illustrative combined capacities 2/4/6 person-hours/day yield 97/49/33 working days for the **entire original baseline**. Actual capacity and remaining hours are unknown; counts are not effort-weighted.

## Capacity and sensitivity

Both candidate Worker configs are disabled with empty model allowlists: 100 admissions/day, 8/client/day, 2 concurrent, 3,379,200 input JSON bytes/day, 51,200 requested output tokens/day and 512 output tokens/call. Private source quota separately 10,000/day and 500/client. Eight model calls per composed attempt is the runtime default; four is illustrative.

A = min(daily admissions, floor(daily input bytes / bytes per call), floor(daily output tokens / requested output per call)). Whole tasks = floor(A / calls per task), also subject to client limit.

| Scenario | Bytes/call | Requested output/call | Admissions | Tasks global | Tasks/client |
| --- | ---: | ---: | ---: | ---: | ---: |
| 4 calls | 16,896 | 512 | 100 | 25 | 2 |
| 8 calls | 16,896 | 512 | 100 | 12 | 1 |
| 4 calls, doubled JSON bytes | 33,792 | 512 | 100 | 25 | 2 |
| 4 calls plus explicit full retry | 16,896 | 512 | 100 | 12 | 1 |
| 8 calls, hypothetical doubled output | 16,896 | 1,024 | 50 | 6 | 1 |

Eight-call base leaves four reservations, doubled output two. Concurrency, latency, prior consumption, source usage and failures can reduce throughput. Ambiguous admissions remain charged. No automatic retry; retry here is a separately initiated attempt. No config change. Input bytes are not prompt tokens.

Assume 4 calls, 2,000 prompt and 400 completion tokens each, not measured. P_i/P_o are approved USD per million prompt/output tokens.

| Scenario | Calls | Prompt | Output | USD expression |
| --- | ---: | ---: | ---: | --- |
| Base | 4 | 8,000 | 1,600 | 0.008 P_i + 0.0016 P_o |
| Double context | 4 | 16,000 | 1,600 | 0.016 P_i + 0.0016 P_o |
| Explicit full retry | 8 | 16,000 | 3,200 | 0.016 P_i + 0.0032 P_o |
| Both | 8 | 32,000 | 3,200 | 0.032 P_i + 0.0032 P_o |

Actual provider/model prices, billed tokens, approved spend and judging reserve are unknown. Quota is not a billing guarantee.

## Cost categories and missing inputs

| Category | Basis | Unknown |
| --- | --- | --- |
| Local retrieval | Zero model calls and additional question-time network after source load | CPU/RAM, source/media transfer, real visitors |
| Hosted inference | Disabled; formula only | Approved model, prices, billed tokens, failure costs, ceiling, reserve |
| Self-hosted | Optional tested transport | Hardware, licensed weights, power, energy, gateway, maintenance, latency |
| Hosting/edge | Separate static candidates, bounded Worker and DO | Account billing/headroom, actual traffic and prices |
| Media | Synthetic fixture | Rights-cleared bytes, delivery volume, storage/egress |
| Optional services | No mandatory additional paid service chosen | Subscription/license/approval |
| Human acceptance | Not established | Testers, physical devices, factual reviewer, participant availability |

Do not replace unknown with zero. No paid activation or deployment.

## Scope cuts

1. Continue deferring unshipped optional WebGPU/weight-download experiments.
2. Defer unapproved optional self-hosted experiments and extra comparison variants before weakening deterministic local evidence; mandatory funded-judge and real-model gates cannot be waived.
3. Cut nonessential examples and cosmetic variants, never consent, evidence, accessible recovery, rights/factual review, physical/human acceptance or mandatory submission work.

Keep P007-02, P007-04, P007-07 and P007-10 open until participant availability, approved spend, judging reserve and phase exit are genuinely supported. This document is planning evidence only.
