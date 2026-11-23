# SUTRA session 0019 implementation evidence — source-separated peer comparison

- Observed: 2026-11-23T18:33:54+05:45.
- Tested source candidate: `227e33ebedb0e42aefa28141c617b164a43dce1a`.
- Full shell/Chromium CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45177623668
- Register CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45177623608
- Evidence CI: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45177623712
- Scope: Phase 045 source comparison. No factual-verification, public-deployment or independent-adoption claim.

## Separate source artifacts

The comparison surface always renders the local timing evidence as its own source card:

- source: `synthetic-timing-fixture / v1`;
- date: receipt retrieval date;
- scope: synthetic 2–4 second timing receipt;
- provenance: local media-hash fixture boundary;
- claim window: 2–4 seconds;
- excerpt: the exact local timing receipt excerpt.

The independent SUTRA peer now publishes a second public artifact:

`/agents/checklist.evidence.json`

It is not embedded in the peer graph and is not silently loaded during agent invocation. The artifact states:

- source: `synthetic-written-checklist / v1`;
- published date: 2026-11-23;
- scope/provenance: explicit synthetic engineering conflict fixture;
- claim ID: `timing-marker-window`;
- claim window: 5–7 seconds;
- verification: `unverified`.

The peer build test verifies that this evidence JSON is shipped separately in the static publication and contains no obvious credential fields.

## Independent consent boundary

A new explicit consent kind, `peer_evidence`, was added to the same default-deny inspector used for peer manifest/graph and MCP contacts.

The visible comparison input accepts a peer-network URL, derives the exact sibling evidence URL, and asks for consent showing:

- destination origin;
- exact evidence path in the purpose;
- public field labels that will be retrieved;
- exact network name.

The GET uses the existing bounded `fetchJsonWithConsent` path:

- credentials omitted;
- redirects error/fail-closed unless an inspectable redirect can be re-consented;
- JSON only;
- maximum 16 KiB;
- exact approved origin.

## Conservative comparison classifier

`apps/sutra/src/source-comparison.js` validates both source/claim structures before comparing them.

The result states are only:

- `missing`;
- `unsupported`;
- `conflict_unresolved`;
- `agreement_unverified`.

Agreement is deliberately strict. It requires:

1. the same claim ID;
2. the same structured start/end value;
3. the exact same excerpt.

If structured values align but excerpts differ, the result is `unsupported`, not agreement.

No result state is named or rendered as verified.

## Deliberate conflict behavior

The tested fixture compares:

- local source: **2–4 seconds**;
- written peer source: **5–7 seconds**.

The visible status is therefore `conflict_unresolved`.

The UI shows the two excerpts, dates, scope and provenance side-by-side instead of blending them into one answer.

The viewer may activate **Mark comparison reviewed — do not resolve conflict**. Review changes only `reviewed: false → true`; the classification remains `conflict_unresolved`. Unit tests enforce the same invariant.

## Missing and denied behavior

Before a peer guide is loaded, the comparison status says the written source is unavailable and explicitly infers neither agreement nor conflict.

Chromium then tests denial:

1. enter the loopback peer network URL;
2. request the written guide;
3. consent dialog appears;
4. choose Deny;
5. peer evidence request count remains unchanged;
6. local 2–4 second source card remains visible and usable;
7. status says peer evidence was denied and no comparison is inferred.

A second attempt is explicitly allowed once. Exactly one `/agents/checklist.evidence.json` request occurs, with no Authorization or Cookie header.

## Original source links

The local card publishes a direct timing-media reference ending in the media fragment:

`#t=2,4`

The peer card links to the exact written evidence JSON and its claim fragment:

`checklist.evidence.json#timing-marker-window`

The local card also retains a button that seeks the local timing media only when the fixture is actually loaded.

## Browser observations

Chromium verifies:

- initial comparison state is `missing`;
- local source is visible before any peer contact;
- denial creates zero peer artifact requests;
- allowed peer evidence fetch is one credential-free GET;
- peer source metadata and 5–7 second window are visible;
- comparison status is `conflict_unresolved`;
- factual truth remains explicitly unverified;
- both source references are preserved;
- marking reviewed does not resolve or relabel the conflict.

The rest of the full SUTRA browser journey still passes on the same source revision.

## Retained failure

Run **45177077320** is retained. It failed later in the existing corrupt-media seek test because Chromium sometimes retained the previous finite duration after a decode failure.

The product was corrected to use the authoritative native `media.error` state before duration/range policy. The learner now reports a distinct load/decode-error seek failure. This was not a comparison failure, but it was discovered by the integrated comparison candidate and remains visible in history.

## Counterexamples and limits

- Similar prose is not agreement. Exact structured value **and** exact excerpt are required.
- Human review does not resolve a source conflict.
- A source conflict does not tell SUTRA which source is factually correct.
- The written peer artifact is an intentionally conflicting synthetic fixture, not a rights-cleared lesson guide.
- Same-project two-origin publication is interoperability engineering evidence, not independent adoption.

## Phase 045 exit

Current evidence covers:

- local/video evidence and written guide as separate source cards;
- visible source date, scope and provenance;
- conservative exact agreement classification;
- unresolved visible conflict;
- explicit missing/unsupported states;
- links to exact local cue and written artifact;
- peer denial preserving local evidence;
- deliberate visible conflict fixture;
- revision-linked artifact and tests.

The phase exit is observed: the conflict remains visibly unresolved through review, and no inferred agreement is labeled verified.

**Phase 045 can close.**
