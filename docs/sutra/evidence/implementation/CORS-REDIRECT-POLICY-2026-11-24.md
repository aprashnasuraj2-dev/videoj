# Cross-origin artifact and redirect policy review — 2026-11-24

Exact browser evidence revision: `0ef8a613c1c8d6db522d50a1088f9528ad055d4b` (full learner and desktop-engine matrix green).

## Public-artifact CORS mechanics

The independent peer package applies `Access-Control-Allow-Origin: *` only to `/agents/*`. The general human page does not receive wildcard CORS. Publication tests assert:
- exactly one CORS rule;
- no `Access-Control-Allow-Credentials`;
- no Functions/private server dependency in the peer publication;
- manifest/graph/links are declarative public data;
- no API key/Authorization metadata in the public graph.

Chromium two-origin tests use independent loopback origins and actual browser fetches, not curl. Manifest and graph requests use `credentials:'omit'`; denial occurs before transport. Exact wrong-network selection fetches only the public manifest then refuses the mismatch. Public artifact access is independent from caller inference/authentication policy.

The MCP/browser suite separately verifies that missing/disallowed CORS and browser CORS failures stop the capability without turning the local learner into a failed page.

### Still open

`SUTRA-P034-01` and phase exit remain open because no staging/intended public HTTPS origin has been deployed/observed. Loopback CORS behavior is not public-origin evidence.

## Redirect policy

SUTRA deliberately chooses **no redirect following** for external public artifacts.

- All external peer/public JSON fetches set `redirect:'error'`.
- Credentials are omitted.
- A changed-origin redirect is therefore stopped before a second destination is contacted; no redirect destination inherits approval.
- Browser regression injects same-origin/changing-origin/looping redirect fixtures and verifies the next URL is never fetched.
- Consent session approvals are keyed by exact origin, contact kind, purpose, disclosure labels and network. Material scope changes require a new approval tuple.
- Peer URL/name resolution is exact and bounded; wrong names do not fall back.
- After blocked redirect, local video/evidence remain functional.

This is stricter than dynamically re-consenting a redirected destination: SUTRA refuses redirect expansion entirely. If a future profile requires redirect following, it must be implemented as a new destination/contact and independently consented; current approval must never be reused silently.

No redirect/CORS result establishes publisher trust or factual truth.
