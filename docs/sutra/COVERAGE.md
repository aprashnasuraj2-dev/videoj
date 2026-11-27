# Cross-cutting coverage and acceptance

[Checklist](CHECKLIST.md) | [Progress](PROGRESS.md) | [Resume](CONTINUE.md)

The detailed task text contains the individual checks. This map prevents responsibilities from disappearing between workstreams. Links target the relevant workstream; task IDs are exact search keys. Requirements must be rechecked against official sources during implementation/release.

## Coverage map

| Concern | Primary task IDs | Evidence required before claiming success |
| --- | --- | --- |
| Eligibility, representation and rights | P001-01..08, P015-01..08 | Actual participant outcome and safe provenance; no public identity/permission documents |
| Significant competition-period work | P003-01..08, P011-01..08, P091-01..08 | Baseline versus shipped source and a factual description of new work |
| Portable canonical graph | P021-01..08, P022-01..08 | Resolved Neuro SAN-compatible data and real public manifest/network URLs |
| Browser execution, not a server chatbot | P023-01..08, P035-01..08 | Browser invocation/delegation trace and actual configured model requests |
| Input validation and budgets | P024-01..08, P028-01..08, P040-01..08 | Valid control plus malformed graph, cycle, limit and denied-origin results |
| Exact network resolution and public CORS | P032-01..08, P034-01..08, P071-01..08 | Real cross-origin fetch and exact-match failures from a neutral consumer |
| Consent before every unauthorized contact | P033-01..08, P037-01..08, P039-01..08 | Network evidence of zero contact after denial, redirects and MCP checks |
| Caller-owned inference and secret isolation | P025-01..08, P030-01..08, P036-01..08, P063-01..08 | Funded default path, canary checks and no peer router override |
| Local action review and truthful receipts | P027-01..08, P029-01..08, P046-01..08, P062-01..08 | Validated catalog calls, cancel/no effect and unknown-outcome behavior |
| Injection and untrusted instructions | P038-01..08, P052-01..08, P064-01..08 | Adversarial fixtures with deterministic origin/action/credential boundaries |
| Accurate media behavior and source identity | P016-01..08, P019-01..08, P042-01..08, P043-01..08, P056-01..08 | Actual decode/clock/seek/cue observations and drift warnings |
| Grounding, uncertainty and conflicting sources | P045-01..08, P051-01..08, P052-01..08, P055-01..08 | Corpus-backed excerpts, invalid-reference rejection and honest abstention |
| Accessibility, narrow screens and languages | P044-01..08, P048-01..08, P049-01..08, P077-01..08 | Keyboard/touch/zoom/announcement checks with real device distinctions |
| Shared hosting, range requests and caching | P019-01..08, P065-01..08, P067-01..08, P068-01..08 | Dated route usage, correct bytes/headers and verified media behavior |
| Spend, retries and abuse | P007-01..08, P063-01..08, P066-01..08, P069-01..08 | Actual token/request measurements and exercised spend stop control |
| Community tools usable independently | P009-01..08, P057-01..08, P058-01..08, P059-01..08, P084-01..08 | Standalone schema/validator, inspector and starter installation results |
| Outside reuse and honest impact | P074-01..08, P075-01..08, P076-01..08, P086-01..08 | Actual participant count, interventions, baseline comparison and limitations |
| Public release, reproducibility and rollback | P081-01..08, P082-01..08, P083-01..08, P087-01..08, P089-01..08 | Exact deployed hashes, clean checkout results and staging rollback evidence |
| Human-led video and submission materials | P091-01..08, P092-01..08, P093-01..08, P094-01..08, P095-01..08 | Actual under-two-minute public browser demo with entrant explanation, screenshots and truthful copy |
| Final ZIP and separate official submission | P098-01..08, P099-01..08, P100-01..10 | Final claims audit, clean unzip/checksums, delivered package and separately observed filing state |

Task IDs above omit the `SUTRA-` prefix only for readability. Full IDs in checklist files, records and evidence always include it.

## Targets, not existing results

| Measure | Original proposed target | Required interpretation |
| --- | --- | --- |
| Frozen evaluation | 40 cases: 20 answerable, 10 unanswerable, 10 conflicting/adversarial | Report actual numerators and failures; do not tune away held-out cases |
| Reference correctness | 100% valid source/cue references; >=95% supported-claim precision | Syntactic validity is not factual correctness; semantic review remains necessary |
| Live hero runs | >=19/20 successes; p95 <=25 seconds | Fixed success definition, fresh sessions, dated provider/model and percentile method |
| Target-user pilot | >=8/10 unaided completions | Actual count and coaching stated; no broad population inference |
| Manual comparison | >=30% lower median time to valid evidence, no accuracy loss | Counterbalanced paired tasks where possible; preserve negative results |
| Community installation | Two outside builders, each <=15 minutes | Record all interventions; same-owner origins and teammates do not count |
| Client performance | Shell <=700 KiB compressed; transcript usable <=5 seconds at stated 1 Mbps/150ms lab profile | Runtime, model and media bytes reported separately; name device/browser |
| Supported seek | Actual media time within one second of validated cue | Use actual media metadata/ranges, not simulated progress |
| Demo length | Strictly under 120 seconds, target 105-115 | Human entrant narration and real browser operation; public YouTube playback |
| Planning capacity | 168.5 base hours +15% reserve =193.8 hours | Estimate only; actual capacity and progress must be measured |

## Evidence-quality gates

- Product behavior: record source revision, command or observation, result and reproducible artifact.
- External facts: record source URL, retrieval time and the relevant version/date; recheck unstable facts when used.
- Security: describe the mechanism checked, canary/fixture, blocked action and residual limits. Passing a finite suite is not universal security proof.
- Research: preserve actual sample sizes, recruitment and interventions. Small convenient samples establish early usability only.
- Deployment: compare exact public artifacts and release manifests; a successful build or staged branch is insufficient.
- Package: open the actual delivered archive and verify it; a generated filename alone is insufficient.
- Submission: only an observed filing confirmation establishes submitted state; a completed draft or ZIP does not.
- Counterevidence: retain manual-search wins, failures, untested hardware and unavailable services. Update claims rather than hiding results.

## Primary reference links

- [Official rules](https://cognizant-agenticweb.devpost.com/rules)
- [Challenge requirements](https://cognizant-agenticweb.devpost.com/)
- [Launch-time Profile 0.2](https://github.com/cognizant-ai-labs/agentic-web/blob/fd872b9221aeb8ff762b75a5badbf84b23c133cc/docs/worldwide_agentic_web_mvp_spec.md)
- [Current-document Profile 0.3 baseline](https://github.com/cognizant-ai-labs/agentic-web/blob/a0ceda34e4f2e653223e13e63282abc9b60eaf7c/docs/worldwide_agentic_web_mvp_spec.md)
- [Reference runtime](https://github.com/cognizant-ai-lab/nsdeploy/tree/main/nsdeploy/runtime)
- [Cloudflare static assets and range behavior](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)

These links are inherited from the verified planning session. This documentation-only bootstrap did not re-run public-site/provider checks; Phase 003 and the release recheck own fresh verification.
