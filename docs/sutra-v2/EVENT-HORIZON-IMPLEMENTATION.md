# Event Horizon implementation journal

2026-11-28 — baseline 24fe8a16e5a28db410d0c56cfbc36998e245526d. First incremental frontend slice. No release authority or expanded runtime limits.

## Inventory and migration decisions (EH-A01 initial evidence)

| Existing code | Migration decision |
|---|---|
| orbit.js ROLE, STATIONS, numeric selected/selectedStation, reviewStations, avatar array, fixed rehearsal steps, frame, record, inspector | Preserve in explicit Ring map / swarm / legacy deterministic review. New default Adaptive universe uses independent stable-key read-only projection. |
| research-activity.js roles, agentRoles, stations, parentRole | Legacy map remains compatible; new host projection uses reported operation metadata rather than fabricated agent edges; browser projection uses recorded span IDs and ancestry. |
| orbit.js initialize/setMode/popstate/Explore | Default universe uses existing research/council/review forms, navigation and objective focus. Explicit Ring map remains available; debugger fixture unchanged. |
| execution-channel.js and packages/sutra-runtime/execution-events.js | Existing module-owned validated journal feeds actual task manifests. Do not accept custom DOM event telemetry. |
| investigation-role-review.js ROLE_REVIEW_TASKS/HYBRID_REVIEW_TASKS, checkpoint and recovery | Preserve exact profile and archive semantics. No runtime rewrite. |
| master.js, reviewed-workspace.js, agent-studio.js, operator-model-console.js | Unchanged controller and consent paths. |
| master.cjs | Explicitly enter legacy Ring map for original rehearsal assertions. Keep old assertions; add separate default-mode browser tests. |
| frame-driver.js | New static SVG needs no frame loop. Legacy frame driver retained. |

## Implementation slice

- New event-horizon/projection.js: task manifest, arbitrary IDs, actor/task separation, bounded browser invocation ancestry, host operations and evidence, unknown terminal outcomes and session isolation.
- New layout.js: deterministic adaptive layouts, stable visual identity, bounded list fallback.
- New workspace.js/CSS: read-only run selector, topology, filter, participant/operation list, inspectors, counts, timeline, responsive observatory shell.
- Existing orchestration and consent remain authoritative. This is not dynamic capability composition, independent verification or proof of arbitrary publisher compatibility.
- Existing six-role view remains explicitly selectable; research forms remain available in the new default mode. Browser invocations are not falsely counted as distinct agent instances; host roles are not agent identities.
- New unit and actual browser tests wired into workspace CI. V8 precommit pure-module smoke: 45 assertions passed. Node/Chromium exact-head CI pending. No gate formally accepted before relevant exact-head acceptance, and no 20,000-line claim.

Next: verify actual CI; expand legacy inventory, active-run selection semantics, browser trace contract, event burst batching, accessibility and real browser multi-agent fixtures. Then scope EH-A01/A02/A03/A04/A05 closure based on observed evidence.

## Second slice — direct computation and knowledge workspace
- First slice exact-head workspace run 46128111610, job 140927118752: unit suite, canonical build, four-width Chromium adaptive/default and legacy test, existing full browser journey, durable recovery, independent Python replay, and research bridge passed. Browser-research-orchestration failed on an existing assertion translating select_query to query rather than search. Corrected the expected operation mapping and strengthened adjacent sequence check; 10 actual contacts and per-permit checks unchanged. Later checks were skipped, not passed.
- Reparent existing objective field and primary prepare actions, preserving their real handlers and restoring the original location in legacy mode. Compact primary mast. No duplicated disclosure controls.
- Introduce actual zero-agent exact local unit conversion: 8 closed quantity kinds, integer/decimal/rational input, existing scope compiler SI factors and kernel division, same-kernel replay, exact graph/report download; operation projects as one tool, zero agent instances and zero observed invocations.
- Add knowledge inspector over existing workspace snapshot and canonical dependency graph, exact source spans, declared lineages, competing interpretations, upstream/downstream highlighting, and links to authoritative revision/export controls.
- Explicit research terminal state from existing controller; unknown dispatch outcome remains unknown. Skip expensive hidden-view rerenders. New acceptance in existing Node and Chromium suites; new head must pass. No formal gate closed yet.

## Third slice — capability proposals and Agent Atlas
- Added host-owned capability catalog and exact bounded inclusion-minimal coverage enumeration across nine reusable workflow entrypoints. User selects requirements and model/host/peer consideration. Recommendations show unresolved capability gaps, conditions, declared definitions and unknown costs; opening a route is navigation only. No model-driven composition authority or arbitrary execution is enabled.
- Added explicit same-origin Agent Atlas index and passport inspection with the existing bounded response transport, strict JSON parser and network compiler. Reads restricted to /agents manifest, links and *.network.json paths, credentialless GET, no redirects, no query/fragment or unapproved headers. Symbolic peer-link inspection resolves only local artifact data, never contacts a peer. User-supplied graph JSON can be inspected with local-only compiler, bounded 64KiB, exact digest and arbitrary valid definitions. Imported graphs are not executed or published.
- Extended frontend browser suite to actual capability recommendation navigation and real static artifact inspection. Node acceptance enumerates all 512 capability subsets, negative URL/credential checks, arbitrary ten-definition import and local-only cycle/external rejection. Exact-head CI required; no new gate accepted solely from code.

## Fourth slice — graph navigation and recorded replay
- Bounded graph filters by entity and relationship, accessible paginated roster for up to 512 retained entities, stable selection, pan/zoom/fit controls, clustered component layout, inspection of existing route/consultation phase receipts.
- Reconstruct historical journal prefixes with the original closed execution-event validator; sequence zero precedes manifest admission, invalid prefixes fail closed, return to current state is explicitly distinct. No runtime execution, restored permissions or contacts. Browser test exercises replay of actual retained deterministic review and zoom.
- Third slice CI 46128578774 passed its new unit and four-width browser gate; integrated checks still underway at authoring. Impact classification 46128578764 failed because the new machine register path was not mapped. Add one exact mapping and negative unknown-JSON test; no wildcard waiver.

## Fifth slice — real variable-owner local task workshop
- Bounded 1–12 exact conversion tasks, explicitly named logical owners, 1–4 concurrent tasks and per-owner concurrency 1. Optional typed predecessor output feeds the next computation; reject unknown dependencies, cycles, incompatible quantity kinds or units and ambiguous inputs before execution. Existing scheduler, exact kernel and same-kernel replay produce actual result artifacts and validated journal events; no model invocation or external transport.
- Explicit review then execute; editing invalidates plan and results, cancellation forwards to existing scheduler, download contains exact plan pin and admitted result receipts. Actual ten-owner browser acceptance and 1/10 owner local DAG tests added. This is not ten independent AI agents or live provider expansion. Normalize negative zero at viewport fit and preserve partial/timeout/stale run labels. Exact-head CI pending.
