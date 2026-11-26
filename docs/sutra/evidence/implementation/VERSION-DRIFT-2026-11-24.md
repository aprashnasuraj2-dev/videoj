# SUTRA source/media drift and stale-card behavior — 2026-11-24

Implementation under observation: `4b7e8e1d33a1e33cc351ff8d20ef00bc090b11f4`.

## Goal

Changing a transcript, media file, source version, cue interval or receipt schema must not silently preserve an old “valid” learning card. The system should invalidate or visibly mark the prior reference as stale while retaining enough previous provenance to explain what changed.

## Existing integrity bindings

Every saved review receipt already carries:

- source ID;
- source version;
- source SHA-256;
- media SHA-256;
- cue ID;
- cue start/end;
- exact excerpt;
- receipt schema version.

On reload the active host catalog is supplied independently. The receipt validator compares these fields to that active catalog.

## New stale-card model

The review store now separates **storage shape** from **current evidence validity**.

`inspect()` returns either:

- `valid`: current catalog-backed record; or
- `stale`: not valid against the active catalog, with prior diagnostic provenance:
  source ID/version/hash, media hash, cue ID and interval, plus stable validation error codes.

A stale record is not returned by the normal valid `list()` path. `list()` raises a `STALE_REVIEW_DATA` error if stale records exist.

Stale storage remains deletable because deletion uses structurally valid raw records rather than requiring current evidence validity.

## No silent migration

The store does not mutate an old receipt to fit a new source. A stale old record also blocks a new confirmed save from being mixed into the same valid collection until the stale record is explicitly removed.

This is deliberate: source ID reuse cannot silently convert an old cue/hash/version into a current claim.

## Visible learner behavior

The review UI uses `inspect()`.

Valid cards keep the normal local download/delete actions.

Stale cards render as:

> Stale local review · source <id> / <old-version> · cue <id> · revalidation required

They receive a stale state marker and **no “Download saved receipt” valid-evidence action**. The user can delete the stale local record, then re-run the current review if desired.

The status explicitly says source/media version drift occurred and that the record is not being shown as valid evidence.

## Automated drift cases

Unit tests cover:

- source version v1 -> v2;
- media hash change;
- transcript/source hash + wording change;
- media duration/cue compatibility change;
- receipt schema version 1 -> 2;
- prior provenance retained;
- stale list raises an explicit stale-data error;
- stale record is deletable;
- stale record blocks mixing a new save until explicit cleanup.

The browser regression additionally mutates a persisted saved card to a retired source version, reloads the page, and requires:

- a visible stale warning;
- the old version visible as provenance;
- no valid saved-receipt download button;
- successful explicit deletion of the stale record.

## Version compatibility policy

- receipt schema v1 is the only supported evidence receipt version today;
- local review storage key is v1;
- unsupported receipt versions are stale/invalid, not silently migrated;
- source IDs may remain stable only if version/hash/cue evidence still matches;
- content hash freshness/integrity is not factual truth.

## Phase-056 mapping

- P056-01 receipts bound to source/media hashes: implemented.
- P056-02 transcript/media duration drift detection: tested.
- P056-03 stale cue invalidation/visible stale state: implemented.
- P056-04 no silent source-ID migration: old receipt remains unchanged and stale.
- P056-05 schema/receipt compatibility: v1-only, unsupported versions stale.
- P056-06 stale saved cards across reload: browser regression.
- P056-07 previous provenance retained: stale diagnostic record.
- P056-08 integrity/freshness != truth: explicit UI/docs boundary.
- P056-09 artifact: this report.
- P056-10 exit: changed fixture/version/hash invalidates or visibly stales prior evidence.

## Limits

This demonstrates application-level source drift using controlled fixtures and local storage. It does not prove a real publisher’s versioning discipline or CDN freshness. Production source ingestion and rights/factual review remain separate.
