# SUTRA — Devpost pre-release gates and award strategy

**Audit date:** 2026-11-27. **Decision: NO-GO for production connection/cutover.**
**Target:** Cognizant Open Agentic Web Challenge; one canonical SUTRA product.
**Audited main:** `b3d4ac7aa7fafbbeb200a5d73c7e549ba5f47be7`.
**Audited integration candidate:** PR #66, `fee6ad6efc69063bdf056541a349376f8c0a57dc`.
**Official deadline:** 2027-01-11 16:00 UTC / 21:45 Nepal (08:00 PST). Internal submission freeze: January 9. Keep judge access operational through January 18, 17:00 PST (January 19, 06:45 Nepal).
**Scope:** This is the release acceptance overlay to the existing active [CHECKLIST.md](CHECKLIST.md), not a second competing engineering queue and not authorization to merge, deploy, enable paid inference, change DNS or submit. Existing broad engineering obligations remain open unless their own acceptance is met. The owner must separately authorize preview and production changes.

## 0. Evidence and governing requirements

Sources inspected on the audit date:
- [Official rules, sections 4–6](https://cognizant-agenticweb.devpost.com/rules) — public working browser product, required artifacts and submission material, eligibility, pass/fail conformance first, four equal scoring criteria second, technology first in tie-breaking.
- [Challenge page](https://cognizant-agenticweb.devpost.com/) — public demonstration, browser runtime, portable JSON, interface, optional visitor model/key setup, open-source community contributions, human-narrated video under two minutes.
- [Sponsor specification](https://github.com/cognizant-ai-labs/agentic-web/blob/main/docs/worldwide_agentic_web_mvp_spec.md) — currently displayed MVP Profile 0.3, 18 November 2026, sections 2–6 (portable network, browser execution, peer composition, model routing, safety, interoperability). **Rules refer to the specification at submission-period start, November 11 PST; the displayed November 18 revision is later.** Do not infer that the current main document is the frozen eligibility version. Obtain its start-date commit and compare; meet the current stricter applicable requirements and clarify differences with organizer if necessary.
- [Sponsor repository](https://github.com/cognizant-ai-labs/agentic-web), [challenge schedule](https://cognizant-agenticweb.devpost.com/details/dates).
- Repository PRs [#48](https://github.com/aprashnasuraj2-dev/videoj/pull/48), [#49](https://github.com/aprashnasuraj2-dev/videoj/pull/49), [#63](https://github.com/aprashnasuraj2-dev/videoj/pull/63), [#65](https://github.com/aprashnasuraj2-dev/videoj/pull/65), [#66](https://github.com/aprashnasuraj2-dev/videoj/pull/66); root README, current mandate, research README, V2 build, static headers, Pages packaging verifier and private Worker config.
- CloudflareB Pages project `sutra`: read-only project metadata verified via account API. Public HTTPS page/manifest could not be retrieved in this audit environment; control-plane deployment success is not public browser verification.

### What is actually verified (not release completion)
| Evidence | Observed scope |
|---|---|
| [Candidate research CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45993729132) | 59 tests passed, 0 failed; 128 synthetic sessions, 1,512 simulated search/document operations, 88 injected or recorded failures, 826 admitted documents and validated passages; **0 live search calls in this suite**. |
| [Candidate browser CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45993729376) | Current candidate workspace workflow passed; earlier [explicit browser run](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45992992081) exercised local host fixture, original workspace and accessibility tests. Not a public hosted session. |
| [All candidate checks](https://github.com/aprashnasuraj2-dev/videoj/commit/fee6ad6efc69063bdf056541a349376f8c0a57dc/checks) | 13 completed successful workflows at audit. Includes Cloudflare ingress dry-run, not production deployment. |
| [Live model smoke](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45993676972) | Gemini 3.5 Flash-Lite: passed, 681 ms, 24 reported output tokens; Groq GPT-OSS 20B: passed, 291 ms, 64 reported output tokens; OpenRouter free route: RESPONSE failure. Synthetic prompt sent to real provider. Not a quality comparison, web search or end-to-end investigation. |
| [V2 evaluation protocol](evaluation/PROTOCOL.md) | Frozen synthetic development evidence and narrow exact verification; no independent human 200-case end-to-end benchmark demonstrated by these records. |
| [Research package](../../packages/sutra-research/README.md) | Local bounded research, model-selected web access, cited candidates, review, loopback gateway and PostgreSQL persistence candidate. Real DB concurrency, production integration, live search and cross-site production behavior remain release gates. |

**Evidence policy:** [ ] pending; [!] external blocker; no [x] solely for source code, mock test, preview, screenshot, HTTP 200, old CI or assertion in a PR body. Record exact commit, command, test environment, artifact URL/hash, observed result, limitations, owner and reviewer when closing each item. If candidate changes, rerun affected gates. Never report source citation integrity as empirical truth or a different provider as independent reasoning.

## 1. Product decision and judging fit

One sentence: **SUTRA turns research into living, challengeable knowledge: browser-run portable agents gather and inspect evidence, expose assumptions, compare conclusions, and show precisely what changes when evidence changes.**

Primary audience proposal: researchers and analysts who repeatedly revisit evidence-linked decisions; first demonstrate a bounded, public-data research/engineering scenario. Secondary finance/education only after the primary journey is coherent. No clinical, investment, engineering certification or autonomous transaction claim.

| Judging axis | Weight | Strength in candidate | Missing judge-visible proof |
|---|---:|---|---|
| Conformance | Pass/fail prerequisite | Inherited learner runtime/peer fixtures; public guide artifacts in build verifier | Actual current orbital product publishes and executes interoperable network, cross-origin test, working default inference or admissible visitor route, exact spec revision |
| Technological implementation | 25% | Deterministic kernel, versioned evidence, bounded execution, model pool, citations, replay | Bridge browser network to real tools and real research; portability, independent consumer, reliable public service |
| Design | 25% | Orbital workspace, six visual characters, accessibility and theme fixtures | Objective-first public launch, low setup friction, live task status, understandable evidence and challenge flow |
| Potential impact | 25% | Auditable revision, portable proof, open components | Specific user pain, real use, independent evaluator, fair matched comparison, reusable community kit |
| Quality of idea | 25% | Revision-aware knowledge and deterministic challenge, rather than just answers | Demonstrate consequential source correction and portability; explain precisely where plain LLM + search is insufficient |

Do not compete on agent count, number of commits, animations, test totals, claimed benchmark superiority, or generic answer generation. **Conformance first; evidence-change demo second; hardening and polish in service of those.** The orbital characters are presentation/operation metaphors, not six model accounts. Shared, user-selected model connections; one model must suffice; web access is an optional capability, not a separate mandatory research model. Distinguish deterministic local tools, actual provider responses, recorded execution and explicit synthetic rehearsal.

Recommended effort allocation after inventory (internal planning estimate, not official scoring): 35% conformance + integration; 25% public vertical slice/reliability; 20% real-user evidence and comparison; 15% coherent design/demo; 5% submission/operational buffer. Reject an all-purpose public backend or feature explosion before the browser gate. Keep broader roadmap work, but explicitly defer noncritical functionality from this release.

## 2. Branch consolidation (P0, before release)

Observed 121 branch names across paginated branch search; five open PRs. Branch count is history, not 121 active workstreams. No branch deletions or merges authorized by this audit.

| PR | Branch | Ahead / behind current main | Audit disposition |
|---|---|---:|---|
| #66 | sutra/master-investigation-ui | 93 / 0 | Primary candidate; all 13 CI workflows green at audited head; 150 changed files per PR metadata; do not merge until release gates and overlap resolution |
| #65 | sutra/orch-002-capability-negotiation | 2 / 0 | Integrate capability negotiation deliberately; seven checks green at its own head, overlaps inference/knowledge paths with #66 |
| #63 | sutra/hist-010-durable-history-workspace | 3 / 11 | Diverged, not mergeable; current checklist records durable-history reconciliation on main. Compare exact changes and preserve unique recovery regressions; close only after equivalence demonstrated |
| #49 | sutra/caller-peer-failure-boundary | 198 / 557 | Diverged, not mergeable; current public Pages tracks this branch. Extract useful peer/learner/release evidence and unique changes, never blanket merge; two observed CI failures (learner shell, engineering evaluation) |
| #48 | sutra/peer-invocation | 281 / 1232 | Diverged, not mergeable; historical peer/MCP work; inspect unique portability/security coverage, transplant only missing reviewed changes |

- [ ] REL-B01 Freeze integration inventory: list all heads, merge bases, unique commits, path overlaps, old release tags and deployed SHAs; record machine-readable inventory. Recheck before merge.
- [ ] REL-B02 Compare #65 vs #66 per overlapping file (provider/protocol workspace, scheduler, approved council and tests); preserve capability negotiation, route admission and budgets. Test one model, multiple models, unavailable capability, no silent substitution.
- [ ] REL-B03 Reconcile #63 against main and #66; compare host/CAS stale state, lost reply, history export and recovery tests. No duplicate history authority.
- [ ] REL-B04 Reconcile #48 and #49 against current browser runtime, MCP, peer publisher, source rights and Cloudflare paths; identify exact unique requirements and dependencies. Reproduce and triage #49 failures; distinguish superseded learner failures from applicable regression.
- [ ] REL-B05 Compare ten historical parallel streams, earlier codex/sutra, release validation and packaging branches against canonical main; preserve provenance, tags and tests. Do not resurrect old implementation or retired product queues.
- [ ] REL-B06 Inventory historical DHAGO/DETOUR/AFTERIMAGE and dist branches; exclude retired products from active build and runtime. Do not delete history or remove imported dependencies without proof. Other prototypes are not SUTRA release candidates unless explicitly reviewed.
- [ ] REL-B07 Integrate into existing #66 (or one owner-approved integration ref only); prohibit additional competing product branches. Record merge/cherry-pick choices with reason and source SHA. Preserve main until reviewed.
- [ ] REL-B08 Resolve stale requirements: README, LIVING-KNOWLEDGE.md, OPEN-MODEL-CONNECTIVITY.md, research README, PR body and UI must agree on shared model pool, optional web layer, public conformance, and actual limits. Historical role-specific manifests remain compatibility only, not default config.
- [ ] REL-B09 Make one artifact from exact integrated revision with reproducible lockfiles. Rerun all applicable CI (not merely previous head), impact classification, integration and browser suites; skipped/failing required check blocks release.
- [ ] REL-B10 Protect main: required reviews/checks, no forced pushes, deployment gated separately, retain recovery tag and previous Pages deployment ID; obtain owner approval before merge or connecting production.

## 3. Conformance gates (P0, hard release blockers)

**Critical finding:** current canonical V2 build is copied by deploy/sutra-pages/prepare.mjs. The older apps/sutra publishes learner agent JSON, but checked canonical V2 paths public/agents/agent-manifest.json, links.json and investigation.network.json are absent. Its build contract currently checks compiler/verifier/static headers, not a complete caller network. The guide has its own published artifacts, not a substitute for current caller publication. Candidate root CSP is self-only; prepared Pages CSP admits a single guide origin. Neither local research gateway nor separate Node CLI establishes browser-native portable graph execution.

- [ ] REL-C01 Pin official November 11 spec commit/hash and current MVP 0.3; record delta/organizer clarification. Write normative MUST/SHOULD/optional mapping with source section and exact executable evidence.
- [ ] REL-C02 Publish current investigation network via publicly accessible /agents/agent-manifest.json with stable names, front entry and resolved graph, declared default router and peer policy as applicable. No environment substitution, secret or legacy-only description.
- [ ] REL-C03 Export resolved Neuro SAN-compatible declarative JSON/HOCON graph for at least two functional agents. Unique names, explicit instructions, invocation schemas, tool references, closed private fields, bounded parameters. Do not invent private spec extensions as mandatory.
- [ ] REL-C04 Provide actual browser JavaScript runtime entry and documented import/call surface; use existing pinned runtime. Load/validate the published graph itself, not merely a separately hand-coded Node equivalent. Show browser trace identifies network/version/front agent.
- [ ] REL-C05 Validate malformed JSON/HOCON, unknown schema/version, duplicate names, absent front agent, dangling references, unresolved includes, arbitrary executable definitions and over-size inputs before model or remote calls.
- [ ] REL-C06 Execute real internal delegation and one grounded registered local site action or MCP tool from the graph; tool JSON schema validates both boundary and arguments; visible refusal and structured result. Expose current evidence/inspection or revision proposal tool, not a generic echo.
- [ ] REL-C07 Demonstrate actual selected model output, streaming where applicable, bounded tool loop, agent-to-agent calls, cancellation and error propagation in ordinary browser; browser retains orchestration, even when inference/web capability uses host service.
- [ ] REL-C08 Provide a working keyless publisher-default route (recommended for judges) or equally usable compliant public testing route. BYOK optional; if offered, test permitted router/model/key input, credential removal and non-disclosure to peers. No forced multi-model setup.
- [ ] REL-C09 Implement and verify visitor-selectable/custom compatible models under trusted adapter policy; no vendor-to-avatar configuration; unsupported capabilities fail closed. If custom endpoints unavailable at release, explicitly label supported route limitations; do not claim unrestricted BYOAPI.
- [ ] REL-C10 Publish links.json if named peer links used; bind to exact published network names and retain caller-owned overrides independently.
- [ ] REL-C11 Host second actual HTTPS peer/guide on separate origin; validate peer manifest/graph discovery and CORS for public artifacts only. Verify exact-name selection, wrong name refusal, redirects and origin policy.
- [ ] REL-C12 Browser loads and runs peer graph locally under caller's router/credential/budgets; use reference runtime or independent neutral consumer to load SUTRA's graph too. Capture real browser network trace and exact artifact SHA; no claim of independent owner if same owner.
- [ ] REL-C13 Consent before third-party manifest/discovery/call; destination and purpose visible; deny causes zero outbound call; redirect changes destination rechecked; explicit per-session trust scope and revoke. MCP discovery and invocation independently gated.
- [ ] REL-C14 Private-context deny by default; explicit allowed fields and destination-bound exceptions; no key, session, private evidence or unapproved source text to peer, prompt or ordinary tool result. Prove with canaries and network logs.
- [ ] REL-C15 Enforce finite composition depth, agent calls, tool calls, remote calls, concurrency, context and elapsed time. Test denied origin, malformed peer, recursion/cycle, exhausted budget and cancelled run; repeated valid calls are not automatically a cycle.
- [ ] REL-C16 Site actions: registry name/purpose/schema/effect/handler, exact arguments and destination reviewed before irreversible action; unknown outcomes never silently retried or called success. Read-only demo may keep writes disabled.
- [ ] REL-C17 Peer instructions/source content untrusted; no prompt can grant capabilities, change router, bypass validation or authorize external writes. Disable optional coded peer bundles unless integrity and isolation proven.
- [ ] REL-C18 CORS/CSP alignment: public artifact GET from neutral origin works with no credentials; private API never wildcard CORS; keep CSP narrow. Cross-origin browser MCP requires actual CORS or approved bounded same-origin bridge; no unrestricted proxy.
- [ ] REL-C19 Independent conformance runner exercises sponsor reference fixture, SUTRA graph as consumer, SUTRA graph as publisher, second-origin peer and negative cases in fresh Chromium. Save report with assertion count, failed checks, revision, URL and browser network evidence.
- [ ] REL-C20 Repeat mandatory browser and publication checks against exact deployed HTTPS release candidate; no localhost-only pass, mock substitution or manifest-only claim. Hard GO only when pass/fail matrix complete.

## 4. Real research and coherent knowledge vertical slice (P0/P1)

- [ ] REL-R01 Configure search as an optional host capability using at least one authorized actual backend (Brave/Tavily or approved alternative). Missing search must be explicit; no fake search or fixed vendor dependency. Obtain credentials/terms before contact. Run both configured adapters live where available; record failures separately.
- [ ] REL-R02 Test real public retrieval and extraction from stable licensed sources, including HTML, plain text, structured CSV/JSON, redirects, robots denial, unavailable source, cancellation. Direct known URL does not prove search discovery. PDF disabled publicly until sandbox actually validated; no OCR or JS-render claim.
- [ ] REL-R03 Complete at least 20 distinct live research tasks as a release target, not an official contest requirement: include no-web, simple fact lookup, conflicting sources, date/unit comparison, correction and unavailable-web cases. At least one model works end-to-end; alternate model on identical task. Archive redacted evidence and all failures.
- [ ] REL-R04 Run real Gemini/Groq beyond challenge smoke: structured planning, tool use, citation synthesis, review and bounded replan. Validate reported model, finish reason, usage, error envelope; retry only pre-dispatch where authorized. No automatic paid escalation.
- [ ] REL-R05 Diagnose OpenRouter RESPONSE using sanitized status/content-type/response-shape reason; tester selects pinned available model, not forced free router. If unsupported, mark disabled and nonblocking if two working routes and one-model path suffice.
- [ ] REL-R06 Integrate autonomous research output into reviewed canonical investigation workspace: user can stage exact source spans, origin/time/digest, selected units, alternative meanings and explicit admission. No auto-promote candidate model claim to verified fact.
- [ ] REL-R07 Objective-first path: enter task → model chooses whether web needed → approve exact scope → receive sources and claims → choose material disagreement → revise source/assumption → recompute impact → export proof. Avoid requiring switching into multiple legacy admin forms.
- [ ] REL-R08 Prove claim-to-source citations resolve to exact offsets/page and immutable digest, requested/final URL and retrieval timestamp; reject invented quotes, unknown IDs, stale evidence, duplicate spans and provenance substitution. 100% citation integrity target on admitted test claims, not truth.
- [ ] REL-R09 Preserve empirical unknown, conflicting sources, source ancestry and correlation. Distinguish reported evidence, interpretation, computation and inference. Review conflicting periods, units, definitions and applicability; do not call semantic model explanation a resolved fact.
- [ ] REL-R10 Demonstrate source correction/withdrawal affecting only dependent nodes; unchanged nodes retained and deterministic full recompute agrees; test irrelevant change and counterexample where no work is saved.
- [ ] REL-R11 Independent replay with downloadable proof capsule and separately pinned verifier. Document trust anchor and exact replay limits; demonstrate tamper rejection. No dependence on provider access for deterministic proof.
- [ ] REL-R12 Reviewer model optional; same model self-review labeled. Multiple different providers not proof of independence. Include independent deterministic checks and human spot-review for main demo.
- [ ] REL-R13 User can cancel/deny/revoke mid-flight; late result cannot publish. Show unknown billing/dispatch separately from completed, failed and cancelled; status survives refresh only when backed by real persistence.
- [ ] REL-R14 Map current research event stream to actual orbital task phases and evidence handoffs. No fabricated hidden reasoning, fake visitor traffic, fake token progress or fake live animation; distinguish source retrieval, computation and transport receipt.
- [ ] REL-R15 Reconcile general research capabilities with browser conformance: use browser runtime for graph/tool orchestration, host for approved HTTP access or inference when needed. Do not put Node DNS/TLS/PDF/Postgres code in browser bundle or assume Workers supports it.
- [ ] REL-R16 Keep deterministic/manual route usable without model credentials, public search or host availability. Judge sees a labeled worked example, not purported real-time evidence if offline. Advanced engineering labs remain discoverable but not forced.

## 5. Public hosted architecture, security and reliability (P0)

Existing private Worker config deliberately disables inference and has no public workers.dev/preview route. Existing Pages Functions /api/* service-binding candidate passes dry-run. New loopback research server uses Node APIs and is not a public authenticated gateway. PostgreSQL store/worker exists but no real DB service verification found in current research workflow.

- [ ] REL-S01 Choose deploy architecture via ADR: browser portable runtime + static Pages; bounded same-origin API/service binding for selected capabilities. Reuse existing ingress/quota/consent. Keep Node worker on compatible host if pinned DNS/TLS/PDF requires it. Do not transplant unrestricted Node proxy into Workers.
- [ ] REL-S02 Threat model public unauthenticated judge access vs authenticated private/user sessions; narrowly scoped capabilities, input disclosure, secret custody, egress, costs and stored evidence. Distinct trust principals and attack paths.
- [ ] REL-S03 Store provider/search keys in approved runtime secrets (GitHub Actions secrets are CI only). Map GEMINI/GROQ/OPEN_ROUTER aliases at CI boundary; never bundle credentials, query strings, logs, reports, browser export or static assets. Rotate exposed credentials before production. Do not copy literal keys into code.
- [ ] REL-S04 Preserve publisher-funded minimal public route with fixed reviewed provider endpoints, hard request/call/token/body/time/concurrency caps, rate limits, daily ceiling and kill switch. Estimated micros are not actual billing guarantee; monitor actual provider invoices and stop at safe cap.
- [ ] REL-S05 Verify Pages → private Worker identity and Origin propagation, service binding, request cancellation/streaming, no public bypass and fail-closed on missing trusted identity. No spoofable header as sole auth. Abuse tests with forged headers.
- [ ] REL-S06 SSRF/injection test matrix: non-HTTPS, private/link-local/metadata/loopback, IPv4/IPv6 variants, DNS rebinding, redirects, DNS/TLS peer mismatch, credentials in URLs, unknown ports, opaque query strings. No secrets or arbitrary user headers forwarded to documents.
- [ ] REL-S07 Bound response compression/bytes/media/redirects, per-domain rate limits and total deadline, robots and terms; source extraction never executes scripts. Real PDF sandbox probe and hostile sample only on compatible reviewed host.
- [ ] REL-S08 Prevent cross-session/tenant access to reports, events, credentials and approval pins; origin/CSRF/replay protections; no shared caches of private content. Test concurrent sessions and token expiry; no localStorage API keys in publisher-hosted UI.
- [ ] REL-S09 Verify actual PostgreSQL migration and transaction tests on real database service: concurrent queue claim, atomic daily reservation, lease expiry, stale CAS, fencing, worker crash before/after dispatch, cancellation, duplicate event, report integrity and cross-tenant denial.
- [ ] REL-S10 If durable hosted sessions are advertised, wire store into authenticated API, worker and reconnectable event stream; retention/delete policy, atomic checkpoint, original deadline and budget, backup/restore. Unknown external dispatch quarantined; no automatic replay. Otherwise explicitly omit durable hosted claim and keep bounded tab/session demo.
- [ ] REL-S11 Test actual restart, network interruption, 429, 5xx, quota exhaustion, invalid model response, provider outage, search outage and late result. One failed source does not kill valid partial evidence. No hidden retries after uncertain dispatch.
- [ ] REL-S12 Red-team integrated production candidate with prompt injection and poisoned reference, unknown tool, disclosure mismatch, stale consent, duplicate/late events, XSS via source/LLM text, malicious markdown, oversized input and secret canaries; zero unauthorized contacts in test matrix.
- [ ] REL-S13 Dependency and code license audit; lockfile versions, SBOM or inventory, vulnerability triage, source maps and debug data review; rights/attribution for sample archive, artwork, third-party content and media. Apache-2.0 root license exists, does not automatically authorize all assets.
- [ ] REL-S14 Measure public resource behavior: static hits bypass dynamic invocations; record actual Worker/Pages function counts and provider calls, cache safety, 429 and stop conditions. Load test e.g. 20 concurrent judge-like sessions with injected provider then small authorized live sample; report P50/P95 and failures, not hypothetical traffic.
- [ ] REL-S15 Monitoring: health/version/feature flags, redacted failure metrics and billing/quota alerts; rollback drill, no secrets or private report content in telemetry. Document support contact and incident response through judging.
- [ ] REL-S16 Review final user consent/privacy/terms, retention and contact disclosure; no legal/medical/financial outcome guarantee. Report evidence acquisition scope, origin and limitations without exposing hidden prompts or keys.

## 6. Cloudflare release plan (P0, no change performed)

Verified current Pages project:
- account: CloudflareB; project: sutra; repo: aprashnasuraj2-dev/videoj; public hostname: https://sutra-c70.pages.dev/; no other custom domain in this project's metadata.
- production branch: sutra/caller-peer-failure-boundary; automatic production deployments false, preview setting none.
- build root apps/sutra; command npm ci && npm run build; destination dist.
- last canonical deployment f2209727-cff2-4142-ad1d-966c42770e48, commit 2c32a3da0e2d5c7392efb8abd73bf16037a0dd3d, successful deployment status. Old app, not new orbital candidate. Do not imply public URL was re-tested.
- proposed staged product output: deploy/sutra-pages/dist from apps/sutra-v2/dist, with API-only Functions and private Worker; actual platform configuration still to be validated.

- [ ] REL-D01 Save current project config, deployed artifact SHA, deployment ID, branch setting, binding metadata and rollback target. Retain old public app untouched until promotion.
- [ ] REL-D02 Resolve exact intended canonical URL and guide origin. Existing allowed origin sutra.aafnaipatro.com, guide sutra-guide.aafnaipatro.com; not verified configured for current Pages project. Either use approved pages.dev URLs coherently or confirm custom-domain ownership and HTTPS; do not assume DNS or purchase.
- [ ] REL-D03 Run clean exact-ref build from repository root: npm ci --prefix apps/sutra-v2; rustup target add wasm32-unknown-unknown; node apps/sutra-v2/build.mjs; build-contract tests; build guide; node deploy/sutra-pages/prepare.mjs; verify-build.mjs. Use current locked toolchain and update stale README commands.
- [ ] REL-D04 Verify new candidate includes caller manifest/network/runtime, guide assets, proof verifier/hash, correct _headers and _routes.json. Pin artifact inventory and SHA; reject retired products, .git, .env, secrets, symlinks and fixture-only production claims.
- [ ] REL-D05 Update ingress packaging contracts to require caller conformance artifacts in addition to existing guide assets. Keep tests for exact byte preservation, WASM scoped CSP, API-only invocation and private service disabled defaults.
- [ ] REL-D06 Dry-run private Worker and Pages Functions with pinned Wrangler. Test resource/runtime compatibility (Node-only code must stay on compatible host); confirm Cloudflare plan limits, real secret/binding names and deployment ownership. Dry-run is not deployment.
- [ ] REL-D07 Obtain explicit owner permission for isolated preview only. Configure one reviewed preview candidate, never blanket enable every branch. Use staging secret scope/limits; test public HTTPS GET and real browser runtime, model default, peer origin/CORS, source acquisition, API identity, rate limits and rollback.
- [ ] REL-D08 Record preview URL and deployed SHA; run full conformance and public judge flow from clean independent browsers. Verify public access free and unrestricted for judge evaluation, no required key enrollment, login or developer CLI. Check physical mobile and fresh browser.
- [ ] REL-D09 Set promotion gate: zero critical/high unresolved release vulnerabilities; all P0 checks and chosen advertised features verified, all required exact integration CI green; acceptance report reviewed by owner. No production connection before this decision.
- [ ] REL-D10 Once separately authorized, merge reviewed integration candidate into main and rerun exact main CI, build artifact and compare. Configure Pages production branch to main, root/build/destination to canonical prepared V2 artifact (not legacy apps/sutra build). Verify service binding, origins and secrets.
- [ ] REL-D11 Keep automatic deploy disabled until approved first main production artifact passes smoke; prefer explicit promotion or CI-controlled deploy. Enable automatic main only if owner approves and required CI gates actually prevent unsafe publication.
- [ ] REL-D12 After promotion verify main SHA matches deployment, static assets and APIs, full public demo, external consumer, CORS/CSP, quota, logs and HTTPS. Roll back to saved deployment on any failed mandatory check. Record rollback command/operator path before cutover.
- [ ] REL-D13 Keep stable public URL and artifact hashes through judging; monitor uptime, quota and expiry, avoid material submission changes after cutoff. Security fixes follow organizer rules and documented approval.

## 7. Design and judge experience (P1, selected release acceptance)

- [ ] REL-U01 First view makes audience/problem/next action clear within 10 seconds; primary action is Explore/Run investigation or Load worked example, not Start simulated rehearsal or API routes. Keep orbital map and immersive motion in service of objective.
- [ ] REL-U02 One obvious shared model picker/default; no per-avatar roles or mandatory 3-model setup. Advanced budgets/endpoints hidden by progressive disclosure; use consistent names. Legacy specialist settings remain advanced engineering only.
- [ ] REL-U03 Real activity: search/retrieval progress, source arrival, review/verification, dependencies, status/cancellation. Motion reflects actual operation events and stops on idle; accessible text equivalents.
- [ ] REL-U04 Evidence visual language: links, exact quote, source date, definition/units, freshness and explicit unknown; separate fact reported by source from inference and deterministic result. Conflicting claims accessible without implying resolved consensus.
- [ ] REL-U05 Challenge/revise flow has clear before/after, impacted and retained nodes, changed conclusion or stated invariant, why and downloadable proof; no automatic adoption. Provide undo/restore when safe.
- [ ] REL-U06 Build one coherent guided scenario that runs without manual JSON or CLI. Secondary manual/offline example and clear failure/deny/unknown paths; no false success on disconnected gateway.
- [ ] REL-U07 Keyboard navigation, focus management, no trap, reduced motion, contrast, labels, text alternatives, screen-reader live status, 320px reflow and desktop. Run existing Playwright/accessibility suite and actual human screen reader and physical mobile checks.
- [ ] REL-U08 Measure first interactive load, runtime and UI responsiveness on representative phone/slow network, prevent idle animation drain and oversized downloads. Record test device/browser; no unmeasured performance claims.
- [ ] REL-U09 Observe 5–10 consenting target users or reviewers completing the primary task without coaching; record completion, confusion and time; fix top blockers. Small convenience sample only; no population inference.
- [ ] REL-U10 Remove competition-facing distractions: guestbook/retro optional, retired brand references, simulated metrics, development labels and irrelevant specialist forms out of primary journey; keep truthful fixture/fallback labels.

## 8. Potential impact, evidence and community (P1)

- [ ] REL-I01 Select one real target use case and real licensed source pair with measurable decision consequence; document audience and present workflow. Proposed demo: an engineering/energy analyst comparing two public cost/efficiency estimates with different scope or year; avoid invented claims or recommendations.
- [ ] REL-I02 Freeze before/after scenario with source bytes, timestamp, extraction digest, reviewed quantities and known expected conditional outputs. A synthetic counterfactual must be labeled, not represented as an actual published correction.
- [ ] REL-I03 Run matched pilot: same model/evidence/time/tool allowance with plain LLM+search (and simpler deterministic recompute control) versus SUTRA. Measure supported citations, unresolved/unsupported decisive claims, correction/review time, affected-node count and reproducibility; report all failures and ties. Aim 20 paired tasks before submission if feasible; broader 200-case protocol remains roadmap.
- [ ] REL-I04 Include counterexample: simple static question needs no revision machinery; plain LLM may be cheaper/faster. Quantify observed tradeoff rather than claim universal superiority. Independent human review subset; explicitly label synthetic vs real vs independently reviewed.
- [ ] REL-I05 Prior-art comparison: reference browser runtime, search chat, multi-agent critique, versioned evidence and deterministic solver; identify actual additional capability and reuse. No blanket first-in-world claim.
- [ ] REL-I06 Package one reusable open-agentic-web tool: portable evidence/provenance/revision or conformance fixture kit, small documented schema, example caller, neutral consumer regression and license. Prefer existing Open Kit/publisher starter rather than new product/branch. External builder can run without private key for deterministic features.
- [ ] REL-I07 Run a fresh outside-builder trial of the kit; record installation, integration steps, failures and feedback (with consent). Do not invent adoption/users.
- [ ] REL-I08 Publish concise architecture and trust-boundary diagram, limitations, reproduction commands, source/license attribution and test evidence links. Explain spec-compatible browser agent graph versus optional backend; share useful findings with community only when authorized.

## 9. Submission package (P0 eligibility / P1 narrative)

- [ ] REL-J01 Confirm Devpost registration, eligibility, team/representative, rights and applicable rules; disclose significant improvements made during submission window if project predates it. No submission on behalf of owner without permission.
- [ ] REL-J02 Write accurate English description: problem/audience, browser portability, meaningful evidence/revision, model independence, limits, how to test. Include stable public URL, manifest/runtime/peer links and open repository license.
- [ ] REL-J03 Record 110–115 second human-narrated browser video; public YouTube, no unlicensed music/marks, no AI substitute narrator. Show actual product, not just slides, code or mock-ups. Keep raw proof of capture and tested commit.
- [ ] REL-J04 Proposed demo timing: 0–10s problem and objective; 10–35s browser graph + real model/web operation and evidence; 35–55s consented second-origin agent action; 55–83s challenge/modify evidence and visibly recompute impacted conclusion; 83–102s independent proof replay and community artifact; 102–115s concrete audience value and truthful limits. Reorder only if the actual flow requires; no sped-up action misrepresented as real time.
- [ ] REL-J05 Capture one or more real screenshots (orbital investigation, evidence/conflict, revision/proof). Readable captions and matching released version; avoid fake dashboard numbers.
- [ ] REL-J06 Create judge quickstart requiring no account, paid key or CLI for primary demo; public browser route tested by neutral user; optional manual replay and model selection. Clear time expectations measured from release candidate.
- [ ] REL-J07 Provide sponsor-specific Otari account email and feedback only if actually used and owner approves. Otari optional; don't force it or claim usage. NANDA/other extensions optional, no bonus presumed.
- [ ] REL-J08 Self-review against four equal criteria and pass/fail conformance; have external reviewer score only observable demo/evidence. Address gaps, don't inflate points or convert subjective score to odds of winning.
- [ ] REL-J09 Freeze submission on Jan 9 internal target, validate public links and permissions, submit before Jan 11 16:00 UTC only after approval; capture confirmation. Keep same working release through judging, monitor availability and budget.
- [ ] REL-J10 Archive final submitted text, video link, screenshot files, conformance matrix, deployment SHA, release tag, license and evidence index. Record what is not shipped, not tested or not claimed.

## 10. Sequence, capacity and cutline

These are planning ranges for focused engineer-hours, not elapsed time promises or evidence of progress. Existing implementation may reduce effort, but integration and external testing can increase it.
| Milestone | Proposed window | Estimated effort | Exit |
|---|---|---:|---|
| A — branch/scope reconciliation | Nov 27–Dec 2 | 12–24h | B01–B09; single candidate and pinned spec |
| B — browser conformance + portable peer | Dec 3–12 | 35–65h | C01–C19, real model and tool flow |
| C — coherent research/revision + secure preview | Dec 13–22 | 45–85h | R/S/D preview gate, live evidence and browser flow |
| D — UX, evaluation, community kit | Dec 23–Jan 3 | 30–55h | judge journey, independent trial, measured pilot |
| E — release, video, submission | Jan 4–9 | 16–30h | D/J gates, authorized main promotion and stable release |

Total indicative 138–259 focused hours, excluding unavailable reviewer/organizer time and external quota or infrastructure delays. Approximately 43 calendar days until internal freeze from audit. At 4h/day, about 172 focused hours before holidays; high-end scope does not fit a solo 4h/day schedule. Cut optional breadth early: general JS rendering, hostile PDF support, unrestricted custom public egress, multi-tenant distributed service and all 200 held-out cases are not necessary to show portable browser agents with a reliable narrow demo. If durable hosted sessions are excluded, do not advertise them. Preserve core offline/manual, trust gates, conformance and actual judge journey.

**Final release decision record** (populate from real evidence):
- audited exact main SHA / candidate SHA / published artifact digest:
- normative spec revision / delta disposition:
- unresolved P0s / scoped deferrals with feature flags:
- public judge URL / peer URL / neutral consumer report:
- CI, live model, live search, browser conformance, security and user pilot artifacts:
- Cloudflare production/rollback IDs / runtime caps / owner approval:
- release verdict: NO-GO until completed; owner and reviewer signatures/dates:


## 2026-11-27 — incremental integration checkpoint

Inventory: [release-integration-inventory.json](release-integration-inventory.json). These observations supersede neither the exact original audit revision nor the release acceptance criteria.

- REL-B01/B02: five open PR heads and compare baselines captured. PR #65's eight paths were reconciled into `02a2367e4ab1b05a768ae0738cc5d175e80fb5bb` without replacing newer cancellation, budget or consent machinery. All 13 [exact-commit workflows](https://github.com/aprashnasuraj2-dev/videoj/commit/02a2367e4ab1b05a768ae0738cc5d175e80fb5bb/checks) passed, including [knowledge kernel](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45996597413), [workspace browser](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45996597336) and [operator browser](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45996597368). This establishes tested host-declared negotiation, not verified live model capabilities or competition conformance. Historical tags and production revision evidence remain outstanding.
- REL-B03: `12478b8824345c483ba96536dd452e412a027bea` selectively recovers durable-save acknowledgement classification, independently replayed host views, bounded history bytes and explicit read-before-next-write. [Workspace browser](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45996858453) passed; [knowledge kernel](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45996858256) and [learner shell](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45996858667) were still running at inspection. This checkpoint adds a real-filesystem browser lost-ack regression (pending exact-revision CI). Full two-session/launcher comparison remains open. The UI recovery interlock is page-local, not a durable cross-reload lock.
- REL-B04: #48 and #49 remain open and substantially divergent (281 and 198 source-only commits respectively). Do not wholesale merge. Extract shared runtime/provider/peer capabilities only after path-level analysis.
- REL-C01: [start-date MVP 0.2](https://github.com/cognizant-ai-labs/agentic-web/blob/fd872b9221aeb8ff762b75a5badbf84b23c133cc/docs/worldwide_agentic_web_mvp_spec.md) and [current MVP 0.3](https://github.com/cognizant-ai-labs/agentic-web/blob/a0ceda34e4f2e653223e13e63282abc9b60eaf7c/docs/worldwide_agentic_web_mvp_spec.md) pinned. Direct file diff shows profile heading, reference links and typo corrections, no changed normative text; linked documents may have changed independently. Complete the normative mapping and evidence before claiming conformance.
- REL-C02–C04 remain critical: current V2 public directory does not yet publish an executable agent manifest/graph, current autonomous research UI delegates orchestration to the local host, and production CSP restricts network connections to self. Reuse the existing pinned browser runtime, not a second disconnected demo. A manifest without actual browser execution is insufficient.

No merge, branch deletion, deployment, DNS mutation, credential retrieval or live provider call performed. NO-GO remains unchanged.

### Verification follow-up

All 13 [workflows at 12478b8824345c483ba96536dd452e412a027bea](https://github.com/aprashnasuraj2-dev/videoj/commit/12478b8824345c483ba96536dd452e412a027bea/checks) passed. At `fbec5bfb48e70f80435c027d5c43d0420364d3b8`, [impact classification](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45997273727) correctly failed on the new unregistered inventory JSON. This follow-up maps that exact path, retains rejection of unknown files and adds a regression test. It also records all 87 #48 and 123 #49 compare paths and their shared paths; implementation-level reconciliation still remains. The older OpenRouter-only browser adapter, legacy web-tool runtime and epistemic validator require contract review; absence of the old files does not prove current V2 lacks equivalent security/research behavior. No external release gate closed.

- REL-R06 (candidate): autonomous report → exact extracted source text → existing reviewed evidence form, with report and source SHA-256 checks, bounded text, explicit human staging and collision/occupied-form refusal. No model claim, lineage verification or authority is imported. Original URL/source digest remains in the export; no claim of persistent URL/timestamp/offset provenance in the compiler yet. Oversized/CR-containing text is refused rather than silently truncated or normalized. Exact-revision browser and unit evidence pending.

- REL-C02/C03/C04/C07 candidate: canonical V2 now publishes an `investigation` planner/critic graph and loads it inside the existing objective-first workspace. Browser retains bounded orchestration using the existing same-origin publisher router only when configured; explicit preview/approval, route-contract pin, mandatory observed delegation, cancellation, no mock fallback. Browser SSE fixture checks actual built graph and successful delegation plus no-delegation refusal. No live/public router, cross-origin CORS, grounded tool, BYOK or full conformance is claimed. Exact revision CI pending.

- REL-C02/C19 candidate: exact public manifest and graph paths carry credentialless wildcard CORS only; static policy rejects CORS on wildcard/API or credential-bearing headers. Independent consumer exercises the **built V2 graph** from a second loopback origin using its own pinned upstream runtime and synthetic model, including denial when CORS is removed. Browser planning approval text limits disclosure to the publisher router, no web/private evidence permission. Public hosting and live cross-site execution remain unverified. Exact-revision CI pending.
