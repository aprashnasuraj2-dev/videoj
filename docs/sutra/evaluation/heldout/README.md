# Held-out evaluation protocol

This directory intentionally contains **no claimed human-reviewed held-out case set yet**. The public `engineering-v1` regression data lives one directory above and is visible to implementation; it must never be relabeled as held-out evidence.

The review protocol is designed for the later real corpus:

1. Author exactly 40 draft cases: 20 answerable, 10 unanswerable and 10 conflict/adversarial.
2. Generate a blind packet with `createBlindReviewPacket`. It excludes expected dispositions and source/cue references.
3. Human reviewer(s) inspect the designated source material outside the model-tuning loop and adjudicate every expected outcome.
4. Only then provide a structural attestation covering all 40 case IDs and freeze a new `heldout-vN` set. The tool hashes the exact frozen content.
5. Run the recorded model against that immutable hash. Every case must retain one row, including fail/error outcomes.
6. Corrections create `heldout-vN+1` with a parent hash, changed IDs and explicit reason. Never rewrite or delete the previous frozen set or its failures.

The software can validate shape, completeness, hashes and lineage. It cannot prove that a human really reviewed the cases, that a reviewer was independent, or that the adjudication was correct. Those remain observed human evidence gates.

No names, email addresses or reviewer identity documents belong in the public attestation. Record reviewer count, review time and the required statement only; keep any consent/identity handling outside public project data.

Run `node --test tools/sutra-evaluation/*.test.mjs`.