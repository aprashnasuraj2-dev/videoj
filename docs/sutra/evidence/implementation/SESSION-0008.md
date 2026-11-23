# SUTRA session 0008 — BYOK isolation, peer redirect and run-interruption evidence

This is an engineering evidence record, not a statement of live provider availability,
factual correctness, publisher trust, independent adoption or release readiness.

## Working boundary

- Repository: `aprashnasuraj2-dev/videoj`, PR #48, branch `sutra/peer-invocation`.
- Work is scoped to `apps/sutra/`, `packages/sutra-*/`, `services/sutra-api/`,
  and `docs/sutra/`. DHAGO and DETOUR release artifacts were not modified.
- Public routes, paid inference, customer traffic, final ZIP and Devpost filing
  remain closed by participant release decision 0008.

## Verified code candidates and CI

| Source SHA | Observed outcome | Evidence |
| --- | --- | --- |
| `092c8d2c601bcfd7075a4062a4c13460257aaa90` | BYOK revocation, single in-flight abort, browser key-canary, full shell pass | [Shell](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45155920061) |
| `79d9d01562e039c6c2d47887c92396026913acc7` | Caller-local peer/MCP/privacy containment, from session 0007; checklist reconciled | [Shell](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45150180216) |
| `e5af69d975ec0c7fc4c84c3e20b84036e3302cca` | Exact-path graph reconsent and real loopback redirect denial, plus Chromium continuity | [Shell](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45158153046) |
| `106da667c68b1645fa33674b08785db5a97f2fd3` | Independent funded-quota/BYOK failure paths; concurrent BYOK request cancellation included | [Shell](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45158656419) |
| `cf60561ad82fdef78b3b41e4bc1f530d21192a8a` | No Authorization/Cookie on denied redirect loopback requests | [Shell](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45158831857) |

The latest delegated-run cancellation check at `29d686bd4f3fdb99565e3a3e4c904d12018ff27a`
must be linked to its final CI before its specific checklist task can be credited.

## Security mechanisms and counterexamples

1. **BYOK revocation:** the adapter has a fixed OpenRouter endpoint and stores the
   key inside a closure. Clear now destroys that key and aborts each active
   request. An HTTP request already transmitted cannot be recalled from its
   recipient; this is revocation of future processing, not network erasure.
2. **Peer graph changes:** the consent tuple includes the exact graph path in its
   public purpose. A changed manifest graph path requires another approval,
   and query-bearing graph URLs are rejected. A publisher replacing bytes at
   an unchanged URL is **not yet** bound to a content hash or reconsent; P037-04
   stays open.
3. **Redirects:** browser-native GET uses `credentials:omit` and
   `redirect:error`. A custom transport returning an already-redirected
   JSON response is also rejected. Controlled HTTP fixture routes prove
   that same-origin, changed-origin and looping 302s do not cause the second
   request. This is intentionally stricter than full redirect/reconsent
   interoperability.
4. **Inference resilience:** a synthetic funded quota 429 does not disable
   caller-direct BYOK. Conversely a synthetic BYOK 401 does not disable
   the configured funded proxy. These tests do **not** prove a real paid
   subscription, a live browser CORS policy or end-user budget.
5. **Evidence boundary:** a digest establishes byte consistency, not whether a
   synthetic transcript's factual claim is correct. Neither synthetic media
   nor an automatically formatted provenance trace can replace
   rights-cleared original lesson footage and an independent factual review.

## Retained intermediate failure

Candidate `49e4f00178063c0f484dd6582883f947a754b547`
failed its Chromium assertion in [CI](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45157301045).
The test expected a top-level PEER_ARTIFACT code; the invoking agent instead
exposed the peer-load problem inside a tool result. The assertion was corrected
to examine the observable failure text, and the succeeding result is linked
above. The failed run must not be reported as a pass.

## Outstanding dependencies

- P030-02: live OpenRouter browser CORS with an operator-approved model/key;
  never log or commit the key.
- P025: approved funded provider/model, actual account cap and clean
  keyless visitor completion.
- P034-01: real staging/public HTTPS CORS, not loopback.
- P036-04/06: independently reviewed upstream private-context policy and
  prevention of forbidden return fields.
- P037-01/02/03/04/09/10: explicit redirect and changed-content reconsent
  conformance rather than simple default refusal.
- Real lesson rights, source provenance, factual reviewer and physical-device
  seeking/decoding.
- Distinct **registrable** domain for the peer. A second subdomain of
  `aafnaipatro.com` is not adequate for that declared demonstration objective.
- External entrant testing, public release acceptance and final submission.

## Checklist/accounting rule

Passing automated tests support the exact tasks recorded in `progress.json`.
They do not automatically close a whole phase. Failed runs remain historical.
The following session must compare its checked source with the immutable
tested candidate, rerun impacted checks if code/graph/configuration changes,
and keep the public release gate closed.
