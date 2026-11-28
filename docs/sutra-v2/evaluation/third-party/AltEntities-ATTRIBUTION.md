# AltEntities — human indirect entity-reference evidence

Source: https://github.com/google-research-datasets/AltEntities at `b26fd4a87327d614acaf6e4e26afef5b3575f298`.

Authors: Mohammad Javad Hosseini, Filip Radlinski, Silvia Pareti, Annie Louis (Google LLC). Upstream license: **CC BY-SA 3.0**. Paper: “Resolving Indirect Referring Expressions for Entity Selection,” ACL 2023.

SUTRA does **not** vendor the 61.9 MB full `all.json`. It stores a derived, attribution-preserving evaluation sample. For each of the nine domain/split cells (BOOKS/RECIPES/SONGS × train/dev/test), examples are ranked by SHA-256 of `question + NUL + choice0 URL + NUL + choice1 URL`; the lowest 20 are retained. Target index and referring-expression text are not inputs to selection. Every human referring expression attached to those 180 selected examples is retained, producing 1,212 records (1,194 unique expression strings).

The derived JSONL contains only the alternative question, two choice names/URLs, human referring expression, target index, sampling method and exact source coordinates. Descriptions, infoboxes and unshown Wikipedia background are omitted. The derived sample remains distributed under CC BY-SA 3.0.

Boundary: these are human **reference-selection** annotations, not binary ambiguity labels. They directly exercise entity-reference resolution but do not validate every SUTRA `entity_identity` phenomenon.
