# SUTRA local action registry

Framework-neutral, host-owned registry for reviewed local actions. Public graphs and
model output cannot register handlers. Each definition declares a stable name,
effect and destination, plus host code for validation/execution.

The registry snapshots finite plain-JSON arguments at `prepare()`, returns a frozen
proposal for human/UI review, and executes only by proposal ID. It consumes the
proposal **before** the handler runs, so a failed or ambiguous side effect cannot be
blindly retried with the same confirmation. Cancelled and consumed proposal IDs cannot be reused within the registry lifetime. After 4,096 issued IDs the session requires a reload rather than evicting earlier identities.

Effects are intentionally small: `read_local`, `write_local`, and `download`.
Arguments are capped at 16 KiB and reject accessors, prototypes, cycles, unsafe
keys, non-finite values and sparse/nonstandard arrays. The aggregate UTF-8 JSON byte budget is charged during traversal, before building an oversized snapshot.

This package does not itself grant network access, persistence, model access, or
factual verification. Handlers remain host-owned code and must enforce their own
domain-specific validation.

Action definitions are a closed, own-data registration contract (six fields), with
primitive names and dense ordinary arrays. The validator receives the immutable
argument snapshot and must return a boolean; it cannot silently rewrite reviewed
arguments. Reentrant preparation is refused, including from the identity factory.
The browser runtime may export this host-owned registry, but public graph/model
output cannot obtain its registration or execute authority.
