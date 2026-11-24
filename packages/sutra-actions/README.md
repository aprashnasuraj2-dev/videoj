# SUTRA local action registry

Framework-neutral, host-owned registry for reviewed local actions. Public graphs and
model output cannot register handlers. Each definition declares a stable name,
effect and destination, plus host code for validation/execution.

The registry snapshots finite plain-JSON arguments at `prepare()`, returns a frozen
proposal for human/UI review, and executes only by proposal ID. It consumes the
proposal **before** the handler runs, so a failed or ambiguous side effect cannot be
blindly retried with the same confirmation.

Effects are intentionally small: `read_local`, `write_local`, and `download`.
Arguments are capped at 16 KiB and reject accessors, prototypes, cycles, unsafe
keys and non-finite values.

This package does not itself grant network access, persistence, model access, or
factual verification. Handlers remain host-owned code and must enforce their own
domain-specific validation.
