# Scoped action protocol — synthetic laboratory

This is a reusable development primitive, NOT a deployed action service, a new browser permission, or a generic exactly-once guarantee. Existing external write and coded-tool restrictions remain unchanged.

## Wire and authority

The fixed binary request is 113 bytes: a random 16-byte logical action key, one enumerated fixture slot byte, 32-byte policy context, and 64-byte Ed25519 approval. The context binds an exact provisioned audience, fixed capability, manifest version and session. Only trusted host code can authorize a proposal; the model and peer manifest cannot sign it. The receiver pins the approver public key and policy context. Key reuse with different approved input refuses.

The 117-byte commit receipt binds the action key, SHA-256 of the exact approved request, slot and monotonic receiver version under a separately pinned receiver key. A signature authenticates a receipt relative to its key, not the receiver's honesty or a real-world reservation. No trusted timestamp or third-party identity is claimed.

The in-memory receiver serializes its own synthetic slot mutation and ledger entry under one lock. Duplicate requests for the same key and input return the original receipt without repeating the mutation, including after the effect budget is exhausted. The caller's client fixes one literal loopback HTTP origin, prohibits redirects and proxies, bounds contacts to four and gives each HTTP call a two-second deadline; it sends no credentials/cookies and no arbitrary model text. The bounded binary payload deliberately has no executable or raw-text fields. This is not a generic input-taint solution.

## Recovery state machine

```
Proposed (host approved) -> Dispatched -> Committed (valid signed receipt)
                                     \-> Unknown (lost/untrusted response)
Unknown -> status lookup -> Committed (valid receipt)
                         \-> Unknown (including absent status)
Unknown -> explicitly retry SAME signed approval -> Committed / Unknown
```

No automatic blind dispatch after ambiguous outcome. A status absence does not prove the first request will never arrive. A new action key is a new approval, not a retry. A committed client returns its existing receipt locally without network contact. A failed contact consumes its budget. Policy refusals at the receiver do not authorize another action; the narrow client conservatively treats nonreceipt responses as unknown rather than trusting unsigned remote error strings.

## Run

From the repository root:

```sh
go test -race -count=1 -v packages/sutra-knowledge/action-protocol/protocol.go packages/sutra-knowledge/action-protocol/transport.go packages/sutra-knowledge/action-protocol/protocol_test.go packages/sutra-knowledge/action-protocol/durable_linux.go packages/sutra-knowledge/action-protocol/durable_linux_test.go packages/sutra-knowledge/action-protocol/anchor_linux.go packages/sutra-knowledge/action-protocol/anchor_linux_test.go packages/sutra-knowledge/action-protocol/caller_linux.go packages/sutra-knowledge/action-protocol/caller_linux_test.go
```

The tests use actual loopback TCP and close the socket after applying a synthetic effect; they also close it before commit, exercise concurrent duplicate submissions, wrong approval, audience and manifest substitution, forged receipt, redirect, contact and effect budget, malformed request size and occupied slot. No external write is performed.

## Durable synthetic receiver (Linux)

`CreateDurable` explicitly initializes a private local directory; `OpenDurable` refuses a missing or invalid snapshot. The owned slot effect is the signed snapshot itself. A single process holds an advisory flock for the store lifetime; every commit writes a bounded signed request history to a temporary file, syncs it, atomically renames it and syncs the directory before returning the deterministic receipt. On uncertain persistence the instance refuses further reads/writes until reopened. The same fixed binary HTTP handler can serve the durable receiver, still only a synthetic fixture. An independently retained exact approval and receipt can be supplied to `OpenDurableAnchored` to reject a valid older signed snapshot relative to that pin. Cloned signers and stores sharing the pinned prefix can still fork; no global anti-equivocation or authenticated freshness. Tests include actual process exits and actual TCP loss with store reopen, plus injected I/O-stage errors; not physical power-loss tests. Trusted private directory/local filesystem and honest cooperating owners are required. Abandoned temporary files require bounded cleanup before production use.

## Scope and next gates

- The original in-memory receiver discards the ledger on restart. The separate Linux receiver persists only its owned synthetic snapshot. Do not use either as a production receiver. Atomic durable effect+ledger commit (or an upstream idempotency contract), wider restart/recovery tests and external anchor lifecycle are mandatory before exposing any write. An external side effect and local record cannot generally be made atomic by this mutex.
- No generic rollback. Compensation is a distinct, independently authorized action that can itself fail; irreversible effects have no rollback.
- No authenticated transport identity, revocation, expiration, multi-tenant key lifecycle, or distributed/global budget. Per-client contact limits reset if a new client is constructed; do not interpret them as a global spend limit.
- No remote publisher execution or model tool registration. The loopback synthetic HTTP harness is not independent-site browser adoption.
- The binary approval/receipt format is a prototype, not an official challenge protocol. Integrate with the existing browser consent and trace only after an explicit security review; separate proof of effect, policy decision, causal chain, and externally authenticated time.

## V2-010 bounded candidates

`Anchor` wraps a separately trusted durable authority; exact parent CAS serializes cooperating writers, and `VerifyAnchorView` validates ordered approvals and receipts against separately provisioned policy, keys and head. Cloning the anchor itself can still fork. `ContactBook` freezes exact host-approved keys, rejects duplicate slots and persists a signed reservation before each loopback request (two per approval, three for the book), with cached verified receipt and sticky unknown across reopen. It assumes one trusted private directory and signer; a valid older signed journal can reset its budget, and another book can bypass its cap. This is not a global provider budget. Neither primitive changes browser capabilities or exposes external writes. The CAS interface and journal transport are not yet integrated. See [formal/ANCHOR.md](formal/ANCHOR.md) for bounded safety, fairness and explicit implementation gaps.


## V2-011 shared authenticated authority candidate

`SharedAuthority` is a separate Linux-only laboratory primitive. It does not
replace the previously verified durable receiver, `Anchor`, or `ContactBook`.
It atomically persists the synthetic action history/receipt ledger and contact
counts in one signed snapshot. Two pinned caller keys authenticate contacts;
invalid callers consume zero budget. Valid contacts are bounded to two per
caller and three aggregate, matching the current bounded TLA+ profile. Commit
uses an expected-head CAS; status may reconcile a stale caller pin. A lost
reply followed by restart can therefore recover the same receipt without
resetting the shared budget. Restoring an old local caller cursor cannot reset
the authority's counters.

This still trusts one authority key and private filesystem. Cloning that key
and signed snapshot permits a fork; the test preserves this counterexample.
There is no Byzantine quorum, multi-host consensus, arbitrary external write,
provider spend budget, expiry/revocation, or browser exposure. See
`formal/REFINEMENT.md` for the concrete Go-to-TLA trace mapping.

## V2-011 independent monotonic witness candidate

`AuthorityWitness` is a second Linux-only trust domain with its own key, lock and
signed fsync+rename store. `SharedAuthority` signs each exact old-head → new-head
transition; the witness accepts it only when the old head equals its current head.
`OpenSharedAuthorityWitnessed` compares a reopened authority snapshot to an
independently retrieved signed witness view. Restoring only an old authority
snapshot is therefore detected. An actual separate-process loopback witness CAS
test is part of the race gate.

This improves rollback detection only when witness key/store/latest view are
protected independently. Restoring both older valid signed stores recreates an
old mutually consistent pair, which the permanent negative test accepts. This is
not a quorum, public transparency log, trusted timestamp or Byzantine consensus.

## V2-012 witnessed transaction boundary

Plan without mutating; persist signed intent; apply exact durable authority plan; CAS independent witness; clear intent; expose only nonce-bound, genesis-pinned composite proof. A client with lost replies may reconcile a monotonic sequence gap if the signed contact ledger, request hash, stale-parent classification and challenge agree. Raw authority transport is legacy/fixture only, not the production write route. Status recovery is contact-budget bounded. All four process crash points and both real HTTP loss points passed at `8998fceab17b09ec8d1911945fd5bd90b7b26c89` ([race gate](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45537116625/job/138946313221)). Concurrent cloned stores both may persist local synthetic effects; one witness acknowledges only one, loser retains intent and refuses recovery. Independent admission/fencing or upstream idempotency is mandatory before arbitrary external effects. Both-domain rollback and GrantBook rollback remain explicit negative controls. No physical-power-loss certification or consensus claim.


## V2-013 admission availability boundary

The independent admission fence now distinguishes two fail-closed availability
conditions instead of collapsing them into generic policy/rollback errors.
A pending reservation whose owning authority-side intent has disappeared is
reported as `ErrFenceOrphaned`; it is not automatically aborted. The bounded
laboratory transition cap is reported as `ErrFenceExhausted` both in-process
and over the loopback client, and exhaustion does not mutate the fence.

This is intentionally a safety-over-liveness decision. Automatically clearing an
orphan because its owner is unavailable is unsafe once an admitted operation may
have dispatched an arbitrary external effect whose outcome can arrive later.
`formal/FenceAvailability.tla` and the independent Python explorer preserve
both sides permanently: the safe machine admits an orphaned-reservation liveness
counterexample, while a steal-orphan recovery mutant violates
`AtMostOneEffect` when delayed effects are allowed. The current Go receiver is
still a local synthetic atomic effect, so these models do not prove a production
provider transaction protocol. A real external write path needs an upstream
idempotency/fencing contract or a separately authorized resolution mechanism;
wall-clock lease expiry alone is not accepted as evidence that an effect did not
occur.
