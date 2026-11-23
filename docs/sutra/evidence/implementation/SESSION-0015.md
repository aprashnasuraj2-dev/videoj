# SUTRA session 0015 evidence reconciliation — review-card learner flow

- Observed: 2026-11-23T17:23:27+05:45.
- Product/source candidate: `0e0c42c9ab2e060a61f299ff23b90ffcd9ffc52c`.
- Full Chromium/shell: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45166574357
- Detailed action evidence: [SESSION-0014.md](SESSION-0014.md)

This checkpoint reconciles already tested behavior against Phase 046. It does not claim ten new product features.

## Preview before local effect

Both local effects start from an explicit review dialog:

- save-review-card previews action name, origin, `effect: write` and the complete evidence receipt before persistence;
- export-receipt previews the same bounded payload before a local JSON download;
- cancel closes the review and executes no registry action.

The registry plan and nested receipt arguments are recursively frozen. If different arguments are needed, the caller must create a fresh plan and confirmation.

## Evidence identity

The reviewed receipt includes the exact source/cue identity already validated by the evidence package:

- `sourceId`
- `sourceVersion`
- `mediaHash`
- `sourceHash`
- `cueId`
- start/end
- excerpt
- retrieval time
- `verification: unverified`

Both preparation and execution revalidate the receipt against the host source catalog.

## Storage and deletion

The visible learner UI states that the review is saved in **this browser only** and that no account/server write is involved.

Saved records are bounded in localStorage. Chromium proves:

1. cancelled preview leaves zero cards;
2. confirmed preview creates one card;
3. page reload restores that card;
4. delete removes the card.

The review store rejects unreadable/corrupt/stale records instead of silently overwriting them.

## Failure outcomes

Unit tests cover:

- storage quota/security rejection;
- ambiguous storage error after a possible side effect;
- no automatic retry after either ambiguous save or ambiguous export;
- export handler failure represented as action receipt status `unknown`;
- bounded collection and invalid receipt rejection.

The learner UI distinguishes rejected/unknown outcomes and tells the viewer to inspect local state before retrying when outcome is unknown.

## Export privacy boundary

The export action accepts only the strict receipt object. It has no field for prompts, model text, BYOK credentials or private context. Extra fields fail schema/evidence validation.

The browser exporter serializes only the validated receipt into the downloaded JSON. Existing BYOK browser canary checks verify the key is absent from page/storage/provenance; the export path has no reference to the BYOK adapter or its closure.

## Phase 046 exit

Current evidence supports:

- preview before persistence/download;
- exact cue/source-version receipt references;
- visible browser-only storage meaning and deletion;
- immutable confirmed payload;
- storage/export failure handling;
- reload/stale-data behavior;
- deletion;
- export independent of private prompts/router credentials;
- reviewed phase artifact.

The phase exit is observed on the controlled synthetic fixture: saved data matches the confirmed preview, reload/delete work, and storage failures remain visible.

This is local evidence-flow correctness, not factual verification, public account storage or production user research.
