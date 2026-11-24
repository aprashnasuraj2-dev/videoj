# SUTRA read-only source tools

Reusable, transport-independent source registry, independent of the learner UI.
`createSourceTools(catalog)` snapshots host-approved source data. `list()` returns
closed input schemas and `effect: read`; `call(name, arguments)` supports:

| Capability | Input | Output bound |
| --- | --- | --- |
| `search_lesson` | NFKC-normalized literal query, 1–120 characters | at most 5 exact cue receipts plus `returnedCount`, exact `matchCount` and `truncated` completeness metadata |
| `read_cue` | exact source ID and cue ID (1–128 characters, matching the catalog identifier ceiling) | exactly 1 cue, or an error |

No URLs, selectors, scripts, writes or arbitrary fetches are accepted. Catalogs
have at most 20 sources and 500 cues/source, with 2,000 characters/cue; each result
is capped at 16 KiB. Receipts pass the separate source-consistency validator
against the host catalog before return. They always retain `unverified` truth
status. A consistent quotation from an incorrect source remains incorrect.

Run `npm test` here. The included corpus is a synthetic timing fixture, not an
original educational lesson. No independent adoption or real learner benefit has
yet been measured. The source registry and validator are intended community tools;
publication documentation, licensing audit and external builder trials remain gates.

The registry additionally caps aggregate cue text at 4,000,000 UTF-16 code units and rejects non-data descriptors before reading them. Registration indexes source/cue identity in linear cue count; exact lookup uses nested maps, and literal search scans the bounded catalog to count every matching cue but retains at most five receipts; `truncated` is true exactly when `matchCount > returnedCount`. Worst-case scan is bounded by 10,000 cues and 4,000,000 UTF-16 code units, not an unbounded search. Receipts are independently checked against immutable projected source and cue metadata. The ceiling is not a promise of a particular device latency. Parse untrusted wire JSON; executable proxies are outside the library contract.

The caller-side source MCP treats `truncated: true` as an incomplete source operation and refuses to expose the first five excerpts to a model as though they were complete. The local exact-search UI may show the bounded five results only with an explicit shown/total count and truncation message. This distinction is deliberate: component output bounding must not become a system-level completeness claim.
