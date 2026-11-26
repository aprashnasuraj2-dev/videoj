# SUTRA session 0046 — 2026-11-26

Observed at 2026-11-26T12:48:46+05:45. Work branch `sutra/caller-peer-failure-boundary`, exact combined tested source `ae042db07f51d0cf1e71f002869ce9a65a011d48`. Connector-based session; no local checkout command is claimed.

## P0 closure

- X010-43 was reconciled from exact source `cbddb72b6ce582e8919edf2ea186682f1813e15a`: all 19 workflows successful, including learner shell run 45425180006 and browser matrix run 45425180050. R-066 is resolved.
- P0 persistent workspace/journey/semantic/security candidate initially landed at `15d85d336772b705169f49238ee0cd580a163faf`. Learner unit CI exposed two boundary-test issues: the existing first-party storage allowlist did not yet name the dedicated workspace controller, and the new secret-bearing-extension test incorrectly expected stripping rather than the implemented fail-closed rejection.
- Self-heal `864fe7b42675d375b0d60bd3b46ddc9bcc8a0930` retained fail-closed storage semantics and passed all 19 workflows, including Chromium, Firefox and WebKit.
- Verified behavior: no workspace persistence before explicit enablement; exact schema/readback and no-drop capacity stop; reload continuity after consent; navigation, DOM render delta, fetch classification and learner state propagation; ranked competing mappings with lexical confidence/disambiguation/fallback; rejection of raw URL/header/body/credential extensions.

## P1 engineering

- P1-1 ranked evaluation landed at `33da20c16ec4c83a7ccc1bbd8c7bd4adf0c04221`. `node --test tools/sutra-evaluation/*.test.mjs` and baseline generation passed in the evaluation workflow. The harness scores primary versus alternatives and traces every displayed mapping to a validated receipt plus source artifact/hash.
- P1-2 telemetry/cost implementation landed at `4aa19bc5c1ce7a5aaab378be265952ea1571d894`; the provider measurement gate passed. Learner CI then exposed a test-only substring bug: the forbidden-content assertion matched the allowed field name `promptTokens`. `44f755caf6d00af7396c264a845cbcfa4b94a2f2` corrected the assertion without weakening storage. Final runtime stores per-call outcome/latency/tokens under opt-in only; schema-v2 reports compute per-request cost from an explicit dated price basis and retain incomplete usage as unknown.
- P1-3 acceptance readiness landed at `ae042db07f51d0cf1e71f002869ce9a65a011d48`. Physical-device workflow 45771834706 passed validator, neutral reviewer, feedback endpoint and bundle-preflight tests; it built `apps/sutra/dist` and uploaded private artifact `sutra-device-ready-static-bundle` (artifact id 15093883757, 506206 bytes at observation).
- Exact combined `ae042db07f51d0cf1e71f002869ce9a65a011d48`: 19/19 workflows successful. Key runs: learner shell 45771834795, browser matrix 45771834851, engineering evaluation 45771834745, provider measurement 45771834680, physical-device evidence 45771834706, publisher starter 45771834689.

## Evidence boundary

No paid/live provider call was made. Provider/model selection and spend remain participant-owned INPUT-SPEND; R-007 stays open, so actual tokens, live price basis and funded-run economics are not claimed.

No physical phone, human reviewer or human screen reader was operated in this session. R-008 stays open. The private static bundle and validators establish readiness only.

No public deployment, domain/DNS change, public inference enablement, promotion or official submission occurred.
