# Shared authority to AnchoredRecovery trace mapping — V2-011 candidate

This is a bounded implementation mapping, not a formal refinement theorem.

The new Go `SharedAuthority` keeps four things under one Linux file lock and one
signed fsync+rename snapshot: the host-approved action history, receiver receipt
ledger, per-caller contact counts, and aggregate contact count. Two separately
provisioned caller public keys authenticate requests. The authority signs every
successful/conflict/absence/budget response and binds it to the exact caller
request hash, before-head and after-head. Invalid caller signatures are refused
before budget is charged.

Mapping to `AnchoredRecovery.tla`:

- a Go authenticated commit contact maps to `Dispatch(c,k)` followed by
  `Deliver(m,ack)`; the test harness can deliberately drop the HTTP response so
  `ack=FALSE` while the authoritative commit remains durable;
- a Go status contact maps to `Status(c,k)`;
- a stale expected head on commit maps to a delivered message whose parent is
  no longer the authoritative history; Go refuses the effect but still charges
  the contact;
- a contact after 2 per caller or 3 aggregate maps to refusal because
  `CanContact(c)` is false and therefore is outside `Next`;
- process reopen preserves history and contact counts, corresponding to the
  model's crash/stuttering abstraction under the stated filesystem assumptions.

`formal/refine_trace.py` independently replays the exact JSON trace emitted by
the Go race test. It checks head chaining, stale-parent classification,
per-caller/global budgets, receipt-version soundness, two-key history, lost
acknowledgement recovery and the final budget refusal. It does not import Go.

Remaining non-refinement gaps: Go collapses dispatch+delivery inside the server
transaction once bytes arrive, while TLA+ exposes pending messages; network
authentication and binary parsing are outside the TLA state; physical storage
semantics are assumed; the model has no caller key cryptography; and neither
model nor implementation prevents a privileged operator from cloning the
authority key and signed snapshot. The permanent clone test demonstrates that
counterexample. This is a single-authority design, not distributed consensus.

## V2-012 concrete witnessed bridge refinement

Exact code candidate `8998fceab17b09ec8d1911945fd5bd90b7b26c89`; [push artifact and logs](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45537116625/job/138946313221), [PR](https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45537124323/job/138946337538). The Go test captures signed authority snapshot, independently challenge-attested witness view, signed intent and counters; Python independently maps 65 observations to Init / PrepareWithoutAck / CommitAuthority / AdvanceWitness / ClearIntent / Acknowledge / AbortPrepared / Crash-Stutter. Scenarios and counts: normal 6, after-intent 6, after-authority 8, after-witness 8, after-clear 13, lost-witness 11, lost-final 11, clone-rejected 2. Clone rejection is outside the admitted transition domain. Five tamper controls reject missing intent, witness ahead, digest equivocation, counter reset and premature acknowledgement. No keys or approval bytes in trace output. Trace hooks add observational reads and do not model every possible schedule. The simultaneous-clone test separately demonstrates both local effects before one witnessed CAS, and losing branch fail-closed. No universal refinement theorem or power-loss proof.
