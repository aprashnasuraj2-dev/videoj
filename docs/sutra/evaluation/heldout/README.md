# Held-out evaluation protocol

This directory intentionally contains **no claimed human-reviewed held-out case set yet**. The public `engineering-v1` regression data lives one directory above and is visible to implementation; it must never be relabeled as held-out evidence.

The later real-corpus review process is deliberately separated from tuning:

1. Author exactly 40 draft cases with neutral IDs `H001` through `H040`: 20 answerable, 10 unanswerable and 10 conflict/adversarial. Do not encode category in the case ID.
2. Keep draft expected outcomes outside the implementation/tuning branch. Generate a blind packet with `createBlindReviewPacket(..., {orderSeed})`. It contains only neutral case ID and prompt; case kind, expected disposition and source/cue references are withheld. The recorded seed produces deterministic shuffled order so grouped authoring order does not reveal category.
3. Human reviewer(s) inspect the designated source material outside the model-tuning loop and adjudicate every expected outcome.
4. Only then provide a structural attestation covering all 40 case IDs and freeze a new `heldout-vN` set. The tool hashes canonical object content and deep-freezes the in-memory manifest.
5. Run the recorded model against that immutable hash. Every case must retain one row, including fail/error outcomes.
6. Corrections create a strictly newer `heldout-vN+1` with parent hash, changed neutral IDs and explicit reason. Never rewrite or delete the prior frozen set or its failures.

The software can validate shape, completeness, deterministic blind ordering, hashes and lineage. It cannot prove that a human really reviewed the cases, that a reviewer was independent, or that the adjudication was correct. Those remain observed human evidence gates.

No names, email addresses or reviewer identity documents belong in the public attestation. Record reviewer count, review time and the required statement only; keep any consent/identity handling outside public project data.

Run `node --test tools/sutra-evaluation/*.test.mjs`.