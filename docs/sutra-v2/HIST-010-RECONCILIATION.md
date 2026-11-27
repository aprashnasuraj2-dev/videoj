# Reconciliation at ad182e801d969e9209009de54df1c8a9cfb1a6de

Compared the final PR head's blob IDs on every changed path against the recursive canonical tree. “Main only” includes paths the PR removed. Matching deletions are counted separately.

| PR | Identical blobs | Both differ | PR only | Main only | Both absent |
|---|---:|---:|---:|---:|---:|
| #41 | 3 | 22 | 0 | 0 | 0 |
| #42 | 9 | 10 | 0 | 0 | 0 |
| #43 | 4 | 18 | 0 | 0 | 0 |
| #44 | 26 | 27 | 0 | 0 | 0 |
| #45 | 7 | 34 | 0 | 0 | 0 |
| #46 | 2 | 6 | 0 | 0 | 0 |
| #47 | 17 | 18 | 0 | 0 | 0 |
| #48 | 0 | 62 | 25 | 0 | 0 |
| #49 | 287 | 69 | 65 | 0 | 0 |
| #50 | 626 | 9 | 2 | 0 | 169 |
| #51 | 5 | 3 | 0 | 0 | 0 |
| #52 | 7 | 2 | 0 | 0 | 0 |
| #53 | 10 | 2 | 0 | 0 | 0 |
| #54 | 5 | 0 | 0 | 0 | 0 |
| #55 | 3 | 0 | 0 | 0 | 0 |
| #56 | 5 | 0 | 0 | 0 | 0 |
| #57 | 11 | 0 | 0 | 0 | 0 |
| #58 | 6 | 6 | 0 | 0 | 0 |
| #59 | 5 | 0 | 0 | 0 | 0 |
| #60 | 12 | 1 | 0 | 0 | 0 |
| #61 | 76 | 11 | 1 | 0 | 0 |
| #62 | 0 | 4 | 4 | 135 | 54 |

## Source dispositions

| Workstream | Disposition | Basis |
|---|---|---|
| #51 model orchestration | Integrated with newer replacement | Operator console and orchestration retained. Main runs its browser test with the workspace toolchain. |
| #52 persistent history | Integrated with newer replacement | File-store lock, version, and witness changes survive. Main adds filesystem profile enforcement. |
| #53 semantics | Integrated with newer replacement | Compiler and fixtures match. The impact test and verification map cover later changes. |
| #54 acquisition, #55 independent replay, #56 counterfactuals, #57 recovery, #59 specialist journeys | Fully integrated at path level | All changed blobs match their respective PR heads. This does not close the broad product gates. |
| #58 workspace | Integrated with newer replacement | Reviewed table and question paths survive in the extended workspace. Main exercises the complete workspace and accessibility from its own workflow. |
| #60 benchmarking | Integrated with newer replacement | Benchmark code, fixtures and license match. Workflow now selects main. |

PRs #41–47 have no changed path missing from canonical source. They cover the original register, evidence validator, shell, player, inference, packaging and consent. Earlier implementations with changed bytes are historical baselines. #50 and #61 are ancestors of main. Their missing validation-only workflows were explicitly retired.

#48 and #49 remain open as partial integrations. Neither head merges cleanly. #48 has unique annotation, transcript and provenance modules and tests. #49 has unique workspace integration, cancelable operations, research, and reviewer tooling. No blanket semantic equivalence is established. Keep the unique files recoverable while porting any applicable behavior under the active checklist. #62 was closed because its deletion set overlaps 135 current paths. It also retained four retired-product documents that main omits.

### Paths present only on the two partial PRs among their changed files

#### #48 at 61a575449c7266aad3b731468c900927a8ba5bc9

- `apps/sutra-peer/public/agents/checklist.evidence.json`
- `apps/sutra/public/evidence/transcript-v3.vtt`
- `apps/sutra/public/media/timing-transcript.vtt`
- `apps/sutra/src/fixtures/timing-transcript.json`
- `apps/sutra/src/provenance-store.js`
- `apps/sutra/src/run-lifecycle.js`
- `apps/sutra/src/source-comparison.js`
- `apps/sutra/src/transcript-index.js`
- `apps/sutra/test/provenance-store.test.mjs`
- `apps/sutra/test/run-lifecycle.test.mjs`
- `apps/sutra/test/source-comparison.test.mjs`
- `apps/sutra/test/transcript-index.test.mjs`
- `docs/sutra/LEARNER_WORKSPACE.md`
- `docs/sutra/PUBLIC_ARTIFACT_INVENTORY.md`
- `packages/sutra-consent/test/redirect.test.mjs`
- `packages/sutra-evidence/annotation-cli.mjs`
- `packages/sutra-evidence/annotation.js`
- `packages/sutra-evidence/cue-link.js`
- `packages/sutra-evidence/examples/annotation.json`
- `packages/sutra-evidence/examples/integrity-manifest.json`
- `packages/sutra-evidence/examples/transcript-v3.vtt`
- `packages/sutra-evidence/test/annotation.test.mjs`
- `packages/sutra-inference/byok.js`
- `packages/sutra-inference/test/byok.test.mjs`
- `packages/sutra-runtime/test/external.test.mjs`

#### #49 at 1ab497bb706ed1f1d7c8e921cd037b1abb1fa87d

- `apps/sutra/public/agents/research_learner.network.json`
- `apps/sutra/public/agents/research_peer_learner.network.json`
- `apps/sutra/public/agents/source_peer_learner.network.json`
- `apps/sutra/public/agents/v/085a65783ee5badd8464b6dbcfd341f3a02183ab/source_learner.network.json`
- `apps/sutra/public/agents/v/14c5c880786b47c6634d5ad18fb5eafb8739971f/research_peer_learner.network.json`
- `apps/sutra/public/agents/v/2b9d212fc1ff233a06cd35e1e571628e4622ee87/research_learner.network.json`
- `apps/sutra/public/agents/v/573cc12362d42b41f46de4afc62b757064a597c3/research_learner.network.json`
- `apps/sutra/public/agents/v/585ad6e003d35773580fa863ef0dd6a9d4783046/source_peer_learner.network.json`
- `apps/sutra/public/agents/v/d36734b9a15909190495fcd8a29bf821902bd6dc/source_learner.network.json`
- `apps/sutra/public/agents/v/ff40e39c6877a7d91591010ae8a9125d2bda4804/research_learner.network.json`
- `apps/sutra/src/provider-web-tools.js`
- `apps/sutra/src/workspace-integration.js`
- `apps/sutra/test/fixtures/synthetic-comparison.mjs`
- `apps/sutra/test/provider-peer-browser.cjs`
- `apps/sutra/test/provider-telemetry.test.mjs`
- `apps/sutra/test/provider-web-tools.test.mjs`
- `apps/sutra/test/workspace-integration.test.mjs`
- `docs/sutra/CHANGELOG.md`
- `docs/sutra/COMMUNITY_TOOLS_AND_IMPACT.md`
- `docs/sutra/CONTRIBUTING.md`
- `docs/sutra/JUDGING_AVAILABILITY_RUNBOOK.md`
- `docs/sutra/MEASUREMENT_PROTOCOLS.md`
- `docs/sutra/OWNERSHIP_BOUNDARY.md`
- `docs/sutra/PARTICIPANT_HANDOFF.md`
- `docs/sutra/PERMISSION_ASSET_INVENTORY.md`
- `docs/sutra/REMAINING_GATE_MAP.md`
- `docs/sutra/RULES_ELIGIBILITY_SNAPSHOT.md`
- `docs/sutra/Technical_Report.md`
- `docs/sutra/evidence/implementation/PHASE-023-RUNTIME-ENTRY.md`
- `docs/sutra/evidence/implementation/SESSION-0046.md`
- `docs/sutra/evidence/implementation/SESSION-0047.md`
- `docs/sutra/evidence/implementation/SESSION-0048.md`
- `docs/sutra/evidence/implementation/SESSION-0049.md`
- `docs/sutra/evidence/implementation/SESSION-0050.md`
- `docs/sutra/evidence/implementation/SESSION-0051.md`
- `docs/sutra/evidence/implementation/SESSION-0052.md`
- `docs/sutra/evidence/implementation/SESSION-0053.md`
- `docs/sutra/evidence/implementation/SESSION-0054.md`
- `docs/sutra/evidence/implementation/SESSION-0055.md`
- `docs/sutra/evidence/implementation/SESSION-0056.md`
- `docs/sutra/evidence/implementation/SESSION-0057.md`
- `docs/sutra/evidence/implementation/SESSION-0058.md`
- `docs/sutra/evidence/implementation/SESSION-0059.md`
- `packages/sutra-runtime/abortable-operation.js`
- `packages/sutra-runtime/epistemic-answer.js`
- `packages/sutra-runtime/test/abortable-operation.test.mjs`
- `packages/sutra-runtime/test/epistemic-answer.test.mjs`
- `packages/sutra-runtime/test/source-refinement.test.mjs`
- `packages/sutra-runtime/test/web-access.test.mjs`
- `packages/sutra-runtime/web-access.js`
- `services/sutra-api/test/web-research.test.mjs`
- `services/sutra-api/web-research-config.js`
- `services/sutra-api/web-research.js`
- `tools/sutra-device-check/feedback-endpoint.mjs`
- `tools/sutra-device-check/feedback-endpoint.test.mjs`
- `tools/sutra-device-check/preflight.mjs`
- `tools/sutra-device-check/preflight.test.mjs`
- `tools/sutra-device-check/reviewer-cli.mjs`
- `tools/sutra-device-check/reviewer-feedback.template.json`
- `tools/sutra-device-check/reviewer.mjs`
- `tools/sutra-device-check/reviewer.test.mjs`
- `tools/sutra-evaluation/mapping-harness.mjs`
- `tools/sutra-evaluation/mapping-harness.test.mjs`
- `tools/sutra-research/firecrawl.mjs`
- `tools/sutra-research/run.mjs`
