# SUTRA session 0010 implementation evidence — separate upstream private-context policy

- Observed: 2026-11-23T16:56:19+05:45.
- Tested source candidate: `621520e1636deb39686e7aef462e8b481c4558cd`.
- Full shell/Chromium CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45162744214
- Register CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45162744060
- Evidence CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45162744084
- Scope: remaining Phase 036 upstream/private-context and receipt-smuggling gates. No live provider, public deployment, original-content claim or submission occurred.

## Mechanism

The restricted runtime now applies independent permissions in both directions at a peer boundary.

Downstream forwarding still requires:

1. the caller graph to declare the private field for downstream use; and
2. the caller-owned exact peer URL policy to permit that field.

Upstream return now requires a second, independent intersection:

1. the peer front agent must explicitly declare the field under `allow.to_upstream.sly_data`; and
2. the caller-owned exact peer URL policy must separately include the field in its `upstream` list.

The host cannot create an upstream permission the peer did not declare, and the peer cannot exceed the host's exact-destination policy.

The merge occurs through the per-tool-call caller context supplied by the existing pinned runner. The vendored runtime files were not changed, so sibling tool calls keep their private context snapshots and the existing deterministic merge behavior.

Only field names are emitted in the sanitized `private_context_upstream` trace event. Values remain absent from runtime event export.

## Observed tests

A controlled peer fixture declared both `locale` and `secret` for upstream return while the caller host permitted only `locale`. The resulting upstream trace contained only `locale`. Neither the `locale` value nor the synthetic secret value appeared in the exported result/events.

A second fixture gave the host `secret` permission while the peer declared only `locale`. The upstream field list was empty, proving that caller policy cannot invent peer return authority.

A receipt-smuggling test combined the runtime boundary with the strict evidence validator:

- the caller private secret was not sent downstream;
- a peer upstream declaration could not recreate that absent secret;
- a peer-proposed receipt containing an extra `apiKey` field failed with `UNKNOWN_FIELD`;
- the validator error output did not echo the proposed private value.

## Counterexample and limit

A field allowed downstream and independently allowed upstream may return to the caller. That is intentional and is why both policies are exact, explicit and destination-scoped.

This does **not** make arbitrary delegated text a private-data firewall. Ordinary model text can still contain user/model-provided information; that limitation remains documented. The restricted peer profile also disallows remote executable tools, so this test does not claim safety for arbitrary third-party code.

## Phase 036 exit

Current evidence now covers:

- private context is structurally separate from normal text;
- default cross-network forwarding is denied;
- policy is keyed to the exact canonical peer network URL;
- downstream and upstream permissions are separate and both enforced;
- synthetic secret canaries remain absent unless explicitly permitted;
- peer output cannot turn a forbidden private field into a valid evidence receipt;
- ordinary delegated text limitations are stated;
- denied and explicitly allowed non-secret cases are tested.

Phase 036 can therefore close on this candidate. Public HTTPS, live model/provider behavior and independent publisher trust remain separate gates.
