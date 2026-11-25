# SUTRA v2 browser laboratory

Isolated from the legacy learner and all production routes. Reuse existing pinned Vite and Playwright versions from apps/sutra; no second dependency tree. From repository root:

```sh
npm ci --prefix apps/sutra
node apps/sutra/node_modules/vite/bin/vite.js build apps/sutra-v2
node apps/sutra-v2/stage-lesson.mjs
node apps/sutra/node_modules/playwright/cli.js install chromium
node apps/sutra-v2/test/browser.cjs
```

The actual browser graph calculation and mutation are local, with no model or network. The optional scripted planning path exercises the unchanged pinned agent runtime with two local agents; the model can only select a host-approved method, not supply a verdict or code. Two calculations share the assumed beam formula; they differ in whether the section moment is declared or derived. This is not independent scientific corroboration. Export contains exact graph and receipt text, and browser replay is same-kernel. Separate Python reference consumer is tested in CI. No public deployment, physical-device or human accessibility acceptance claimed.

The integrated learner uses the existing synthetic v1 timing fixture through the real content-profile and source-tool packages. The finite timing hypothesis question is resolved only at catalog-consistency level. Verified media bytes and native seek show the source interval, not empirical truth. Prediction feedback is not a measured learning outcome. No new media or original lesson claims.

Original synthetic subgroup lesson adds an actual second-origin fixture publisher under `peer/agents`. The browser harness serves it on a distinct loopback origin and exercises explicit contact consent. The caller locally derives observation partitions from its own graphs; the peer offers no source values or verdict. A host-pinned original synthetic table drives the subsequent comparison. No live inference or independent ownership claim.
