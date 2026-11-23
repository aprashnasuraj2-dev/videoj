# SUTRA community building blocks

These are additional reusable source tools created while building SUTRA. They are
implemented in this repository; independent builder adoption and usefulness have
not yet been measured. They do not establish factual truth or full web conformance.

| Building block | Interface | Evidence |
| --- | --- | --- |
| Evidence receipts | `packages/sutra-evidence`: schema, `validateReceipt`, CLI | 22 tests; shape-only versus catalog-matched result |
| Source tools | `packages/sutra-source-tools`: `list`, `call` | 5 registry tests; bounded literal search and exact cue read |
| Browser host | `packages/sutra-runtime`: compile/run/load, restricted source MCP, consent-aware peer artifact loader | 65 tests; exact peer resolution, explicit grants, budgets, cancellation and sanitized events |
| Inference boundary | `packages/sutra-inference` and `services/sutra-api` | Synthetic streams and transaction harness; live provider/model still unverified |
| Consent inspector | `packages/sutra-consent`: policy, redacted events, bounded JSON helper, plain-browser example | 8 unit tests + standalone Chromium; default deny and exact explicit session scope |

Source tools currently import the evidence package and the pinned runtime schema
helper; copy those dependencies together. They are not yet a published standalone
npm package. No accounts, keys or remote model calls are needed to run the source
registry and its synthetic tests. The learner UI is not a dependency.

From the repository root with Node 24:

```sh
node --test packages/sutra-source-tools/test/*.test.mjs
node --test packages/sutra-evidence/test/*.test.mjs
node --test packages/sutra-runtime/test/*.test.mjs
node --test packages/sutra-consent/test/*.test.mjs
```

Follow each package README for contracts, limits and scope. Before community release,
complete the licensing audit, clean-host packaging/reproduction check, contribution
guide and consenting outside-builder trials. The final submission may link these
artifacts and actual evidence under Potential Impact; it must not invent usage,
impact metrics, endorsements or independent peer adoption.
