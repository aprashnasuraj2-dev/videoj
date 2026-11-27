# CloudflareB learner ingress candidate (not deployed)

This directory is an isolated cross-account adaptation. Build the learner using its existing instructions, run node prepare.mjs here, and validate the resulting dist/_routes.json. Pages serves static assets; only /api/* invokes the Pages Function, which invokes the private API Worker by same-account service binding. The worker config is services/sutra-api/wrangler.private.jsonc. No public workers.dev or preview URL; inference disabled. No deployment command is executed by CI. The original Worker-with-assets config is preserved.

Before staging: validate Wrangler packaging and Pages service-binding behavior; ensure both resources target CloudflareB and no production token is embedded. Verify Pages returns the intended static headers, CORS, exact routing, and that the private service preserves client identity, original Origin, cancellation and streaming. If CF-Connecting-IP changes or is missing at the service boundary, keep paid inference disabled until a trusted identity mechanism is proven. Requests through Pages Functions and the API Worker may incur two dynamic invocations; ordinary static traffic should incur neither. Use measured request attribution, not inference from configuration.

For later DNS cutover, associate custom names with their Pages projects first; then create DNS-only CNAMEs in the Patro zone, with HTTPS and CORS verified. Never configure wildcard/apex changes or use a workers.dev CNAME shortcut. Keep public promotion gated.

## Candidate artifact build (no account access)
From a clean checkout of the exact candidate SHA at repository root, run:

```sh
git rev-parse HEAD
node --version
npm --version
rustc --version
python3 --version
npm ci --prefix apps/sutra
npm ci --prefix apps/sutra-v2
rustup target add wasm32-unknown-unknown
node apps/sutra-v2/build.mjs
node --test apps/sutra-v2/test/build-contract.test.mjs
npm --prefix apps/sutra-peer run build
node deploy/sutra-pages/prepare.mjs
node deploy/sutra-pages/verify-build.mjs
```

The separate legacy compatibility installation is retained by ingress CI; the canonical build uses the V2 package lock and V2 Vite binary, not the legacy build toolchain. The static candidate is copied from `apps/sutra-v2/dist`. Record the exact toolchain versions and fingerprint from CI; do not assume two different Rust/Node toolchains produce identical bytes. The Pages-specific output replaces the self-only connect-src with the single intended guide origin and checks it against the private API Worker configuration. The original app build retains self-only CSP. No peer is contacted without user consent. The guide is built independently with `npm --prefix apps/sutra-peer run build`; its Pages configuration exposes CORS only for public /agents/* artifacts.

`node deploy/sutra-pages/verify-build.mjs` verifies the built static files, API-only routes, matching security policy, guide CORS isolation, and byte-identical copies of all other learner artifacts. CI additionally uses a pinned Wrangler CLI to dry-run the private Worker and compile Pages Functions; no Cloudflare credentials or deployment command without --dry-run is used. This is packaging proof only. A real staging service binding must still verify platform client identity, actual edge request accounting, HTTPS/TLS, browser CORS and DNS precedence.

Do not publish a candidate solely because these checks pass. The exact intended origin is a configuration choice, not a live domain claim. If a different hostname is approved, change and revalidate both candidate policies together before cutover.


The canonical public-entry candidate is SUTRA v2. This directory still performs packaging validation only; it does not authorize or execute deployment, DNS changes, inference enablement, or promotion. The older release-materializer remains a separate compatibility gate until V2 emits every artifact that contract requires.

## Read-only deployed verification
After local candidate and guide builds, run `node deploy/sutra-pages/check-public.mjs`. It performs ten exact HTTPS GETs, compares the published V2 and guide JSON and canonical index bytes to the local candidate, verifies artifact CORS and entry CSP, and expects disabled inference. For a separately approved enabled deployment, use `--expect-model=EXACT_APPROVED_MODEL`. A matching configured router is not a live provider test. The PR workflow records the observation with `--observe` (non-gating diagnostic; inspect JSON status, never interpret workflow green as public match). No credentials or mutation are used.

Before cutover independently record the previous known-good Pages deployment IDs for both sites, private Worker version and quota/config identity, previous artifact hashes, DNS bindings, and the owner-approved rollback trigger. Rehearse restoring the exact versions in staging and repeat the public probe against the retained artifacts. Never roll back a quota migration by assuming code version rollback also rolls back persistent state. This probe does not execute rollback or certify that a deployment exists.


## Publisher hosted provider selection (candidate code only)

The private Worker now accepts an operator-owned `SUTRA_HOSTED_PROVIDER` of `openai`, `gemini`, `groq` or `openrouter` in hosted mode. An omitted provider keeps legacy OpenAI behavior. The endpoint and output-token field are fixed by the selected profile; the browser cannot choose a different endpoint/provider or cause automatic failover. Configure an exact approved model and store `SUTRA_PROVIDER_KEY` only as an approved Worker secret. Never commit credentials, expose them to browser state, or use dynamic OpenRouter auto/free model aliases. Leave inference disabled until client identity, rate/concurrency/output quotas, model support, content configuration and funding have been independently verified.

The opaque configuration HMAC now incorporates route identity, provider and token field; previously prepared approvals must be renewed after configuration changes. The V2 browser preview and receipt identify the configured provider, model and pin. This does not certify that every provider accepts the streaming request or native tool schema. The protected main-only live-model smoke is separate from the deployed-browser test. Existing disabled configuration is unchanged; this document does not authorize an enablement or deploy.
