# SUTRA answer/evidence validation pipeline — 2026-11-24

Implementation under observation: `4b7e8e1d33a1e33cc351ff8d20ef00bc090b11f4`  
Standalone evidence-package proof: https://github.com/aprashnasuraj2-dev/videoj/actions/runs/45299599195/job/138128506874

## Boundary

SUTRA uses two separate layers:

1. **Receipt validation** checks source identity/version/hash, media hash, cue identity, exact time interval and exact quoted text against an independently supplied catalog.
2. **Renderable-claim validation** checks whether a visible claim is a source excerpt or an interpretation and preserves that distinction.

Neither layer verifies factual truth, publisher trust or semantic correctness of the source itself.

## Receipt validation

Receipt v1 requires:

- source ID and source version;
- SHA-256 source hash;
- SHA-256 media hash;
- cue ID;
- finite ordered start/end;
- exact excerpt;
- explicit-timezone retrieval timestamp;
- `verification: "unverified"`.

Without an independently supplied catalog, a structurally valid receipt can be only `shape_only`. It cannot upgrade itself to source-backed or verified.

With a catalog, the validator checks:

- exactly one matching source;
- source version equality;
- media hash equality;
- source hash equality;
- cue interval within media duration;
- exactly one matching cue;
- cue start/end equality;
- cue text equality.

## Quotation policy

Version 1 intentionally uses **exact quotation fidelity**, not hidden normalization.

The standalone package regression rejects:

- appended whitespace;
- case changes;
- internal spacing changes;
- altered quotation text in a renderable source-excerpt claim.

A future subquote/normalization contract would require a new explicit version/policy. It must not be smuggled into v1 behavior.

## Renderable claims

`validateEvidenceClaim` accepts only:

- `source_excerpt`: visible claim text must exactly equal the catalog-backed receipt excerpt;
- `interpretation`: model/authored text is allowed only as `interpretation_unverified`, while the underlying evidence excerpt stays separate.

Successful validation returns a stable `sourceRef` containing source/version/source hash/media hash/cue/start/end. The learner comparison view consumes that source reference and exposes an explicit native-video cue action when media is available.

Unsupported evidence stays `unsupported`; it is never silently downgraded into a confident visible claim.

## Observed failure coverage

Standalone package CI passes 27/27 tests, including:

- changed media hash;
- changed source version;
- negative/inverted/non-finite intervals;
- fabricated cue;
- wrong source;
- changed source hash;
- altered quote;
- incorrect cue interval;
- outside-media interval;
- impossible/missing-zone date;
- private unknown field;
- self-asserted truth;
- ambiguous source;
- invalid catalog cue metadata;
- missing fields/non-object inputs;
- stable independent CLI success/failure;
- source-excerpt stable source reference;
- unverified interpretation separation;
- unsupported invented source/altered quote/no catalog;
- exact quotation fidelity;
- claim self-upgrade/extra-field/invalid-receipt rejection.

## Phase-052 mapping

- P052-01 cue ID validation: exact catalog cue lookup.
- P052-02 timestamps/source/media versions: exact receipt/catalog checks.
- P052-03 quotation fidelity: explicit exact-v1 policy + tests.
- P052-04 structured evidence reference: renderable claim requires catalog-backed receipt.
- P052-05 interpretation separation: separate `interpretation_unverified`.
- P052-06 invented/altered/impossible data: fail-closed package tests.
- P052-07 schema != semantic truth: `shape_only` and all successful states remain truth-unverified.
- P052-08 unsupported visible state: claim validator returns `unsupported`.
- P052-09 artifact: this report plus package code/tests/README.
- P052-10 phase exit: bad references fail; supported source excerpts retain a stable cue/source reference that the UI can navigate.

## Counterexample / limit

A perfectly valid receipt can point to a factually wrong source. The validator would correctly say the receipt matches that source, not that the source is true. This is why human factual review and source credibility remain separate release gates.
