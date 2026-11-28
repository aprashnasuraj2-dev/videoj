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
