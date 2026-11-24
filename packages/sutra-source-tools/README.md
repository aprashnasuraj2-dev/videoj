# SUTRA read-only source tools

Reusable, transport-independent source registry, independent of the learner UI.
`createSourceTools(catalog)` snapshots host-approved source data. `list()` returns
closed input schemas and `effect: read`; `call(name, arguments)` supports:

| Capability | Input | Output bound |
| --- | --- | --- |
| `search_lesson` | literal query, 1–120 characters | at most 5 exact cue receipts |
| `read_cue` | exact source ID and cue ID | exactly 1 cue, or an error |

No URLs, selectors, scripts, writes or arbitrary fetches are accepted. Catalogs
have at most 20 sources and 500 cues/source, with 2,000 characters/cue; each result
is capped at 16 KiB. Receipts pass the separate source-consistency validator
against the host catalog before return. They always retain `unverified` truth
status. A consistent quotation from an incorrect source remains incorrect.

Run `npm test` here. The included corpus is a synthetic timing fixture, not an
original educational lesson. No independent adoption or real learner benefit has
yet been measured. The source registry and validator are intended community tools;
publication documentation, licensing audit and external builder trials remain gates.

The registry additionally caps aggregate cue text at 4,000,000 UTF-16 code units and rejects non-data descriptors before reading them. Registration indexes source/cue identity in linear cue count; exact lookup uses nested maps, and literal search stops at five matches. Receipts are independently checked against immutable projected source and cue metadata. The ceiling is not a promise of a particular device latency. Parse untrusted wire JSON; executable proxies are outside the library contract.
