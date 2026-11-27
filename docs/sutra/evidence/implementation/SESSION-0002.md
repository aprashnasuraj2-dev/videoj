# Session 0002 evidence

Observed 2026-11-23T13:08:08+05:45; candidate changes based on parent cbd3be50545e98a6d1b13c58e59d403b7cde7906. The accompanying file-hash manifest identifies the exact tested new package bytes; the parent SHA is not a claim that the new code already existed there.

Commands observed on Node v24.22.3:

- `node --test packages/sutra-evidence/test/receipt.test.mjs`: 22 passed, 0 failed.
- Tests cover source/media identity drift, cue/text mismatch, interval/date validation, forbidden extra fields, receipt self-verification, ambiguous source, invalid catalog metadata and CLI behavior.
- Independent-host check: CLI executed successfully with `/tmp` as its working directory, using only the package's synthetic files.
- No browser, media playback, live model, real user, outside-builder trial or deployment was performed.

Contract implementation: package schema, browser-callable validator, CLI, exact catalog checks and source-version/media identity fields. Source and media hashes are compared with an independently supplied catalog; real corpus ingestion/hashing remains future work. Synthetic examples are not original film evidence.

Problem brief: `docs/sutra/PRODUCT_BRIEF.md` records the proposed user/task, manual baseline hypothesis, input/output, three failures, measurable success and assumptions. Actual factual reviewer appointment remains pending. Phase 002 stays open.

Progress credits: phase 017 contract design and phase 057 standalone validator exit checks are supported by implementation/tests and documentation. Their early execution is independent of the final corpus/runtime. This does not close any intervening app, peer or conformance phase.
