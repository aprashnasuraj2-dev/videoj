# SUTRA session 0012 implementation evidence — caller publication bundle

- Observed: 2026-11-23T17:05:44+05:45.
- Tested publication source candidate: `47f84a1f8ee47cf7f9a049aaa8286d3142d8648c`.
- Full shell/Chromium CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45164065404
- Evidence CI on that candidate: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45164065368
- The candidate's register job failed only because `progress.json` referenced Session 0011 before the append-only session entry had been committed. That bookkeeping defect was corrected later and does not convert the failed register job into a pass.

## Manifest and inference boundary

`apps/sutra/public/agents/agent-manifest.json` now publishes top-site inference metadata separately from peer policy:

- `llm_router.base_url = /api/infer`
- `llm_router.mock = false`
- `llm_router.byok_router = https://openrouter.ai/api/v1`
- `allowed_peers = []`
- `peer_policy.mode = closed`

The same-origin `/api/infer` endpoint remains operator-disabled until the provider/model/budget gates pass. Publishing its path is not evidence that funded inference is live. No provider credential appears in the manifest.

The BYOK router entry names the caller-side router already used by the restricted browser adapter. Live browser CORS/account behavior remains P030-02 and is not inferred from this metadata.

## links.json interpretation

Profile 0.3 defines `links.json` as publisher-owned default bindings for symbolic external-network references.

The current public learner graphs contain no symbolic external-network references requiring a publisher-owned default. The exact correct binding set is therefore empty. The file now explicitly contains both published network names:

```json
{
  "version": 1,
  "networks": {
    "learner": {},
    "source_learner": {}
  }
}
```

This is preferable to fabricating a peer URL. The separately demonstrated peer URL is runtime-entered caller-owned session input. Its future public origin is intentionally unset until a different registrable domain is available.

## Public artifact inventory

Added `docs/sutra/PUBLIC_ARTIFACT_INVENTORY.md` with exact caller paths/proposed URLs for:

- browser UI/runtime;
- `/agents/agent-manifest.json`;
- both resolved network definitions;
- `/agents/links.json`;
- `/api/infer`;
- `/api/source-tools`;
- `/api/status`;
- the external direct-BYOK router.

Every proposed public URL is explicitly labeled unverified/not deployed. The peer public origin is explicitly unset.

## Validation

App build tests check:

- manifest inference metadata is present and separated from peer policy;
- server-only credential markers are absent;
- links map exactly matches the two public networks and contains no invented binding;
- the artifact inventory names all required bundled agent surfaces and states it is not deployment evidence.

Existing Chromium continues to run the scripted network test by loading the local publication through the manifest. This demonstrates the caller resolving the exact `learner` network from `/agents/agent-manifest.json` and executing it in-browser. Existing exact-name loader tests reject missing/similar names.

## Counterexample and limits

A non-empty `links.json` is not inherently more conformant than an empty one. Adding a made-up peer binding would create false publication metadata.

Likewise, a manifest containing `/api/infer` does not establish a working funded path. The status remains disabled until external operator gates pass.

This phase concerns the publication bundle's structure and local resolution. Public HTTPS accessibility/CORS, deployed hashes and the distinct peer domain remain later release gates.

## Phase 022 exit

Current evidence covers all Phase 022 tasks. The caller resolves `/agents/learner` through the manifest using exact name selection; the manifest, resolved graphs, link map, peer policy and router metadata are distinct data surfaces; the inventory records exact intended paths without asserting deployment.

Phase 022 can close.
