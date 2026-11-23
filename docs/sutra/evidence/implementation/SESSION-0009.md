# SUTRA session 0009 — product-facing peer, transcript, review and evidence comparison

- Last tested code candidate: `141635df81697e7daed5a166815ab2ac3f3e1bb9`.
- Observed passing GitHub Actions run: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45189799072/job/137744808482
- Completed UTC observation: 2026-11-23T14:02:30Z; Nepal time: 2026-11-23T19:47:30+05:45.
- Draft development branch: `sutra/caller-peer-failure-boundary`, PR #49; release prohibition retained.
- Previous checkpoint: 204 verified/1,000, 13 completed phases.

## Shipped in development branch

1. Added the actual learner-facing `peer-workbench.js`, URL control, and accessible per-manifest/per-graph consent dialog. Entering a peer URL does **not** fetch; explicit action and approval are needed for each credentialless GET. The validated graph executes in caller Chromium with scripted model. Wrong exact name and denial report specific incomplete outcomes, and the local lesson/evidence remain available. A plain-browser peer fixture remains separate from a public independently controlled peer origin.
2. Pinned the SUTRA host's provider model choice: only `model.approvedModel` can select a real injected provider identifier. A local or untrusted peer graph's `llm_config` hints do not take precedence; missing or invalid provider model policy is rejected before remote work. Unit/browser canaries in fake provider adapters demonstrated no BYOK key-shaped value in peer artifact requests or MCP POST payloads; browser origin is loopback and no real paid provider was invoked.
3. Built `transcript-panel.js` with bounded search, clear no-results and missing-cue cases, native media-seek confirmation, stable keyboard names and Up/Down/Home/End navigation, actual-time cue highlighting, transcript/source identity and explicit translated wording labels. Long cues wrap, no automatic scroll steals user intent, and missing caption tracks are distinguished from a supplied catalog. An intermediate Chromium failure exposed focus loss when an async cue was disabled; fixed by keeping focus and showing `aria-busy` instead.
4. Added reusable `trace-export.js` projecting only public bounded trace and consent fields (no raw prompts/model results/headers, no accessors, capped size), plus a user-triggered peer workbench JSON download tested in actual Chromium. UI status distinguishes success, rejection and incomplete peer execution. No export establishes source truth.
5. Added `comparison.js` and `comparison-view.js`. The real synthetic local cue is displayed next to an explicitly **missing** reviewed guide claim. A separate clearly hypothetical 2-vs-3-signature fixture shows `unresolved_conflict`, not invented consensus. Cards retain distinct source ID/version, scope, provenance, timestamp with date basis, exact excerpt and a source-side native cue action. Matching *structured values* are `consistent_unverified`, never factual verification. No actual independent guide corpus is connected.
6. Added `review-export.js` and local review-card user-triggered downloads. The receipt is validated against the catalog, extraneous localStorage fields are omitted, and synthetic/unverified warnings are embedded. Saved preview, reload, delete and unknown/rejected storage semantics remain intact.
7. Added real Chromium fail-closed redirect fixtures (same origin, changed origin, loop) confirming the artifact loader does **not follow** redirects under its current strict rule and local media/evidence still function. This is narrower than the spec's allowed redirect behavior: changed-origin re-consent and full conformance remain open.
8. Updated community Open Kit/readmes to identify reusable safe trace, structured comparison and receipt export, without implying independent community adoption.

## Observed reproducible validation

On the exact source candidate `141635df81697e7daed5a166815ab2ac3f3e1bb9`, GitHub Actions `45189799072` passed:

- 33 learner app Node tests;
- 37 consent, inference protocol, source tools and API/quota Node tests;
- 87 runtime, peer, MCP and trace-policy Node tests;
- 7 independent peer-package tests;
- all 10 unmodified pinned upstream nsDeploy module hash checks;
- app build and four Chromium scripts: learner flow/media/receipt/comparison/transcript/download, standalone consent inspector, two-origin peer workflow with consent/denial/redirect/BYOK, and cross-origin MCP with discovery/call consent, CORS fail-close and fake provider key canary.
- The register audit was green for the source candidate, with no new checklist credit claimed until this evidence was reviewed and recorded.

A prior development CI failure at `c7ec566fdf56ec25a9421a0cdebc9aa81409c5ff` reported `preservedFocus: false` on asynchronous transcript seek. The source correction at `1604a84134b11a29c34cc9f2de357502b1033857` eliminated focus-dropping `disabled` state; later browser runs passed. A prior `f3447857d137439cac32261418919f7d5bc402c7` browser failure was caused by wiring trace-export controls before corresponding DOM markup; markup was added before final passed runs. These failures are retained in GitHub Actions and not credited as passes.

## What has **not** been demonstrated

- No live funded model/real BYOK user flow; fake provider mode exercises the browser policy boundary only. Paid-service budget/approval and server-side credential security still need independent live tests.
- No rights-cleared original lesson, original public video, factual reviewer, human research or participant eligibility evidence. Synthetic source-consistency and structured comparisons do not prove scientific/factual truth.
- No separate public HTTPS caller/peer origin, independent peer adoption, real externally operated MCP publisher, production CORS, complete same-origin redirect compatibility, cross-origin identity allowlists or broad MCP authentication.
- No arbitrary private data sharing allowlists; default-deny and fake key canaries do not establish universal immunity to model prompt injection or secret-bearing ordinary request text.
- No public Cloudflare route/domain assignment, public inference activation, official Devpost submission or downloadable submission ZIP. A draft PR/source commit is not a release.

## Follow-on tasks

- Validate a controlled source-backed MCP read with explicit catalog provenance, failures and real timeout; then test approved real endpoint with authorization before extending full P039.
- Explicit destination-bound private context schema, caller/peer forwarding policies, canaries and hostile model output tests for P036/P038.
- Finish source comparison with real rights-cleared written guide, actual cue/source links, factual reviewer and caller/router evidence. Complete P041 and P045 only after a genuine fresh-user acceptance pass.
- Keep development/PR draft, major-gate release prohibition and all remaining missing external/participant evidence intact.
