# Refreshed rules and specification baseline

Retrieved 23 November 2026 from the official rules, challenge page and pinned GitHub sources. This is an implementation map, not a claim of conformance.

## Official entry constraints

Deadline remains 11 January 2027, 16:00 UTC /21:45 Nepal time. Judging ends 18 January, 17:00 Pacific /19 January, 06:45 Nepal. Required: working public browser site, conforming JSON, browser runtime, interaction UI, description, screenshots and public YouTube browser demo under two minutes with entrant explanation. English or English translation is required. Existing projects need significant competition-period updates; integration rights remain necessary. Judges receive free access through judging. Conformance is pass/fail, then four equal criteria. Shared additional tools may support impact. BYOK and Otari are optional; actual Otari use triggers account/feedback fields. Eligibility remains participant-confirmed.

Sources: [rules](https://cognizant-agenticweb.devpost.com/rules), [requirements](https://cognizant-agenticweb.devpost.com/). No material divergence from the existing planning baseline was observed. This is not an assertion of identical historical HTML snapshots. Recheck before release/filing.

## Version pin and review

- Launch-time document: Profile 0.2, 6 November 2026, commit `fd872b9221aeb8ff762b75a5badbf84b23c133cc`.
- Current document: Profile 0.3, 18 November, document-change commit `a0ceda34e4f2e653223e13e63282abc9b60eaf7c`; current blob `b72fcdf433e323e30a6052e9e0c0718b835672c1`.
- [Exact refreshed diff](evidence/spec-diff.patch): header, reference links and wording/typos; no substantive core behavior change observed.
- The rules name the specification at the submission period start. Preserve 0.2 as that baseline and document compatibility with 0.3. No unresolved version conflict was found requiring an organizer clarification now.
- [Launch source](https://github.com/cognizant-ai-labs/agentic-web/blob/fd872b9221aeb8ff762b75a5badbf84b23c133cc/docs/worldwide_agentic_web_mvp_spec.md), [current pin](https://github.com/cognizant-ai-labs/agentic-web/blob/a0ceda34e4f2e653223e13e63282abc9b60eaf7c/docs/worldwide_agentic_web_mvp_spec.md).

## Requirement-to-evidence map

All implementation ownership below is E (engineer); participant/video/rights ownership is P. Exact task texts and eight concrete checks per phase remain in the master checklist. Public URLs in this project are proposals until deployment is verified.

| Requirement | Task coverage | Observable evidence / current status |
| --- | --- | --- |
| Neuro SAN-compatible resolved data, unique front and callable schemas | P021, P024 | Valid/invalid graph fixtures and public data; pending |
| Public manifest, graph, links, runtime and HTTPS artifact access | P022, P034, P082 | Exact artifact URLs, correct types and actual browser access; pending |
| Actual JavaScript graph execution and grounded capability | P023, P027, P035 | Browser trace with internal delegation; shell alone is insufficient |
| Caller-local peer instantiation and exact named resolution | P031-P035, P071 | Approved second-origin load and wrong-name rejection; pending |
| Consent, redirects, context denial and inherited inference | P030, P033, P036-P039 | Denied-contact/canary/router tests; pending |
| Finite work, invalid input and truthful action outcomes | P024, P028-P029, P061-P063 | Cycle/limit rejection and unknown-write handling; pending |
| Funded accessible judge path | P025, P066, P089 | Clean visitor completes live task without private setup; pending |
| Human demo, screenshots and accurate English copy | P091-P100 (P+E) | Actual public assets and filing state; pending |
| Authorized original lesson and eligibility | P001, P015 (P) | Participant-confirmed outcome and provenance; pending |
| Reusable community tools | P057-P060, P076, P084, P092 | Standalone validator exists; outside adoption, inspector/starter and release remain pending |

## Required versus optional versus project choice

Publication, browser orchestration, schemas, consent/privacy and bounded execution are core obligations. BYOK, executable peer bundles, A2A discovery cards, registries and hosted scheduling are optional extensions; omit them rather than imply nonexistent support. The detailed interoperability checks demonstrate second-origin loading even though the headline site-interaction wording permits narrower uses; SUTRA retains the stronger demonstration target.

Exactly 40 evaluation cases, 20 live runs, 10 target users, two outside builders, latency/spend limits and the chosen domain names are project targets, not organizer mandates. The existing source-consistency validator checks references/bytes against a supplied catalog, not semantic truth. A matching catalog can itself be incorrect.

Release-time recheck is owned by P090-01 and the final P098/P099 claims audit. If future normative changes conflict with the launch baseline, record a decision and seek organizer clarification on that concrete ambiguity before asserting conformance.
