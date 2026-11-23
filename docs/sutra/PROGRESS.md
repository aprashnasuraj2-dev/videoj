# SUTRA progress register

## Session 0012 checkpoint — Phase 022 complete

**261/1,000 tasks verified; 19 phases fully verified.** The caller publication bundle now includes explicit top-site inference metadata separate from peer policy, exact publisher link maps, and a pre-release artifact inventory. The link maps are intentionally empty because no published symbolic external-network reference has an established publisher-owned binding; the distinct peer domain remains unset rather than fabricated.

Tested publication source: `47f84a1f8ee47cf7f9a049aaa8286d3142d8648c`; full shell/Chromium https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45164065404. See [session 0012 evidence](evidence/implementation/SESSION-0012.md).

**Next:** `SUTRA-P023-05` browser action boundary/reconciliation. Live OpenRouter browser CORS/account, public HTTPS/CORS, original content, physical-device evidence, release and Devpost remain open.

## Session 0011 checkpoint — Phase 037 complete

**256/1,000 tasks verified; 18 phases fully verified.** Redirect policy now re-consents an observable changed origin before the next request, re-evaluates session approval for a changed artifact path, bounds hops and cycles, and preserves fail-closed browser behavior when JavaScript cannot inspect a redirect target before contact.

Tested source candidate: `be03c617a437366792d128d312ecc537856fe621`; full shell/Chromium https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45163356204. See [session 0011 evidence](evidence/implementation/SESSION-0011.md).

**Next:** Phase 022 publication bundle/inventory. The peer public domain remains intentionally unset; no symbolic peer binding will be fabricated. Live router CORS/account, public HTTPS, original media/rights, physical-device evidence, release and Devpost remain open.

## Session 0010 checkpoint — Phase 036 complete

**250/1,000 tasks verified; 17 phases fully verified.** The peer private-context boundary now has separate downstream and upstream permissions. Upstream return requires both the peer front-agent declaration and the caller-owned exact-network policy; the host cannot invent a permission and the peer cannot exceed the caller policy. Only field names enter the sanitized trace.

A receipt-smuggling regression also confirms that a private field not sent downstream cannot be recreated upstream, and a peer-proposed evidence receipt carrying an extra private-style field is rejected by the strict receipt schema without echoing its value.

Tested source candidate: `621520e1636deb39686e7aef462e8b481c4558cd`; full shell/Chromium https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45162744214. See [session 0010 evidence](evidence/implementation/SESSION-0010.md).

**Next:** `SUTRA-P037-01` redirect-origin/policy handling. The existing browser policy remains fail-closed; do not silently broaden redirect access. Live router CORS/account, public HTTPS, original media/rights, physical-device evidence, release and Devpost remain open.

## Session 0009 checkpoint — Phase 026 complete

**247/1,000 tasks verified; 16 phases fully verified.** Phase 026 now has current evidence for explicit `idle/running/cancelling/failed/complete` lifecycle states, visible incomplete cancellation, bounded read-only source retries with sanitized attempt counts, and Chromium proof that cancelling a stalled peer run does not break native timing-video playback.

Final tested product candidate: `fb300b9df50a59768c64ee0d8f7c01389d74f27f`. Full shell/Chromium: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45161898243. Register/evidence workflows for that candidate also passed. Intermediate browser failures are retained in [session 0009 evidence](evidence/implementation/SESSION-0009.md) and were not counted.

The retry policy is intentionally narrow: one retry only for transport rejection or 5xx on the read-only source RPC; malformed successful payloads are not retried. Cancellation aborts instead of retrying. A cancelled run ends as failed/incomplete, never complete.

**Next independent engineering:** `SUTRA-P036-04` separate upstream/downstream private-context handling, followed by remaining redirect policy work. `SUTRA-P030-02` live OpenRouter browser CORS/account validation remains external and unverified. Public deployment, paid inference, original-content claims, ZIP delivery and Devpost submission remain closed.

## Session 0008 final engineering checkpoint — current

**242/1,000 tasks verified; 15 fully verified phases.** This includes 7 more task-level checks since the 235-item redirect checkpoint: independent BYOK/funded-failure isolation (P030-08), credentialless redirect denial (P037-05), and streaming/child-cancellation behavior (P026-02..06). [Run-interruption CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45159138495), [independent inference-path CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45158656419), [redirect credential CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45158831857) all passed on immutable code candidates. See [session 0008 evidence](evidence/implementation/SESSION-0008.md) for limits and retained failures.

**Next engineering:** P026-01 explicit learner run lifecycle (idle/running/cancelling/failed/complete) and cancellation/media continuity; P030-02 live authorized browser router CORS remains an external gate. Phase 026, 030 and 037 remain open, and the public release/Devpost gates remain blocked. The record describes synthetic and loopback validation, not real content or funded AI.

## Session 0008 redirect security follow-up — earlier checkpoint

**235/1,000 tasks verified; 15 phases fully verified.** This adds three task-level checks P037-06/07/08 to the previous 232 after the real loopback redirect matrix and Chromium blocked-redirect/local-lesson fixture passed on source candidate `e5af69d975ec0c7fc4c84c3e20b84036e3302cca` ([full shell run](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45158153046)). Graph approval now distinguishes exact graph paths, and query-bearing graph URLs fail. Real third-party HTTPS redirects, changed-content authorization and full re-consent remain open; phase 037 is incomplete.

A separate BYOK regression tests cancellation of concurrent in-flight requests. Live OpenRouter CORS, keyless funded visitor and model funding remain unverified; no release is authorized. Peer proposal at the same registrable domain as the caller was withdrawn pending a genuinely separate peer domain.

## Session 0008 evidence reconciliation — earlier checkpoint

**232/1,000 original checklist items verified; 15 phases fully verified.** This adds 46 evidence-linked checks to the prior 186, not 46 new features. Earlier completed browser peer-invocation work was reconciled against passing session 0007 CI; latest BYOK key-isolation, in-flight cancellation and Chromium checks passed for code candidate `092c8d2c601bcfd7075a4062a4c13460257aaa90` ([shell CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45155920061)).

Newly closed phases: 032 exact peer resolution, 033 external-contact consent, 035 caller-local peer runtime and 038 untrusted-peer containment. Phase 034 public CORS remains open because controlled loopback origin proof is **not** public HTTPS staging/production proof. Phase 036 upstream private-context return remains open; phase 030 BYOK remains open for actual approved router/account CORS and independent funded-path failure. Phase 037 redirect re-consent and production trust remain open. An in-memory key is cleared and active requests are aborted, but network requests already transmitted cannot be recalled.

**Next task `SUTRA-P030-02`**: verify OpenRouter browser CORS using an authorized key and account, without recording secrets; independently implement full redirect and upstream-private-context fixtures. Never replace real operator evidence with simulated credentials. The repo is still development-only: default paid inference, public routes, release and Devpost submission remain closed.


## Session 0008 — BYOK revocation hardening (verification ongoing)

On the active `sutra/peer-invocation` PR #48 branch, `packages/sutra-inference/byok.js` now aborts every in-flight model fetch when its in-memory key is cleared. A unit regression checks active cancellation, the absence of a second network call and sanitized error messages. Tested code candidate: `092c8d2c601bcfd7075a4062a4c13460257aaa90`.

At checkpoint time, the GitHub Actions register and evidence jobs passed, and the shell job had passed install/build/app/inference/runtime/peer tests but had not completed Chromium. Do **not** count a browser pass or any new verified checklist items until the exact candidate passes the remaining shell checks. The original **186/1,000** verified total is retained. A synthetic OpenRouter route proves key isolation under a controlled fixture, not that a real provider account, funded path or public HTTPS CORS works.

Next: finish the browser workflow, verify that only the selected router receives the BYOK canary, then credit individual P030 tasks only against observed evidence. Live router CORS and account tests remain an independent gate. No public release, deployment or key funding is authorized.


[Checklist](CHECKLIST.md) | [Machine state](progress.json) | [Sessions](SESSIONS.md)

## Session 0006 checkpoint

**186/1,000 checks verified**; eleven phases complete. Phase 058 (reusable peer-consent
inspector) is closed. Phase 032 exact peer loading and phase 033 consent are materially
advanced but intentionally remain open.

Implemented `packages/sutra-consent/`: a framework-neutral default-deny policy,
explicit one-contact/session scope, public origin/purpose/disclosure display, redacted
events and a bounded credentialless JSON helper. The learner now exposes a consent
preview, and a separate plain-browser example proves the component runs outside the
learner app, DHAGO player and SUTRA corpus.

Added a data-only Profile 0.3 peer artifact loader. It derives the site base from the
peer-network URL, loads the manifest only after approval, selects the exact network
name, resolves the declared graph and requires a separate approval when that graph is
on another origin. Query/fragment/trailing-slash ambiguity, missing/duplicate names,
executable metadata and malformed graphs fail closed. Redirects remain deliberately
blocked until phase 037 defines changed-origin handling.

## Observed checks

Final code candidate `70fe330b92dc22ba3dd9fc60cc3166c1d7ae42d7` passed:

- production app build and app tests;
- 37 consent/inference/source/API tests;
- 65 runtime/loader/source-MCP tests;
- all ten pinned upstream module hashes;
- learner Chromium with consent denial/session scope, prior evidence/runtime/media
  behavior, 360 px no-overflow and no external requests;
- standalone consent-example Chromium with denial-before-transport and exact remembered
  session approval.

Intermediate CI failures are retained in
[evidence/implementation/SESSION-0006.md](evidence/implementation/SESSION-0006.md).
They were test-fixture/assertion failures and were not counted as passing evidence.

## Independent peer package

Added zero-dependency `apps/sutra-peer/` with its own static build, human guide page,
exact `checklist` manifest/graph, narrow `source_select` helper and explicit links map.
The local preview and real consent-aware loader integration passed in CI on
`4acb6e1aeddcba3bbf44b240069a4afe5a0f4ceb`. P031-03 remains open for actual
rights-cleared corpus provenance; P031-10 remains open for a distinct public HTTPS
origin. The proposed caller/peer origins are disclosed as same-project-owner and do
not demonstrate independent adoption.

## Boundaries still open

No real second HTTPS peer origin has been published or contacted. Cross-origin CORS,
caller-local peer execution, third-party MCP discovery/call consent, redirect
re-consent, private-context peer canaries and router inheritance remain unverified.
Consent visibility does not prove publisher trust, factual truth or independent
adoption. Phase 025 model selection/live keyless visitor also remains open.

## Public release gate

User direction remains unchanged: no public release until all applicable major
checklist product/security/conformance/acceptance gates are complete with current
evidence. Public routes, public inference, promotion and official submission stay
closed. The prior Wrangler dry-run is packaging evidence only.

## Resume

Next independent engineering queue:

1. `SUTRA-P032-08` — preserve a specific peer-load failure through the invoking
   network rather than only the loader API.
2. `SUTRA-P033-03` — connect the consent boundary to third-party MCP discovery and
   calls; phase 039 still requires an authorized read-only endpoint and real browser
   behavior.
3. `SUTRA-P035-01` — instantiate the already validated peer data in the caller runtime
   once the failure/consent path is preserved.

Original media/rights/factual reviewer, entrant eligibility, approved live-model
spend, consenting learners/builders/devices, public release, final ZIP and Devpost
filing remain pending.

[Final consent/loader workflow](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45145022530/job/137592064940). [Final independent-peer workflow](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45146010597/job/137595359493).
No public release is implied.
