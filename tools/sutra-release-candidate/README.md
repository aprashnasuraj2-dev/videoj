# SUTRA release-candidate artifact gate

This module exists because the development build is deliberately **not** a release candidate: its manifest has no `llm_router`, inference is disabled, and its graphs do not name an operator-approved live model.

After the real provider/budget/judge-path evidence exists, this gate prepares the public agent artifacts deterministically:

- manifest publishes exactly one same-origin publisher-funded router at `<public origin>/api/v1`;
- manifest names the stable public browser runtime at `/runtime/sutra-runtime.js`;
- no BYOK router is published;
- one exact peer origin is allowed under closed policy;
- every network receives the same approved top-site `llm_config.model_name`;
- transformed graph bytes are stored under SHA-256 content paths;
- the symbolic guide link is rewritten to the exact release peer origin;
- the release record binds source revision, launch/current spec pins, live-run/cost hashes and a private budget-approval reference.

The gate **refuses** to build from the current router-free development manifest unless the supplied release config says live provider usage is complete, the clean judge path passed, budget approval exists and at least 20 judging-reserve runs remain.

That is structural evidence only. The tool cannot prove that budget approval is authentic, that the provider will stay available, that public HTTPS/CORS works, that the content is licensed/factually reviewed or that Devpost accepts the project.

The output is a release overlay concept, not a deployment command. No cloud/DNS operation exists here.


## Materialize an isolated candidate

After a **real completed** release config exists:

\`node tools/sutra-release-candidate/cli.mjs release-config.json apps/sutra/dist /NEW/EMPTY/release-dir\`

The materializer refuses an existing or overlapping destination, hidden entries, symlinks, path escape and oversized files. It copies regular development build files, removes manifest-indexed development graph variants, writes only SHA-256-addressed release graph variants, replaces manifest/links, binds the stable public runtime and UI-entry hashes, and emits \`/agents/release-candidate.json\` plus a non-self-referential candidate inventory digest.

It performs no deployment and has no cloud credentials. CI additionally proves the checked-in incomplete template cannot generate a candidate.


## Render the private Worker policy from the same release config

`node tools/sutra-release-candidate/worker-config-cli.mjs services/sutra-api/wrangler.private.jsonc release-config.json > rendered-worker.json`

The renderer changes only public/non-secret policy: enables inference, binds the exact caller origin, approved model and peer origin, and validates the existing quota/concurrency envelope. It refuses any provider key or client-HMAC secret in public `vars`.

Actual secret values remain platform secret bindings and are never written by this tool. A rendered config is not deployment evidence; the later live status/public-manifest check must still prove that the deployed Worker and public artifacts agree.
