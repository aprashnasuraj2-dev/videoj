# SUTRA session 0006 implementation evidence

- Observed: 2026-11-23T14:58:39+05:45.
- Tested source candidate: `70fe330b92dc22ba3dd9fc60cc3166c1d7ae42d7`.
- Final CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45145022530/job/137592064940
- Scope: consent-before-contact, reusable consent inspector and exact data-only peer artifact loading. No public deployment, live third-party MCP, live peer origin, paid inference or release.

## Implemented

- Added `packages/sutra-consent/`, a framework-neutral default-deny consent boundary with public origin/purpose/disclosure labels, explicit allow/deny, exact session scope and redacted intent/decision/outcome events.
- Added bounded JSON contact helper: credentialless GET, same consented origin, redirect-error, JSON/UTF-8 validation and 64 KiB hard maximum.
- Added a plain browser example independent of the learner app, DHAGO player and SUTRA corpus.
- Added learner consent preview showing destination, purpose and disclosure labels before a simulated operation. Denial leaves the existing local lesson/evidence controls available.
- Added `loadPeerNetwork` to the restricted runtime. It follows the Profile 0.3 peer reference convention: final URL component is the exact network name; preceding path is the site base; manifest is loaded from that base; the exact entry is selected; its declared graph URL is resolved and validated.
- Manifest and graph destinations are separately consented. An absolute graph URL on another origin therefore requires a distinct approval. No caller credentials are attached.
- Executable peer metadata remains rejected. The loader only establishes validated data artifacts; it does not yet enable peer execution in `runNetwork`.
- Redirects remain fail-closed in this checkpoint. Profile 0.3 permits normal browser redirects, but SUTRA defers changed-origin redirect policy/approval to phase 037 rather than silently broadening contact.

## Final observed validation

On source candidate `70fe330b92dc22ba3dd9fc60cc3166c1d7ae42d7`:

- app `npm ci`, production build and app tests: pass.
- consent + inference + source-tools + API/quota suites: 37/37 pass.
- pinned reference-runtime drift check: 10 unchanged upstream modules at `486ecf26aa8775963f9b765f894734bef1ac9817`.
- runtime suite: 65/65 pass.
- peer loader cases pass for base derivation, exact-name resolution, missing/duplicate name rejection, encoded path handling, query/fragment/trailing-slash refusal, separate absolute graph-origin consent, credential omission, executable metadata rejection and malformed graph rejection.
- learner Chromium: pass; consent denial/session scope, existing evidence/runtime/media behavior, 360 px no-overflow, no page errors and no external request.
- standalone consent example Chromium: pass; denial before simulated transport, explicit exact session approval, remembered repeat and no third-party request.

## Retained failures and fixes

The session did not treat intermediate failures as passes.

- Runs 20-23 failed browser assertions while build/unit/runtime layers were green. The first assertion escaped the peer-origin regex incorrectly; a later assertion used `innerText` on content inside a closed `details`. Both tests were corrected to inspect the intended observable state.
- Run 24 passed the complete consent-only candidate.
- Run 25 passed after adding the peer-loader implementation, before its dedicated tests were added.
- Run 26 failed six new peer-loader tests because the test fixture overrode native `Response.url`; the consent layer correctly sanitized the resulting effect failure. The mock was replaced with an ordinary JSON Response while request destination/options remained directly asserted.
- Run 27 is the final green candidate and is the evidence source for newly verified tasks.

## What this does not establish

- No real second HTTPS origin has been built, deployed or contacted.
- No cross-origin CORS behavior has been observed.
- The fetched peer network is not yet instantiated by the caller runtime.
- Third-party MCP discovery/call consent remains unintegrated; the reusable policy has MCP contact kinds but P033-03/P039 remain open.
- Redirect acceptance/re-consent remains open under P037.
- Consent visibility does not establish publisher reputation, factual truth, semantic support or independent adoption.
- Public release remains blocked by the participant's major-checklist release gate.
