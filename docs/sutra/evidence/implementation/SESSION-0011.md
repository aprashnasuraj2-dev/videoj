# SUTRA session 0011 implementation evidence — redirect destination re-consent

- Observed: 2026-11-23, Asia/Kathmandu.
- Tested source candidate: `be03c617a437366792d128d312ecc537856fe621`.
- Full shell/Chromium CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45163356204
- Register CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45163356065
- Evidence CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45163356138
- Normative baseline checked against Profile 0.3 commit `a0ceda34e4f2e653223e13e63282abc9b60eaf7c`.

## Specification boundary

Profile 0.3 permits normal browser redirects for published network definitions, but explicitly requires a redirect to a different origin to be treated as a new destination and evaluated under the same consent policy.

A normal cross-origin browser `fetch` does not expose a redirect destination to JavaScript before the browser follows it. SUTRA therefore preserves `redirect: "error"` for ordinary browser artifact fetches. When the runtime cannot inspect the next destination before contact, it fails closed instead of silently following.

For a controlled transport that exposes a raw 3xx response and `Location` before another request, SUTRA now supports bounded redirect continuation with re-consent.

## Redirect mechanism

`fetchJsonWithConsent` now:

- allows at most three redirect hops;
- tracks visited exact URLs and rejects cycles before another request;
- accepts HTTPS targets, with loopback HTTP only for development;
- rejects credentials, fragments and oversized redirect URLs;
- continues to use `credentials: "omit"`, `redirect: "error"`, and `no-store`;
- rejects a transport that silently returns an already-followed redirect;
- extracts a visible 3xx `Location` only when the transport exposes it before another contact;
- constructs a new consent tuple for the redirect target using its origin and bounded artifact path;
- requires that new tuple to be authorized before the second request;
- changes the purpose tuple when the artifact path changes, so a remembered session approval for the old path is not silently reused.

## Observed tests

Controlled tests show:

1. **Changed origin denied:** the first origin receives one request, the new origin is displayed to the consent decision handler, denial occurs, and the new origin receives zero requests.
2. **Changed origin approved:** after a separate second approval, the new origin is contacted and JSON retrieval can complete.
3. **Same-origin changed path:** even with session approval, the changed artifact path produces a second decision because the consent tuple's purpose is different.
4. **Cycle:** A -> B -> A stops after A and B; A is not contacted a second time.
5. **Hop bound:** with a two-hop test ceiling, hop0/hop1/hop2 are contacted and hop3 is never contacted.
6. Existing real loopback/browser fixtures still prove native redirect limitations fail closed, redirect requests carry no Authorization/Cookie, denial has no network side effect, and the local learner remains usable.

## Scope/content-change interpretation

P037-04 is satisfied for **material peer scope changes observable before use**: a changed origin or changed declared artifact path produces a different authorization tuple and is re-evaluated.

A publisher replacing bytes at the exact same URL without a declared integrity/content binding is not a new browser destination and cannot be detected before retrieval from redirect metadata alone. Profile 0.3 does not require a digest on the declarative network artifact. SUTRA does not claim same-URL byte replacement triggers pre-fetch consent; later integrity/version checks remain separate evidence/versioning concerns.

## Counterexample and limitation

A controlled custom transport can expose a 302 Location before following; native browser fetch often cannot. Therefore the controlled redirect tests demonstrate policy logic, while the browser path deliberately chooses less interoperability (fail closed) rather than violating consent-before-new-origin contact.

This does not establish public HTTPS behavior on an independent publisher. Production CORS/public-origin tests remain open.

## Phase 037 exit

Current evidence covers:

- identifying an exposed changed-origin redirect before contacting it;
- separate consent/policy at the new origin;
- bounded acceptable redirect targets and hop count;
- approval re-evaluation for changed origin/path scope;
- no authentication-header leakage;
- fail-closed behavior when browser redirect inspection is unavailable;
- same-origin, changed-origin, looping and denied fixtures;
- local lesson continuity after a blocked redirect;
- a revision-linked redirect/policy artifact.

A redirect to an unapproved origin cannot silently expand access in the tested runtime. Phase 037 can close, subject to separate public HTTPS/CORS acceptance gates.
