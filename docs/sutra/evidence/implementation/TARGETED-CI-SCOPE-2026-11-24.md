# Targeted CI dependency scope — 2026-11-24

SUTRA's full learner workflow remains intentionally broad because it is the integration safety net. Two expensive specialized workflows are now narrower:

- **Browser compatibility matrix** runs for learner source, published media/guides/agent data, app package/build config and the runtime/evidence/source/consent/action packages that affect its browser behaviors. App test/doc-only changes and unrelated SUTRA packages no longer trigger three browser-engine installations.
- **Engineering evaluation** runs for the comparison/uncertainty/direct-retrieval/receipt-action modules, timing fixture, source-learner graph, runtime/evidence/source packages, source API handler and evaluation data/tooling. CSS, unrelated learner panels and peer-only packages do not trigger the synthetic benchmark.

The impact classifier remains fail-closed for new managed product boundaries and identifies which evidence families become stale. Narrowing a specialized trigger never replaces the broad learner integration suite. If a dependency is added to a specialized test/import graph, update both the workflow trigger and verification map in the same change.

This implements targeted revalidation rather than rerunning every expensive suite after documentation or unrelated code changes.

### Long-lived PR correction

A path-filter-only design was insufficient: GitHub evaluates `pull_request.paths` against the cumulative base→head diff, so this long-lived feature PR still started expensive specialized jobs after unrelated later commits. The workflows now add a lightweight **metric-freshness gate**. They compare the exact PR head against the metric's recorded source revision using the impact map. The three-engine matrix runs only when `desktop_browser_matrix` is stale; the engineering evaluation runs only when `engineering_baseline` is stale. Manual `workflow_dispatch` always forces the expensive job. Missing metric records also force a run.

This optimization does not gate the broad learner integration safety net. It reduces redundant specialized work without using the latest commit alone as a proxy for evidence freshness.
