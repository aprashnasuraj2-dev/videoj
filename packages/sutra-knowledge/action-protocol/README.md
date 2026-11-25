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
go test -race -count=1 -v packages/sutra-knowledge/action-protocol/protocol.go packages/sutra-knowledge/action-protocol/transport.go packages/sutra-knowledge/action-protocol/protocol_test.go packages/sutra-knowledge/action-protocol/durable_linux.go packages/sutra-knowledge/action-protocol/durable_linux_test.go
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
