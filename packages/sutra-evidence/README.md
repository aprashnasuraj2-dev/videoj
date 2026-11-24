# SUTRA evidence receipts - early v0.1.0 source package

Dependency-free ES module and Node CLI for video-cue evidence receipts. Browser-callable code imports no Node APIs. This early source package is not an npm publication, a complete agentic runtime or a semantic truth verifier.

```sh
node --test packages/sutra-evidence/test/receipt.test.mjs
node packages/sutra-evidence/cli.mjs packages/sutra-evidence/examples/receipt.json packages/sutra-evidence/examples/sources.json
```

```js
import { validateReceipt } from './packages/sutra-evidence/index.js';
const result = validateReceipt(receipt, { sources: independentlySuppliedCatalog });
```

No installation, provider key, player or learner app is required. Copy the package directory to an independent host and run its CLI with Node >=22. Use the root Apache-2.0 LICENSE; retain its notices when redistributing. Synthetic examples are project-authored fixtures, not real media or user-research results.

## Contract

`receipt.schema.json` is a JSON Schema 2020-12 shape contract. The runtime additionally checks finite ordered intervals, actual calendar dates, nonblank text and source/cue consistency. External schema validators must enable date-time format assertions; runtime checks remain required. These constraints are stricter than shape validation alone.

Every receipt carries version 1, sourceId, sourceHash (SHA-256 of the canonical UTF-8 transcript/checklist bytes), sourceVersion, mediaHash (SHA-256 of actual media bytes), cueId, start/end seconds, exact cue excerpt, retrievedAt with explicit timezone, and `verification: "unverified"`. Applications must supply the expected catalog independently; never construct it from untrusted receipt claims. The synthetic example's mediaHash is a labeled placeholder identity for a fixture, not proof that a film exists.

The catalog is an array of `{id, hash, version, mediaHash, duration, cues:[{id,start,end,text}]}`. Cue ranges and text must match exactly in v1. Subquotes, tolerance, multi-source synthesis, signatures, author identity and real media hashing/ingestion are not implemented. A future ingestion step must calculate hashes from the actual bytes; merely copying claimed hashes provides no integrity assurance.

Return levels:

- `invalid`: rejected with stable error code and field path; values are not echoed.
- `shape_only`: receipt shape passed without a supplied source catalog. No source matching claimed.
- `catalog_matched`: references, expected hashes, source version, media identity, cue bounds and exact text match the supplied catalog. This does not establish factual truth, semantic support, publisher trust or operational safety.

Unknown receipt properties are rejected, including fields named for credentials/private prompts. Callers must still prevent sensitive content being placed inside an excerpt and control who supplies the catalog. This library does not isolate secrets, execute peer code, fetch URLs or grant consent.

CLI exit codes: 0 accepted at the reported level; 1 invalid receipt/catalog; 2 usage, unreadable/oversized input or malformed JSON. The CLI supports files up to 2 MiB each; the API bounds catalog count to 10,000 but the host must also bound transport bytes.

The JavaScript API accepts ordinary plain/null-prototype records and dense arrays, not custom prototypes, accessors, hidden fields, symbols or serialization hooks. Descriptor checks do not invoke ordinary getters; this is not a sandbox for Proxy traps or arbitrary caller code. Parse untrusted wire JSON before validation. Matching cue lists are capped at 10,000 entries.
