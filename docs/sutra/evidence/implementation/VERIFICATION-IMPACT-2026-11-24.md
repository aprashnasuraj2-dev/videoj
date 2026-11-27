# Verification impact and metric freshness

SUTRA now treats evidence as revision-bound rather than permanently green.

`docs/sutra/verification-map.json` maps product paths to the verification suites they can invalidate. `docs/sutra/tools/impact.mjs BASE HEAD` classifies a change, returns required workflow names, and lists metric families that become stale. A file in a managed SUTRA product root that matches no suite fails classification, forcing the map to evolve with new architecture.

`docs/sutra/evidence/metrics.json` preserves measured values together with the exact source revision and limitations. `impact.mjs --metrics HEAD` compares every recorded metric revision to the requested head and reports whether intervening changed paths affect that metric. Historical values are never rewritten into a newer revision. Staleness is visible; it is not a failure by itself during development.

Current recorded revision `3a1309bab9cd8d08ce32866118c94f3207a5209e` passed all nine pre-impact workflows. Its engineering-v1 baseline was 20/20 retrieval and 10/10 adversarial cases; direct median 0.035867 ms versus delegated 3.404983 ms in-process, 0 versus 90 scripted model calls and 0 versus 90 source RPCs. Provider token usage and semantic precision remain null. The same revision passed Chromium, Firefox and WebKit headless desktop matrix and the synthetic hero journey.

This mechanism does not prove a required workflow actually ran on a future revision. The PR workflow emits the affected suite/workflow list and freshness artifact; the checkpoint process must still inspect the corresponding exact-revision CI results before crediting checklist tasks. Release metrics must be current to the eventual candidate revision.