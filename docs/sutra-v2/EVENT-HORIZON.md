# SUTRA — EVENT HORIZON V2: adaptive frontend enhancement register

**Created:** 2026-11-28. **Integration baseline:** PR #66, `2dfd08284d101ea809facef065672729ad1851a3` (not released). **Status:** 100 enhancement gates remain open; 55 carry scoped partial implementation evidence; zero formally accepted. **Production decision:** unchanged NO-GO.

**Mandate:** Intelligence takes the shape of the problem. The objective selects required capabilities; agents, tools, roles, models, publishers, task graphs and views remain independent. Zero, one, six or ten participants are valid when the admitted plan warrants them. No global cast, fixed station count or forced planner. Preserve and enhance inherited engineering rather than rebuild SUTRA from zero.

This is the authoritative *frontend enhancement detail* for the existing [engineering checklist](CHECKLIST.md) and [release overlay](DEVPOST-PRE-RELEASE.md), not a competing general continuation queue. The user's explicit Event Horizon work follows dependency-ready gates below; general continuation remains governed by CHECKLIST.md. [Machine-readable register](event-horizon-register.json) is the structured mirror; update both atomically. Do not change historical gate status or release totals just because an enhancement is planned. No deployment, DNS change, paid model inference or merge is authorized here.

## Implementation checkpoint — 2026-11-28

[Implementation journal](EVENT-HORIZON-IMPLEMENTATION.md) · [workspace browser pass](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774) · [latest implementation CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128941298). Five implementation commits through `9255a1d33d3763f9c5a1bb81f51ea94c923b10cb`: +1,432/−14 lines across 26 files, including tests and documentation. This does not reach the requested 20,000 lines; no padded code or fictional progress. Partial evidence is mapped per gate in the JSON mirror. No gate is accepted just because a component exists or a prior revision passed.

## Existing assets to preserve

| Baseline component | Reuse and enhancement |
|---|---|
| apps/sutra-v2/src/orbit.js, orbit.css, master.js | Existing SVG, zoom, inspector, themes, offline shell, command navigation; replace fixed-slot projection incrementally. |
| research-activity.js, execution-channel.js, execution-events.js | Reuse authoritative feeds and closed event schema; generalize actor and invocation projection, never fabricate handoffs. |
| packages/sutra-runtime/investigation-tasks.js | Existing DAG accepts up to 64 tasks and concurrency up to 8. Retain admission, cancellation and version fences. |
| packages/sutra-runtime/index.js | General runtime upper bound 12 agent invocations, not 12 simultaneously executing independent models; browser paths currently cap at 2/3. No limit increase implied. |
| investigation-role-review.js | Fixed six-role and hybrid review remain optional legacy profiles; preserve sealed artifacts, recovery and verifier compatibility. |
| reviewed-workspace.js, pinned-workspace.js, investigation-graph.js, impact-projection.js | Reuse evidence admission, dependency traversal, source withdrawal, history, exact pins and deterministic computation. |
| autonomous-research-panel.js, browser-investigation.js, research-plan-panel.js | Reuse research workflow and consent, expose real progress, failure and missing capability; host-mediated and browser-native remain distinct. |
| agent-studio.js, public/agents, peer/agents | Reuse published graph and manifest contracts, existing model setup, peer discovery, consent and portable export; expand only within validated policies. |
| debugger.js, demo-guide.mjs, Python verifier, build.mjs | Preserve offline worked examples, independent replay and static build/packaging. |
| Existing Playwright and unit suites | Keep old acceptance tests; extend for arbitrary identity, responsive interaction and security rather than weakening assertions. |

Baseline evidence: [orbital viewport screenshots](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46125039428), retained artifact 15255665541; [prior cold-lab performance](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46108250196/job/140865758471) 310,537 transferred bytes, 0 observed idle frames, emulated phone ~2.86s first interactive (historical scoped baseline only). New implementation must be tested at its exact head. Current release register has 58/103 closed and 45 open; this is independent of Event Horizon.

## Architecture contract and design direction

- A capability is not an agent; an agent definition is not an instance; an invocation is not a task; a route is not a model independence guarantee. Model/publisher claims confer no authority.
- Use a single read model derived from validated runtime journals and reviewed investigation state. Spatial, DAG, notebook, evidence and timeline views share stable typed selections and run/version identity.
- Reuse current Vite/vanilla modules. Extract presentation incrementally behind adapters; introduce typed contracts incrementally, no framework rewrite by default. SVG first, aggregate or virtualize large graphs; optional Canvas only if measured need. No runtime-generated executable UI.
- Default user flow: objective → capability requirements → feasible alternatives → exact approved plan → truthful execution → proposed/admitted revision → retained evidence/proof. Deterministic-only tasks need zero AI agents. Unresolved capability is visible, never solved by inventing a participant.
- Candidate selection: hard-filter on admissibility, coverage, tools, evidence, authorization and limits; compare estimated cost, latency, exposure and coordination overhead. Unknown estimates remain unknown. Never optimize away mandatory evidence or consent.
- Procedural identities and topology: neutral glyphs by entity kind and stable definition ID, distinct instance IDs, user labels; radial, pipeline, hierarchy, distributed, adversarial, matrix and list are presentation only. No fabricated trust, work, tokens or communication.
- Visual language: preserve paper/phosphor and retro heritage, refine dark observatory and editorial modes; objective-first shell, restrained event-driven motion, explicit consent, visible cancellation, semantic zoom, source microscope and knowledge debugger. User can choose less motion/list view; no remote fonts or mandatory external art.
- Dynamic composition is staged: first render actual arbitrary manifests, then propose bounded alternatives, then admit supported executable graphs; graph revision and dynamic recovery require new versioned acceptance. No arbitrary external discovery/crawling or live dispatch. Public interoperability and commercial-model acceptance need their own evidence.
- Security: all model/publisher content is untrusted, render as text through approved components, never execute generated code; authority remains host-owned. Exact plan pin, data disclosure, grant and budget remain binding. Cancellation does not prove external billing stopped.
- Performance targets: initial compressed transfer <500 KB (define scope), p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.1, 320px reflow, 44px preferred targets, zero recurring idle JS frames, WCAG 2.2 AA target; targets are not results. Static-first, no unapproved network calls.

## Sequencing and release strategy

| Milestone | Work package | Entry/exit |
|---|---|---|
| 1 | Break fixed-role presentation | A01–A12; start with inventory/contract, retain legacy tests. |
| 2 | Procedural visual universe | C01–C12; use dynamic read model, test 0/1/10 and unknown identities. |
| 3 | Capability-driven composition | B01–B12; proposals before admission; B01–B05 can run alongside visuals. |
| 4 | Adaptive workspace | D01–D10; preserve existing tools and primary journey. |
| 5 | Open agentic web | E01–E12; loopback first, public acceptance only after authorization. |
| 6 | Bounded graph evolution | F01–F10; maintain version/pins and recovery; F01 begins early. |
| 7 | Living knowledge and proof | G01–G10; reuse current kernel and independent replay. |
| 8 | Human, performance and regression | H/I/J; begin baseline, threat model and accessibility early, then close exact-head integrated gates. |

Dependencies, not milestone numbers, determine readiness. Start with EH-A01; EH-I01 and EH-C01 may follow inventory, and EH-J01 follows identity/capability contracts. Prefer small reversible changes, optional feature flag for new shell while migrating, one authoritative state, and unchanged production. The final gate cannot waive existing release obligations. If time/capital is constrained, ship only a verified subset after owner approval; defer advanced 500-entity visualization or unsupported network composition rather than weakening core authority.

## Acceptance and evidence protocol

- Each item is initially `[ ]`; a task may be designated active only at a recorded continuation checkpoint. Use `[!]` for genuine external blockers, `[x]` only with exact acceptance evidence. Machine states: remaining, active, blocked, accepted. Record scope and limitations; existing evidence is a starting point, not closure.
- Closure requires exact commit SHA, test command, actual CI run/job or local reproducible result, artifact paths/digests where applicable, observed assertions and failures, and reviewer disposition. Human and deployed gates need actual human/public evidence. Record both positive and negative tests; a skipped or cancelled test never passes. If code or environment changes invalidate evidence, re-open/reverify affected gates. No aggregate completion percentage claims; use explicit accepted/remaining/blocked counts.
- Every implementation checkpoint records changed paths, preserved legacy routes, new tests and rollback instructions. Reconcile machine mirror and this document; check unique IDs and acyclic references. Retain evidence history rather than overwrite failure records.
- Required baseline commands from app README: `npm ci --prefix apps/sutra-v2`; `rustup target add wasm32-unknown-unknown`; `node apps/sutra-v2/build.mjs`; `node --test apps/sutra-v2/test/build-contract.test.mjs`; install Playwright Chromium with app CLI; run `node apps/sutra-v2/test/browser.cjs` and applicable existing workspace, knowledge, operator and browser-matrix CI. New tests should live beside existing suites and be registered in CI when implemented. This planning commit does not execute these tests.

## Register (100 gates)

| Category | Gates | Remaining |
|---|---:|---:|
| A — Dynamic identity and truthful runtime projection | 12 | 12 |
| B — Capability registry and composition | 12 | 12 |
| C — Adaptive topology and visual rendering | 12 | 12 |
| D — Objective-specific workspace and navigation | 10 | 10 |
| E — Open web discovery and interoperability | 12 | 12 |
| F — Live operations, revisions and recovery | 10 | 10 |
| G — Evidence, knowledge and proof | 10 | 10 |
| H — Mobile, accessibility and human experience | 8 | 8 |
| I — Performance and resource efficiency | 6 | 6 |
| J — Security, regression and release evidence | 8 | 8 |
| **Total** | **100** | **100** |

### A. Dynamic identity and truthful runtime projection (12)

Reuse areas: `orbit.js; research-activity.js; execution-channel.js; packages/sutra-runtime/execution-events.js; investigation-tasks.js`.

- [ ] **EH-A01 — Inventory and migration map** (P0; milestone 1)
  - **Depends on:** none.
  - **Enhance/reuse:** existing ROLE/STATIONS, DOM IDs, commands and tests.
  - **Acceptance:** Enumerate every fixed-slot assumption, dependent consumer and migration adapter; record exact source revision and existing screenshots; no lost feature.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Migration inventory and preserved original paths; comprehensive control inventory still open. Full acceptance remains open.

- [ ] **EH-A02 — Participant identity contract** (P0; milestone 1)
  - **Depends on:** EH-A01.
  - **Enhance/reuse:** execution journal run.open and task manifest.
  - **Acceptance:** Validate run-scoped stable IDs, definition IDs, invocation IDs, origin and entity kinds independently; reject collisions and malformed records.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Stable run-scoped task and trace keys; not every actor definition/instance contract tested. Full acceptance remains open.

- [ ] **EH-A03 — Generic task projection** (P0; milestone 1)
  - **Depends on:** EH-A02.
  - **Enhance/reuse:** execution-events.js snapshot.
  - **Acceptance:** Render arbitrary manifest agent IDs and dependencies; exercise 0 (tool-only path), 1, 2, 6, 10 and 12 participants without synthetic activity.
  - **Evidence:** partial implementation only; [run 46128941298](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128941298), `9255a1d`. Actual 10 deterministic owners via scheduler, 0 local tool path and 1/2/6/10/12 manifest projection; new browser journey pending. Full acceptance remains open.

- [ ] **EH-A04 — Browser ancestry projection** (P0; milestone 1)
  - **Depends on:** EH-A02.
  - **Enhance/reuse:** browser runtime trace spans and research-activity.js.
  - **Acceptance:** Resolve recorded parent/child spans for unknown valid agent names; distinguish definition, invocation and task; never guess missing ancestry.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Recorded browser invocation ancestry with unknown names; no inferred root. Full acceptance remains open.

- [ ] **EH-A05 — Host research projection** (P0; milestone 1)
  - **Depends on:** EH-A02.
  - **Enhance/reuse:** research-activity.js and autonomous research panel.
  - **Acceptance:** Map real search/document/model/evidence events to their recorded actors or operation-only nodes; remove invented role-to-role handoffs.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Host operation/evidence projection and unknown outcomes; no role-as-agent fabrication. Full acceptance remains open.

- [ ] **EH-A06 — Concurrent invocation aggregation** (P0; milestone 1)
  - **Depends on:** EH-A03, EH-A04.
  - **Enhance/reuse:** execution journal and task scheduler.
  - **Acceptance:** Two concurrent tasks on one participant preserve independent states; finish one without falsely setting the other idle; count invocations separately.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Concurrent task aggregation for shared logical owner and distinct invocation spans. Full acceptance remains open.

- [ ] **EH-A07 — Unknown and terminal events** (P0; milestone 1)
  - **Depends on:** EH-A03, EH-A04, EH-A05.
  - **Enhance/reuse:** execution event validator and journal.
  - **Acceptance:** Duplicate, stale, out-of-order, invalid-origin and late-after-close events cannot mutate admitted state; present missing data as unknown.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Duplicate/late event and missing parent negative fixtures; full transition stress remains. Full acceptance remains open.

- [ ] **EH-A08 — Legacy compatibility adapter** (P0; milestone 1)
  - **Depends on:** EH-A03.
  - **Enhance/reuse:** investigation-role-review.js and recovery profile.
  - **Acceptance:** Six-role review and hybrid fixtures run with original manifests, pins, recovery and exported bytes; old names are optional labels only.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Legacy Ring map and existing deterministic review/recovery journey passed. Full acceptance remains open.

- [ ] **EH-A09 — Selection and identity persistence** (P0; milestone 1)
  - **Depends on:** EH-A03, EH-A06.
  - **Enhance/reuse:** orbit.js, master.js, investigation-graph.js.
  - **Acceptance:** Selection uses stable typed keys across rerender, zoom, reorder and revision; deleted selection resets with explicit reason.
  - **Evidence:** partial implementation only; [run 46128941298](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128941298), `9255a1d`. Stable selected keys, page/filter navigation; latest integrated keyboard test pending. Full acceptance remains open.

- [ ] **EH-A10 — Actor types and counters** (P0; milestone 1)
  - **Depends on:** EH-A03, EH-A04, EH-A05.
  - **Enhance/reuse:** existing execution feeds and receipts.
  - **Acceptance:** Distinguish agents, tools, humans, publishers, evidence and operations; zero-agent case reports zero agents; 10 shared-model agents do not imply ten models.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Task/agent/tool/invocation/evidence distinctions and zero model local operation. Full acceptance remains open.

- [ ] **EH-A11 — Run isolation and replay labeling** (P0; milestone 1)
  - **Depends on:** EH-A07, EH-A08.
  - **Enhance/reuse:** execution checkpoints and browser receipts.
  - **Acceptance:** Two retained runs with same agent names remain separate; fixture, local deterministic, host, authorized inference and historical replay are unmistakable.
  - **Evidence:** partial implementation only; [run 46128941298](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128941298), `9255a1d`. Run isolation and read-only retained prefix replay; integrated browser replay pending. Full acceptance remains open.

- [ ] **EH-A12 — Remove global fixed cast from primary UX** (P0; milestone 1)
  - **Depends on:** EH-A08, EH-A09, EH-A10, EH-A11.
  - **Enhance/reuse:** orbit.js and master.js.
  - **Acceptance:** No required six roles, twelve stations or named coordinator in default workspace; all existing reachable controls survive; run browser acceptance and compare inventory.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Adaptive universe default with original Ring map explicitly accessible; complete feature parity not yet accepted. Full acceptance remains open.

### B. Capability registry and composition (12)

Reuse areas: `packages/sutra-runtime/index.js; investigation-tasks.js; public/agents; agent-studio.js; semantic-intake.js; operator-model-console.js`.

- [ ] **EH-B01 — Capability registry schema** (P1; milestone 3)
  - **Depends on:** EH-A02.
  - **Enhance/reuse:** existing registered tools and network descriptors.
  - **Acceptance:** Versioned closed schema for capability, inputs, outputs, constraints, publisher claims and execution kind; malformed or unsupported descriptor refused.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Nine explicit capability requirements and nine existing workflow entrypoints. Full acceptance remains open.

- [ ] **EH-B02 — Definition and instance separation** (P1; milestone 3)
  - **Depends on:** EH-B01, EH-A02.
  - **Enhance/reuse:** existing manifests, graph pins, route descriptors.
  - **Acceptance:** Same definition instantiated twice has distinct instance identity; same display name or model route does not merge participants.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Ten portable definitions inspectable without running instances. Full acceptance remains open.

- [ ] **EH-B03 — Objective and requirement projection** (P1; milestone 3)
  - **Depends on:** EH-B01.
  - **Enhance/reuse:** semantic-intake.js and existing objective composer.
  - **Acceptance:** Extract proposed requirements with evidence and unresolved ambiguity; untrusted model proposals remain unadmitted; manual override available.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Manual requirements selection; automatic objective inference not implemented. Full acceptance remains open.

- [ ] **EH-B04 — Deterministic-first routing** (P1; milestone 3)
  - **Depends on:** EH-B03.
  - **Enhance/reuse:** existing local kernel and exact quantity lab.
  - **Acceptance:** Known unit conversion succeeds with zero model, peer or search calls; unsupported objective remains explicit, never silently routed to inference.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Exact conversion through existing verifier, zero model/peer calls. Full acceptance remains open.

- [ ] **EH-B05 — Capability matching** (P1; milestone 3)
  - **Depends on:** EH-B01, EH-B03.
  - **Enhance/reuse:** existing validated tool registry and compiled networks.
  - **Acceptance:** Match input/output compatibility and actual allowed tools; reject incompatible units, unsupported handlers, missing capability and claimed-but-unavailable execution.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Bounded inclusion-minimal coverage of selected capabilities; runtime availability not guaranteed. Full acceptance remains open.

- [ ] **EH-B06 — Alternative team generation** (P1; milestone 3)
  - **Depends on:** EH-B02, EH-B05.
  - **Enhance/reuse:** bounded DAG compiler and published graph templates.
  - **Acceptance:** Produce minimal, specialist, deterministic-first and optional peer alternatives only where feasible; fixtures use materially different topology, not fixed roles.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Advisory alternatives and conditions, not live agent assignment. Full acceptance remains open.

- [ ] **EH-B07 — Feasibility and resource estimator** (P1; milestone 3)
  - **Depends on:** EH-B06.
  - **Enhance/reuse:** existing scheduler bounds and model reservations.
  - **Acceptance:** Check mandatory capability coverage, depth, agent invocations, calls, tools, deadline and context bytes; estimate cost/latency with units and unknowns.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-B08 — Selection policy and explanation** (P1; milestone 3)
  - **Depends on:** EH-B07.
  - **Enhance/reuse:** admitted resource policies.
  - **Acceptance:** Choose smallest feasible composition according to explicit policy; compare tradeoffs; demonstrate case where cheaper composition is rejected due to required independent evidence.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Deterministic preference, gaps and explanatory conditions; cost estimates remain unknown. Full acceptance remains open.

- [ ] **EH-B09 — User composition editing** (P1; milestone 3)
  - **Depends on:** EH-B06, EH-B07.
  - **Enhance/reuse:** agent-studio.js and existing validation.
  - **Acceptance:** Change task assignment or choose alternative, validate draft DAG and show missing requirements; editing never dispatches.
  - **Evidence:** partial implementation only; [run 46128941298](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128941298), `9255a1d`. Editable local deterministic DAG with review invalidation; broader model plan editing pending. Full acceptance remains open.

- [ ] **EH-B10 — Exact plan handoff** (P0; milestone 3)
  - **Depends on:** EH-B09.
  - **Enhance/reuse:** existing consent inspectors and approved-plan paths.
  - **Acceptance:** Compile supported composition to existing admitted graph and pin disclosure, objective, version, routes and limits; mutation invalidates approval.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-B11 — Bounded execution eligibility** (P0; milestone 3)
  - **Depends on:** EH-B10.
  - **Enhance/reuse:** existing runtime and browser-investigation limits.
  - **Acceptance:** Do not raise runtime bounds to match renderer; unsupported composition remains draft/refused, including ten-agent live request beyond current path caps.
  - **Evidence:** partial implementation only; [run 46128941298](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128941298), `9255a1d`. Closed local batch validation, units, dependencies, cycle and bounds; broader runtime admission remains unchanged. Full acceptance remains open.

- [ ] **EH-B12 — Composition evaluation corpus** (P1; milestone 3)
  - **Depends on:** EH-B04, EH-B08, EH-B11.
  - **Enhance/reuse:** existing semantic fixtures and research acceptance cases.
  - **Acceptance:** Test at least 24 held-out scenario families/cases with direct, one-agent, multi-agent, insufficient capability and denial; record coverage, unnecessary work and reviewer disagreements.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. 512 capability subsets exhaustively tested; independent held-out scenario corpus not completed. Full acceptance remains open.

### C. Adaptive topology and visual rendering (12)

Reuse areas: `orbit.js; orbit.css; master.css; frame-driver.js; investigation-graph.js`.

- [ ] **EH-C01 — Design system tokens and reusable primitives** (P1; milestone 2)
  - **Depends on:** EH-A01.
  - **Enhance/reuse:** existing paper/phosphor, dark and retro CSS.
  - **Acceptance:** Consolidate typography, spacing, borders, contrast, focus, state and motion tokens; no remote font or tracking dependency.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Self-contained workspace CSS and responsive system-font primitives. Full acceptance remains open.

- [ ] **EH-C02 — Procedural identities** (P1; milestone 2)
  - **Depends on:** EH-A02, EH-C01.
  - **Enhance/reuse:** existing SVG icon machinery.
  - **Acceptance:** Stable digest-derived appearance, instance distinction and typed glyphs; unknown capability gets neutral fallback; no competence/trust implied.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Deterministic identity glyphs by entity kind; no complete visual identity system. Full acceptance remains open.

- [ ] **EH-C03 — Graph projection contract** (P0; milestone 2)
  - **Depends on:** EH-A03, EH-A04.
  - **Enhance/reuse:** existing dependency graph and task manifests.
  - **Acceptance:** Typed nodes and edges with provenance (planned, observed, declared, replayed); validate endpoints and never infer observed communications from layout.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Read-only graph projection grounded in task manifests and trace spans. Full acceptance remains open.

- [ ] **EH-C04 — Adaptive layout selection** (P1; milestone 2)
  - **Depends on:** EH-C03.
  - **Enhance/reuse:** existing orbit geometry.
  - **Acceptance:** Radial only for real hub, pipeline for chain, hierarchy for DAG, mesh for peer links, adversarial for competing branches, matrix/list alternatives; same data in each.
  - **Evidence:** partial implementation only; [run 46128941298](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128941298), `9255a1d`. Adaptive radial/layered/grid/list and clustered layouts; full layout matrix not complete. Full acceptance remains open.

- [ ] **EH-C05 — Stable incremental layout** (P1; milestone 2)
  - **Depends on:** EH-C02, EH-C04.
  - **Enhance/reuse:** existing SVG and frame driver.
  - **Acceptance:** Deterministic seed; preserve position/selection on new events; avoid overlapping labels at 1/2/6/10/12; no animation-driven state mutation.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-C06 — Graph navigation** (P1; milestone 2)
  - **Depends on:** EH-C05.
  - **Enhance/reuse:** existing drag, wheel and zoom controls.
  - **Acceptance:** Fit, zoom, pan, reset, keyboard traversal and focus restoration; browser scroll not trapped; touch and pointer equivalent.
  - **Evidence:** partial implementation only; [run 46128941298](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128941298), `9255a1d`. Bounded viewport pan/zoom/fit and controls; touch and keyboard full acceptance pending. Full acceptance remains open.

- [ ] **EH-C07 — Event-driven motion** (P1; milestone 2)
  - **Depends on:** EH-A07, EH-C05.
  - **Enhance/reuse:** existing demand-driven frame driver.
  - **Acceptance:** Only real recorded execution triggers pulses; unknown/denial/cancel distinct; stop idle/hidden and reduced-motion loops; inspect event ID from pulse.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-C08 — Contextual inspector** (P1; milestone 2)
  - **Depends on:** EH-A09, EH-C03.
  - **Enhance/reuse:** existing orbit and master inspectors.
  - **Acceptance:** Show typed selected participant/task/tool/source, actual status, permissions, dependencies and evidence; arbitrary valid names supported; empty state clear.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Participant, task, invocation, evidence and relationship inspector. Full acceptance remains open.

- [ ] **EH-C09 — Graph scaling and virtualization** (P1; milestone 2)
  - **Depends on:** EH-C04, EH-C06.
  - **Enhance/reuse:** SVG renderer and local layout.
  - **Acceptance:** Measure 13–64 nodes and 65–500 displayed entities via aggregation/virtualization; no new execution implied; retain selectable list parity.
  - **Evidence:** partial implementation only; [run 46128941298](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128941298), `9255a1d`. 500-entity pagination coverage; large graph rendering performance not measured. Full acceptance remains open.

- [ ] **EH-C10 — Semantic zoom** (P1; milestone 2)
  - **Depends on:** EH-C06, EH-C08.
  - **Enhance/reuse:** existing orbit, dependency traversal, evidence views.
  - **Acceptance:** Navigate publisher → run → participant/task → operation → exact evidence/proof with breadcrumb and back; missing links explicitly unavailable.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-C11 — Visual modes and polish** (P1; milestone 2)
  - **Depends on:** EH-C01, EH-C07.
  - **Enhance/reuse:** existing dark/1997/offline preferences.
  - **Acceptance:** Refine scientific paper, dark observatory and optional retro; consistent state meanings, opt-in sound, no decorative fake metrics or compulsory effects.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-C12 — Cross-view visual regression** (P1; milestone 2)
  - **Depends on:** EH-C08, EH-C09, EH-C10, EH-C11.
  - **Enhance/reuse:** existing orbital screenshot CI and browser tests.
  - **Acceptance:** Capture 320/390/768/1440 widths, empty/active/failed/denied/replay and 0/1/10 participants; inspect real screenshots, baseline diff and approve changes.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. 12 retained screenshots across four viewport widths and three screens. Full acceptance remains open.

### D. Objective-specific workspace and navigation (10)

Reuse areas: `main.js; master.js; reviewed-workspace.js; index.html; autonomous-research-panel.js; agent-studio.js`.

- [ ] **EH-D01 — Feature-preserving shell migration** (P1; milestone 4)
  - **Depends on:** EH-A01, EH-A12, EH-C01.
  - **Enhance/reuse:** existing navigation, commands, lab details and objective entry.
  - **Acceptance:** One coherent shell, primary investigate/open web/knowledge/studio/verify paths; map every old control and retain explicit advanced/legacy access.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Existing workspace mounted inside adaptive default; compatibility workflow passed. Full acceptance remains open.

- [ ] **EH-D02 — Universal objective composer** (P1; milestone 4)
  - **Depends on:** EH-D01, EH-B03.
  - **Enhance/reuse:** current autonomous research objective and worked example.
  - **Acceptance:** Enter, edit, attach/select evidence and choose supported intent; default view presents objective and local example above fold at 390px; no hidden provider contact.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Existing objective and primary prepare controls reparented; 390px first-viewport issue seen, compacting tested on next revision. Full acceptance remains open.

- [ ] **EH-D03 — Trusted workspace component registry** (P0; milestone 4)
  - **Depends on:** EH-D01, EH-B01.
  - **Enhance/reuse:** existing DOM panels and reviewed workspace.
  - **Acceptance:** Closed typed component IDs, input schemas and commands; unsupported requests get accessible fallback; never execute model-generated HTML/JS.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-D04 — Domain-specific layouts** (P1; milestone 4)
  - **Depends on:** EH-D03.
  - **Enhance/reuse:** existing quantity, economics, semantic, research and proof panels.
  - **Acceptance:** At least math, engineering, finance, academic, historical, software, medical-literature and general research fixture layouts; unsupported domain widgets honestly unavailable.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-D05 — Shared read model and selection** (P1; milestone 4)
  - **Depends on:** EH-A09, EH-C03, EH-D03.
  - **Enhance/reuse:** existing execution feed, investigationGraph and workspace snapshots.
  - **Acceptance:** Spatial, task DAG, notebook, evidence graph and timeline consume same run/version and selected typed key; edit goes through existing controller only.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Runtime selection and knowledge graph read model; full shared state across views pending. Full acceptance remains open.

- [ ] **EH-D06 — Live research canvas** (P1; milestone 4)
  - **Depends on:** EH-A05, EH-D05.
  - **Enhance/reuse:** autonomous-research-panel and browser-research-orchestration.
  - **Acceptance:** Actual query, retrieval, failed/denied, admission, gaps and cancellation; distinguish host-mediated from browser-native and fixture from live.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Actual research bridge and event projection; no fabricated activity. Full acceptance remains open.

- [ ] **EH-D07 — Research notebook** (P1; milestone 4)
  - **Depends on:** EH-D05, EH-D06.
  - **Enhance/reuse:** existing research report and source handoff.
  - **Acceptance:** Render reviewed/proposed claims, quotes, dates, uncertainty and cited passages; update from admitted version; no auto adoption of draft sources.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-D08 — Command palette and deep links** (P1; milestone 4)
  - **Depends on:** EH-D01, EH-D05.
  - **Enhance/reuse:** existing Ctrl/Command K and tool jump.
  - **Acceptance:** Search trusted commands, entities and capabilities; focus safe targets, disabled reasons, URL state without secrets; no action on search alone.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-D09 — Mission control placement** (P1; milestone 4)
  - **Depends on:** EH-D05, EH-A10.
  - **Enhance/reuse:** existing budget, consent and cancel controls.
  - **Acceptance:** Sticky compact run status, reservations, permission pending and stop reachable from every active view; mobile alternative; never mask unknown billing.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-D10 — Guided investigation cinema** (P1; milestone 4)
  - **Depends on:** EH-D07, EH-D08, EH-D09.
  - **Enhance/reuse:** demo-guide.mjs and worked fixtures.
  - **Acceptance:** Narrated/stepwise retained fixture or real receipt replay, with clear mode labels and no external actions; new user completes one meaningful proof export.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

### E. Open web discovery and interoperability (12)

Reuse areas: `public/agents; peer/agents; browser-investigation.js; packages/sutra-runtime/index.js; agent-studio.js; consent package`.

- [ ] **EH-E01 — Publisher and network inventory** (P1; milestone 5)
  - **Depends on:** EH-A01, EH-B01.
  - **Enhance/reuse:** existing caller, guide, manifest and links files.
  - **Acceptance:** List exact origins, versions and artifact digests; distinguish bundled, loopback, publicly observed and unverified candidate; no invented directory.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Same-origin static manifest and link inspection. Full acceptance remains open.

- [ ] **EH-E02 — User-controlled discovery** (P1; milestone 5)
  - **Depends on:** EH-E01.
  - **Enhance/reuse:** existing loadLocalNetwork and bounded fetch.
  - **Acceptance:** Explicit origin/URL selection, validate scheme/origin/manifest limits before contact; denied or malformed input zero unauthorized traffic.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Explicit credentialless bounded discovery; arbitrary cross-origin discovery not enabled. Full acceptance remains open.

- [ ] **EH-E03 — Agent passport** (P1; milestone 5)
  - **Depends on:** EH-E01, EH-E02.
  - **Enhance/reuse:** existing artifact digests and runtime compatibility.
  - **Acceptance:** Show publisher claims, supported schema, tools, limits, disclosure, integrity, availability and unknown independence; no visual trust certification.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Passport inspection, exact digest and compiler result; full disclosure and availability UX pending. Full acceptance remains open.

- [ ] **EH-E04 — Capability directory and comparison** (P1; milestone 5)
  - **Depends on:** EH-B05, EH-E03.
  - **Enhance/reuse:** registry and user-authored/imported manifests.
  - **Acceptance:** Search/filter candidate definitions by capability; alternatives local/peer/model; distinguish absent, incompatible and unavailable; no silent crawling.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Capability registry and comparison screen. Full acceptance remains open.

- [ ] **EH-E05 — Visual network composer** (P1; milestone 5)
  - **Depends on:** EH-B09, EH-E03.
  - **Enhance/reuse:** agent-studio and compileNetwork.
  - **Acceptance:** Drag/keyboard connection editor, validate ports/dependencies and preview exact portable graph; reject cycle/unsupported tools; no execution by edit.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-E06 — Publisher studio** (P1; milestone 5)
  - **Depends on:** EH-E05.
  - **Enhance/reuse:** existing portable JSON build and packaging.
  - **Acceptance:** Create/inspect/export manifest+network bundle with schema, origin, notices and digest; preview locally; publishing separately authorized.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-E07 — Portable import and export** (P1; milestone 5)
  - **Depends on:** EH-E06.
  - **Enhance/reuse:** existing network artifacts, proof capsule and pins.
  - **Acceptance:** Round-trip supported artifacts byte-exact or explicitly canonicalized; reject tamper and unsupported fields; import never auto-executes.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Strict bounded local network import for inspection only; export/publish workflow not implemented. Full acceptance remains open.

- [ ] **EH-E08 — Consent cockpit** (P0; milestone 5)
  - **Depends on:** EH-B10, EH-E02.
  - **Enhance/reuse:** existing consent inspector and browser plan preview.
  - **Acceptance:** Display exact destination, purpose, payload/redaction, version pin, limits and one-use grant; deny, expiry and changed scope cause zero contact.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-E09 — Cross-origin peer execution** (P1; milestone 5)
  - **Depends on:** EH-E05, EH-E08.
  - **Enhance/reuse:** existing guide peer runtime and separate-origin fixture.
  - **Acceptance:** Recorded caller/peer ancestry and authorization; loopback two-origin positive and denial tests; arbitrary external origins remain unsupported unless admitted by policy.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-E10 — Open network observatory** (P1; milestone 5)
  - **Depends on:** EH-A04, EH-E09.
  - **Enhance/reuse:** execution feeds and browser-run receipts.
  - **Acceptance:** Visualize observed calls, artifact receipt and failure; never show discovered peer as executing without trace; preserve model vs tool vs peer counts.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-E11 — Neutral interoperability journey** (P1; milestone 5)
  - **Depends on:** EH-E07, EH-E09.
  - **Enhance/reuse:** existing neutral conformance archives and browser matrix.
  - **Acceptance:** Run at least two separately authored compatible graphs without SUTRA-specific names or frontend code changes; label fixture vs real public deployment.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-E12 — Public HTTPS acceptance boundary** (P1; milestone 5)
  - **Depends on:** EH-E10, EH-E11.
  - **Enhance/reuse:** REL-C11, C19, R15 and deployment approval.
  - **Acceptance:** After owner authorization verify actual caller and independent publisher origins, manifests and browser journey; retain failures; cannot close from localhost or control-plane success.
  - **Evidence:** none for this new gate. External evidence or owner authorization required; keep open until observed.

### F. Live operations, revisions and recovery (10)

Reuse areas: `execution-events.js; execution-recovery.js; role-review-checkpoint.js; browser-run-receipt.js; reviewed-workspace.js`.

- [ ] **EH-F01 — Run and operation state machine** (P0; milestone 6)
  - **Depends on:** EH-A07.
  - **Enhance/reuse:** execution-events.js and browser receipts.
  - **Acceptance:** Proposed/admitted/queued/executing/validating/terminal states derive from authority; unknown dispatch outcome not success; malformed transition refused.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Existing closed execution journal projection and explicit research terminal state. Full acceptance remains open.

- [ ] **EH-F02 — Resource accounting view** (P0; milestone 6)
  - **Depends on:** EH-B07, EH-F01.
  - **Enhance/reuse:** existing reserved calls, bytes, caps and timeouts.
  - **Acceptance:** Separate estimates/reserved/observed and unknown billed amounts; account correctly under cancellation and concurrent tasks.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-F03 — Graph revision proposal and diff** (P0; milestone 6)
  - **Depends on:** EH-B10, EH-F01.
  - **Enhance/reuse:** existing revision preview and DAG compiler.
  - **Acceptance:** Capability gap yields explicit proposed graph with added/removed/retained tasks, changed disclosure and version; proposal has no authority.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-F04 — Revision authorization and admission** (P0; milestone 6)
  - **Depends on:** EH-F03, EH-E08.
  - **Enhance/reuse:** existing consent and version fences.
  - **Acceptance:** Revalidate exact graph, version, disclosure and remaining budgets; any new grant requires approval; deny leaves existing history intact.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-F05 — Bounded adaptation policy** (P0; milestone 6)
  - **Depends on:** EH-F04.
  - **Enhance/reuse:** scheduler caps and cancellation.
  - **Acceptance:** Enforce limits for revisions, recursion, invocations, tasks, time and bytes across run, not reset on revision; test denial and exhaustion.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-F06 — Cancellation and stale fencing** (P0; milestone 6)
  - **Depends on:** EH-F01, EH-D09.
  - **Enhance/reuse:** existing AbortController and assertCurrent.
  - **Acceptance:** Stop disables new dispatch; late completion cannot publish; unknown external outcome stays unknown; cancellation visible across views.
  - **Evidence:** partial implementation only; [run 46128941298](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128941298), `9255a1d`. Pre-aborted local scheduler test with no admitted artifact; broader cancellation regression pending. Full acceptance remains open.

- [ ] **EH-F07 — Artifact reuse and provenance** (P0; milestone 6)
  - **Depends on:** EH-F03, EH-F04.
  - **Enhance/reuse:** existing role artifact sealing and reuse panels.
  - **Acceptance:** Only reuse with validated input/dependency/version compatibility; invalidation transitively propagates; old pins remain retained.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-F08 — Versioned dynamic recovery** (P0; milestone 6)
  - **Depends on:** EH-F05, EH-F07, EH-A08.
  - **Enhance/reuse:** existing execution-recovery and fixed legacy profile.
  - **Acceptance:** Introduce distinct versioned manifest profile only if needed; validate tamper, wrong plan, missing dependency, resume bounds; legacy archive bytes remain compatible.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-F09 — Timeline and replay** (P0; milestone 6)
  - **Depends on:** EH-F01, EH-F07.
  - **Enhance/reuse:** existing checkpoint timeline and journal.
  - **Acceptance:** Scrub exact retained events, distinguish gaps/truncation, no credentials or network on playback; original run immutable.
  - **Evidence:** partial implementation only; [run 46128941298](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128941298), `9255a1d`. Validated exact journal-prefix replay and negative reordered history; browser replay pending. Full acceptance remains open.

- [ ] **EH-F10 — Integrated adaptive journey** (P0; milestone 6)
  - **Depends on:** EH-F05, EH-F06, EH-F08, EH-F09.
  - **Enhance/reuse:** existing browser revision/recovery tests.
  - **Acceptance:** Fixture discovers missing capability, proposes and admits bounded revision, preserves/reuses justified artifact, cancels or completes and exports; verify denied variant zero new contacts.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

### G. Evidence, knowledge and proof (10)

Reuse areas: `investigation-graph.js; impact-projection.js; pinned-workspace.js; reviewed-workspace.js; debugger.js; independent verifier`.

- [ ] **EH-G01 — Evidence constellation** (P1; milestone 7)
  - **Depends on:** EH-C03, EH-D05.
  - **Enhance/reuse:** existing investigationGraph and admitted source records.
  - **Acceptance:** Show declared lineage, digest, reported claim and dependency edge; copied sources cluster, do not assert independence; exact provenance inspectable.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Canonical dependency projection and source/quantity/candidate grouping. Full acceptance remains open.

- [ ] **EH-G02 — Source microscope** (P1; milestone 7)
  - **Depends on:** EH-G01, EH-D07.
  - **Enhance/reuse:** existing reviewed source spans and source handoff.
  - **Acceptance:** Jump from claim to exact offsets/text/digest, date/freshness, unit/scope and unknowns; preserve raw bytes and safe rendering.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Exact span text and offsets; date/freshness display still pending. Full acceptance remains open.

- [ ] **EH-G03 — Semantic multiverse** (P1; milestone 7)
  - **Depends on:** EH-G02.
  - **Enhance/reuse:** semantic-intake and candidate comparison.
  - **Acceptance:** Branch alternative meanings and coverage, show unresolved and conditional status; no generated meaning treated as verified truth.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Competing interpretation display; full semantic multiverse not implemented. Full acceptance remains open.

- [ ] **EH-G04 — Competing conclusions** (P1; milestone 7)
  - **Depends on:** EH-G03.
  - **Enhance/reuse:** existing semantic triage and report.
  - **Acceptance:** Side-by-side competing candidates with supporting/contradicting evidence, assumptions and limitations; no forced consensus.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-G05 — Knowledge dependency debugger** (P1; milestone 7)
  - **Depends on:** EH-G01, EH-F07.
  - **Enhance/reuse:** impact-projection and withdrawal preview.
  - **Acceptance:** Select source, preview affected/retained/refused candidates and reasons; no mutation before explicit apply; stale preview refused.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Upstream/downstream links and existing authoritative revision entrypoint. Full acceptance remains open.

- [ ] **EH-G06 — Scenario and uncertainty visualization** (P1; milestone 7)
  - **Depends on:** EH-G03, EH-G04.
  - **Enhance/reuse:** existing interval/world/clarification panels.
  - **Acceptance:** Represent bounded hypothetical inputs, exact units and conditional results; distinguish scenario from observed evidence and expose decisive next observation.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-G07 — Living history and branch explorer** (P1; milestone 7)
  - **Depends on:** EH-G05, EH-F07.
  - **Enhance/reuse:** history-host, pinned workspace and history controls.
  - **Acceptance:** Inspect parent/child and sibling conflicts; compare before/after, retain pins, explicit restore; stale durable CAS refusal remains intact.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-G08 — Proof explorer** (P1; milestone 7)
  - **Depends on:** EH-G02, EH-G07.
  - **Enhance/reuse:** existing capsule, roundtrip and Python verifier.
  - **Acceptance:** Show exact artifact/digest, what local replay verifies vs independent Python replay; wrong pin/tamper fails; no truth claim.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Exact local computation graph/report export and existing verifier route. Full acceptance remains open.

- [ ] **EH-G09 — Portable knowledge exchange** (P1; milestone 7)
  - **Depends on:** EH-G07, EH-G08.
  - **Enhance/reuse:** existing version/history/checkpoint exports.
  - **Acceptance:** Import exact supported archives with separate pin; privacy review before export; preserve historical schema and unsupported-case refusal.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-G10 — End-to-end signature demonstration** (P1; milestone 7)
  - **Depends on:** EH-G04, EH-G06, EH-G09.
  - **Enhance/reuse:** guided debugger and research-revision tests.
  - **Acceptance:** Question → sources → competing interpretations → conditional result → correction/withdrawal → changed/retained outcome → independent replay; actual browser plus separate verifier.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

### H. Mobile, accessibility and human experience (8)

Reuse areas: `workspace-accessibility.cjs; orbit.css; master.css; style.css; existing screenshot workflow`.

- [ ] **EH-H01 — Responsive workspace shell** (P1; milestone 8)
  - **Depends on:** EH-D01, EH-C12.
  - **Enhance/reuse:** existing 320px reflow checks.
  - **Acceptance:** 320/360/390/768/1440 widths, portrait/landscape and 200% text; no document overflow, clipped labels or hidden primary action.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. 320/390/768/1440 Chromium no document overflow; first viewport compacting and full landscape/200% acceptance pending. Full acceptance remains open.

- [ ] **EH-H02 — Touch-first navigation and graph** (P1; milestone 8)
  - **Depends on:** EH-C06, EH-H01.
  - **Enhance/reuse:** existing pan/zoom and controls.
  - **Acceptance:** 44px preferred touch targets, bottom/sheet navigation, no mandatory hover, explicit zoom/reset and list alternative; physical-device check separate.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-H03 — Keyboard and focus** (P1; milestone 8)
  - **Depends on:** EH-D08, EH-H01.
  - **Enhance/reuse:** existing keyboard journey.
  - **Acceptance:** All primary flows reachable without pointer; modal focus restored, no trap, visible focus, command shortcuts scoped, selection retained.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Existing keyboard contract passed, focus retention added; new paths still require full keyboard audit. Full acceptance remains open.

- [ ] **EH-H04 — Screen reader semantics** (P1; milestone 8)
  - **Depends on:** EH-C08, EH-H03.
  - **Enhance/reuse:** existing aria-live and graph lists.
  - **Acceptance:** Named landmarks, headings, controls, status announcements and text equivalents for nodes/edges; avoid event flood; automated plus actual human screen reader.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-H05 — Contrast and reduced motion** (P1; milestone 8)
  - **Depends on:** EH-C11, EH-H01.
  - **Enhance/reuse:** existing theme and frame tests.
  - **Acceptance:** WCAG 2.2 AA target, verify normal text/state contrast across all themes, reduced motion parity and no idle frames; no color-only status.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Reduced-motion Chromium tests and static renderer; full contrast and device study pending. Full acceptance remains open.

- [ ] **EH-H06 — Plain-language empty and failure states** (P1; milestone 8)
  - **Depends on:** EH-D06, EH-D09.
  - **Enhance/reuse:** existing refusal/cancel paths.
  - **Acceptance:** Explain what is unavailable, why, next safe action and no misleading completion; display no-model offline path without setup.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Empty/unknown/denial/refusal states and explicit capability gaps. Full acceptance remains open.

- [ ] **EH-H07 — Human usability study** (P1; milestone 8)
  - **Depends on:** EH-D10, EH-G10, EH-H03, EH-H04, EH-H06.
  - **Enhance/reuse:** REL-U01/U09 and guided examples.
  - **Acceptance:** 5–10 consenting target users, uncoached objective-to-proof task; first-action comprehension within 10s target, completion/time/confusion, fixes and retest; disclose small sample.
  - **Evidence:** none for this new gate. External evidence or owner authorization required; keep open until observed.

- [ ] **EH-H08 — Human mobile and accessibility acceptance** (P1; milestone 8)
  - **Depends on:** EH-H02, EH-H03, EH-H04, EH-H05.
  - **Enhance/reuse:** REL-U07.
  - **Acceptance:** Physical phone and desktop, real screen reader plus manual keyboard/reflow; record OS/browser/device and findings; automated results alone insufficient.
  - **Evidence:** none for this new gate. External evidence or owner authorization required; keep open until observed.

### I. Performance and resource efficiency (6)

Reuse areas: `workspace-performance.cjs; build.mjs; Vite config; frame-driver.js; static packaging`.

- [ ] **EH-I01 — Baseline and transfer budget** (P1; milestone 8)
  - **Depends on:** EH-A01.
  - **Enhance/reuse:** existing CI performance report.
  - **Acceptance:** Measure exact-head cold desktop and emulated phone, 4x CPU/1Mbps/150ms; compare existing 310537-byte historical baseline; target initial compressed transfer <500KB, define included resources.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Cold desktop/mobile emulation performance artifact retained; targets not yet certified. Full acceptance remains open.

- [ ] **EH-I02 — Progressive loading** (P1; milestone 8)
  - **Depends on:** EH-D01, EH-I01.
  - **Enhance/reuse:** index.html, Vite and existing offline shell.
  - **Acceptance:** Load primary view first; lazily mount graph/labs/verifier where safe; preserve offline entry and build/packaging contract; compare bytes and request counts.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-I03 — Interaction and layout performance** (P1; milestone 8)
  - **Depends on:** EH-I02, EH-C09.
  - **Enhance/reuse:** existing performance harness.
  - **Acceptance:** Measure LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 p75 targets with stated sample/device; lab proxies labeled; no production field claim without field data.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-I04 — Demand-driven animation and graph load** (P1; milestone 8)
  - **Depends on:** EH-C07, EH-C09, EH-I01.
  - **Enhance/reuse:** frame-driver and visualization.
  - **Acceptance:** Zero recurring idle/hidden JS frames, reduced-motion parity; target 60 FPS on capable hardware with 12 participants; measure 64/500-entity rendering separately.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-I05 — Lifecycle and memory** (P1; milestone 8)
  - **Depends on:** EH-D05, EH-I04.
  - **Enhance/reuse:** existing event journal retention and workspace teardown.
  - **Acceptance:** Repeated mount/switch/50 fixture runs with bounded journal and no orphan subscriptions/frames; record heap trend, browser errors and cap behavior.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-I06 — Static-first deployment efficiency** (P0; milestone 8)
  - **Depends on:** EH-I02, EH-I03, EH-I04, EH-I05.
  - **Enhance/reuse:** REL-S14 and C11, static build.
  - **Acceptance:** Verify zero unapproved external requests locally; after approved deployment measure static browsing Worker invocations (target zero), CDN cache and actual ingress costs; no deployment claim from build.
  - **Evidence:** none for this new gate. External evidence or owner authorization required; keep open until observed.

### J. Security, regression and release evidence (8)

Reuse areas: `sutra-consent; existing build-contract, browser, knowledge, workspace and browser-matrix workflows; DEVPOST-PRE-RELEASE.md`.

- [ ] **EH-J01 — Threat model and permission invariants** (P0; milestone 8)
  - **Depends on:** EH-A02, EH-B01.
  - **Enhance/reuse:** existing consent, capability and runtime contracts.
  - **Acceptance:** Threat-to-test matrix covers confused deputy, injection, malicious manifest, credential leakage, spoofed event and recursive cost; UI never grants authority.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-J02 — Untrusted UI data admission** (P0; milestone 8)
  - **Depends on:** EH-D03, EH-J01.
  - **Enhance/reuse:** strict-json, existing safe DOM rendering and component registry.
  - **Acceptance:** Reject prototype keys, executable HTML/JS, unsafe URL and oversized input; test malicious names/labels/source content; no network or script execution.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Static artifact URL/credentials and strict import negative tests; full malicious input suite remains. Full acceptance remains open.

- [ ] **EH-J03 — Secret and privacy regression** (P0; milestone 8)
  - **Depends on:** EH-E08, EH-J01.
  - **Enhance/reuse:** existing ephemeral vault, receipts and exports.
  - **Acceptance:** Canary secrets excluded from DOM telemetry, journal, URLs, local storage, checkpoints, exported bundles and third-party contacts; no new storage without policy.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-J04 — Authorization and cancellation negatives** (P0; milestone 8)
  - **Depends on:** EH-F05, EH-F06, EH-J01.
  - **Enhance/reuse:** existing consent and orchestration browser tests.
  - **Acceptance:** Denied/replayed/expired/stale permits, unknown route, recursive delegate and post-stop paths generate zero unauthorized transport contacts; retain counters.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-J05 — Compatibility suite and feature parity** (P0; milestone 8)
  - **Depends on:** EH-A12, EH-G10, EH-J02.
  - **Enhance/reuse:** existing browser.cjs, master.cjs, research-revision, durable-recovery, build-contract and verifier.
  - **Acceptance:** Run original suites unweakened, migration inventory every original user path; old exports/pins and separate-origin fixtures pass or block.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Original full browser, recovery, Python replay and research revision workflow passed on recorded revision. Full acceptance remains open.

- [ ] **EH-J06 — Integrated browser matrix** (P0; milestone 8)
  - **Depends on:** EH-C12, EH-H05, EH-J03, EH-J04, EH-J05.
  - **Enhance/reuse:** existing workspace/knowledge/operator/browser-matrix CI.
  - **Acceptance:** Exact-head Chromium plus supported Firefox/WebKit where applicable; retain screenshots, events, network canaries, performance and test outputs; no skipped-as-pass.
  - **Evidence:** partial implementation only; [run 46128578774](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/46128578774), `45a0e12`. Scoped workspace and independent-origin acceptance on earlier revision; full latest-head matrix pending. Full acceptance remains open.

- [ ] **EH-J07 — Release crosswalk and independent review** (P0; milestone 8)
  - **Depends on:** EH-J06, EH-H07, EH-H08, EH-I03.
  - **Enhance/reuse:** REL-U01–U10, R15, C11/C19, S12–S14.
  - **Acceptance:** Revalidate affected existing gates on new head; human reviewer records unresolved issues; no double counting or claiming live inference/public deployment from fixture.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

- [ ] **EH-J08 — Final promotion and rollback readiness** (P0; milestone 8)
  - **Depends on:** EH-J07, EH-E12, EH-I06, EH-F10, EH-B12.
  - **Enhance/reuse:** existing release register and static packaging.
  - **Acceptance:** All required Event Horizon gates exact-head accepted; documented rollback to previous working shell, unresolved external gates keep NO-GO; owner approval for merge/deploy required.
  - **Evidence:** none for this new gate. Exact-head engineering evidence required.

## Existing release crosswalk (non-additive)

| Existing release gates | Enhancement coverage | Rule |
|---|---|---|
| REL-U01, U02, U06, U10 | D01–D03, D08–D10, H07 | Objective-first and optional advanced paths; revalidate comprehension and existing model-picker behavior. |
| REL-U03, R15 | A03–A12, C07, D06, E09–E11, F01–F06 | Truthful operation display; browser-native and host-mediated remain distinct. |
| REL-U04, U05, R02, R03, I02 | G01–G10, D06–D07 | Retain source admission, lineage, research quality limitations and revision evidence. |
| REL-U07, U09 | H01–H08 | Real human/device evidence still required. |
| REL-U08, S14 | I01–I06 | Measure exact-head, distinguish lab from deployed telemetry. |
| REL-C11, C19, S12, S13 | E01–E12, J01–J08 | Public HTTPS, neutral conformance, security and distribution obligations remain separate. |
| REL-R07, S11, B09 | F01–F10, G05–G10, J05–J08 | Preserve atomic revision, failure recovery and integrated CI. |

## Mandatory scenario matrix

| Scenario | Expected behavior |
|---|---|
| 1000 mm → m | Zero AI agents, zero external contacts, exact local result. |
| One specialist with multiple tasks | One instance, independent task states and correct invocation count. |
| Bus route vs aviation investigation | Requirements differ, no mandatory common cast; labels describe capability, not licensure. |
| Ten-agent synthetic investigation | Ten distinct instances and honest fixture label; no expanded live invocation authority. |
| Same model / same source lineage | No false independent agreement. |
| Unknown publisher definition and unavailable peer | Safe passport or explicit refusal, no silent fallback/disclosure. |
| Concurrent, duplicated, stale and cancelled event | No corrupt state, false completion or post-stop dispatch. |
| Mid-run capability gap and revised graph | Explicit proposal, exact consent, bounded admission, unchanged prior history. |
| Source correction / withdrawal | Preview impact, explicit apply, affected and retained results, pinned replay. |
| Replay / export | No fresh calls, redacted credentials, exact supported archive and independent verification scope. |
| 320px, keyboard, screen reader and reduced motion | Accessible primary flows and list alternative, no horizontal page overflow. |
| Existing six-role and old proofs | Backward compatible profile, no forced migration, unchanged verification semantics. |

## First implementation checkpoint

Start EH-A01: inspect fixed-role constants, numbered role arrays, station mapping, event-to-role coercion, existing DOM selectors and tests; create an explicit migration inventory. Then EH-A02/A03/A04/A05: define stable projection and adapters, prove unknown IDs/variable counts with retained events, retain six-role optional profile. Do not start a new app, remove labs, replace the engine, or redesign the consent protocol. No enhancement gate is accepted by creating this register.
