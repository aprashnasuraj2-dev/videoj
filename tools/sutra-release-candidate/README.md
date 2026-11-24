# SUTRA release-candidate artifact gate

This module exists because the development build is deliberately **not** a release candidate: its manifest has no `llm_router`, inference is disabled, and its graphs do not name an operator-approved live model.

After real model/backend, resource-budget and judge-path evidence exists, this gate prepares the public agent artifacts deterministically. The preferred credentialless learner remains the no-model path; optional inference may be explicitly `self_hosted` or `hosted`, with no backend fallback:

- manifest publishes exactly one same-origin publisher-funded router at `<public origin>/api/v1`;
- manifest names the stable public browser runtime at `/runtime/sutra-runtime.js`;
- no BYOK router is published;
- one exact peer origin is allowed under closed policy;
- every network receives the same approved top-site `llm_config.model_name`;
- transformed graph bytes are stored under SHA-256 content paths;
- the symbolic guide link is rewritten to the exact release peer origin;
- the release record binds source revision, launch/current spec pins, live-run/cost hashes and a private budget-approval reference.

The gate **refuses** to build from the current router-free development manifest unless the supplied release config says live inference usage is complete, the exact backend/model clean judge path passed, resource-budget approval exists and at least 20 judging-reserve runs remain. `self_hosted` requires one exact HTTPS gateway URL and operator-owned cost mode; `hosted` requires provider-billed cost mode and cannot carry a self-hosted gateway URL.

That is structural evidence only. The tool cannot prove that budget approval is authentic, that the provider will stay available, that public HTTPS/CORS works, that the content is licensed/factually reviewed or that Devpost accepts the project.

The output is a release overlay concept, not a deployment command. No cloud/DNS operation exists here.


## Materialize an isolated candidate

After a **real completed** release config exists:

\`node tools/sutra-release-candidate/cli.mjs release-config.json apps/sutra/dist /NEW/EMPTY/release-dir\`

The materializer refuses an existing or overlapping destination, hidden entries, symlinks, path escape and oversized files. It copies regular development build files, removes manifest-indexed development graph variants, writes only SHA-256-addressed release graph variants, replaces manifest/links, binds the stable public runtime and UI-entry hashes, and emits \`/agents/release-candidate.json\` plus a non-self-referential candidate inventory digest.

It performs no deployment and has no cloud credentials. CI additionally proves the checked-in incomplete template cannot generate a candidate.


## Render the private Worker policy from the same release config

`node tools/sutra-release-candidate/worker-config-cli.mjs services/sutra-api/wrangler.private.jsonc release-config.json > rendered-worker.json`

The renderer changes only non-secret policy: enables inference only in the materialized candidate config, binds the exact caller origin, approved backend/model and peer origin, and validates the existing quota/concurrency envelope. `self_hosted` binds the reviewed HTTPS gateway and requires `SUTRA_SELF_HOSTED_TOKEN`; `hosted` requires `SUTRA_PROVIDER_KEY`. Both require `SUTRA_CLIENT_HASH_SECRET`. It refuses all of those secret names/values in public `vars` and removes stale self-hosted gateway state when hosted mode is selected.

Actual secret values remain platform secret bindings and are never written by this tool. A rendered config is not deployment evidence; the later live status/public-manifest check must still prove that the deployed Worker and public artifacts agree.
