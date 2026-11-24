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
