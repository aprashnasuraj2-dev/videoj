# SUTRA public artifact inventory

This is the pre-release inventory for the caller site. It records exact publication paths and proposed URLs so release checks can compare deployed bytes later. **None of the proposed public URLs below are verified deployments yet.**

Proposed caller origin: `https://sutra.aafnaipatro.com` (unverified).

| Surface | Exact path / proposed URL | Role | Current release state |
| --- | --- | --- | --- |
| Learner UI/runtime | `/` → `https://sutra.aafnaipatro.com/` | Browser UI and caller-local orchestration | proposed, not deployed |
| Agent manifest | `/agents/agent-manifest.json` | Published network index, top-site router metadata and peer policy | bundled locally |
| Learner graph | `/agents/learner.network.json` | Declarative learner/evidence graph | bundled locally |
| Source learner graph | `/agents/source_learner.network.json` | Declarative graph using bounded same-origin source reads | bundled locally |
| Peer link map | `/agents/links.json` | Publisher-owned symbolic peer defaults | bundled locally; intentionally empty because no publisher-owned symbolic peer URL is established |
| Default inference | `/api/infer` | Same-origin publisher-funded inference endpoint | implemented but operator-disabled until provider/model/budget gates pass |
| Source MCP | `/api/source-tools` | Same-origin bounded read-only source capability | synthetic catalog in development |
| Status API | `/api/status` | Honest inference/source status | development only |
| Direct BYOK router | `https://openrouter.ai/api/v1` | Visitor-selected caller inference path, not a SUTRA-hosted artifact | controlled fixture tested; live browser CORS/account not verified |

## Peer publication

The peer public origin is intentionally **unset**. The project requires a different registrable domain from the caller for the interoperability demonstration. Do not insert a same-`aafnaipatro.com` subdomain into `links.json` merely to make the file non-empty.

The current learner graphs contain no symbolic external-network reference that requires a publisher-owned default binding. Therefore `links.json` publishes exact empty maps for both public networks. Runtime-entered peer URLs are caller-owned session input and must not mutate this file.

## Inference metadata boundary

`agent-manifest.json` publishes `llm_router` separately from `allowed_peers` / `peer_policy`:

- `base_url: /api/infer` names the existing same-origin default endpoint; it does **not** mean the endpoint is enabled.
- `byok_router: https://openrouter.ai/api/v1` names the direct browser BYOK router supported by the caller adapter.
- provider credentials never appear in the manifest.
- peer metadata cannot replace the active caller model/router policy.

## Release verification still required

Before any public-release claim, verify the exact deployed HTTPS bytes, MIME types, CORS, content hashes, signed-out access, range/media behavior, the separately selected peer domain, and the live provider configuration. This inventory is a release comparison target, not deployment evidence.
