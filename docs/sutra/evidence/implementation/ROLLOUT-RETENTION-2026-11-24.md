# SUTRA immutable rollout retention evidence — 2026-11-24

Exact tested implementation: `35be38bc80cade335110c6f38c1966123c7707d9`  
Green job: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45299131018/job/138126934790

## Problem

A stale browser can still reference content-hashed JavaScript/CSS or a content-addressed network graph after mutable HTML/manifests move to a newer deployment. Removing those immutable files too early can turn an otherwise safe rollout into a broken mixed-version session.

Component quality does not establish rollout quality: having hashed filenames is insufficient if the deployment process discards the previous hashed bytes.

## Implemented retention boundary

`apps/sutra/tools/rollout-retention.mjs` accepts a previous static output and a next static output. It copies only immutable classes that a stale client may still reference:

- Vite-style hashed files under `assets/`;
- content-addressed network graphs under `agents/v/<40-char-git-blob-sha>/...`.

For a versioned graph, the helper recomputes the Git blob SHA from the bytes and refuses a forged/mismatched directory identity.

It deliberately does **not** copy:

- `index.html`;
- `agents/agent-manifest.json`;
- canonical mutable `agents/*.network.json`;
- media files currently governed by revalidation + byte hash;
- API responses;
- credentials or browser-local data.

If an immutable path exists in both builds with different bytes, retention stops with an immutable-collision error instead of overwriting.

## Tests observed

The exact-head app suite passed the rollout cases:

1. old hashed JS/CSS and a valid content-addressed graph are copied into a next build while stale HTML/manifest/aliases/media are not;
2. rerunning retention is idempotent when bytes match;
3. same immutable path + different bytes fails closed;
4. unversioned files under the hashed-asset retention area are refused;
5. a forged graph directory hash is refused.

The helper returns frozen copied/reused path receipts so downstream tooling cannot mutate the result accidentally.

## Operational use

Future controlled rollout command:

```bash
npm run rollout:retain -- --previous /path/to/previous-dist --next ./dist
```

This must run before publishing the next static output when stale-client retention is required.

## Limits

This is a tested local rollout mechanism, not proof that Cloudflare retained a real prior production deployment. Production rollout/rollback evidence still requires an authorized deployment. The helper also does not retain mutable pointers because doing so would defeat revalidation and could keep stale routing/security policy alive.

P068-06 is supported by this mechanism and test. P068-07 remains open because card deletion is tested but no browser-stored BYOK state currently exists to exercise or formally omit.
