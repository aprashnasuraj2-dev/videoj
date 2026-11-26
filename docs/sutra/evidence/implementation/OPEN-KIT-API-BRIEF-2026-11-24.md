# SUTRA Open Kit API and adoption brief

## Intended builder job

A developer who has never opened the SUTRA learner app should be able to take one reusable artifact, run its synthetic example on a clean host, inspect the result, and understand its trust boundary without importing DHAGO, DETOUR, private media, credentials or SUTRA UI code.

The kit is source-first and development-versioned; it is not yet a public package release and independent adoption is not claimed.

## Artifact 1 — evidence receipts

**Location:** `packages/sutra-evidence/`

**Builder task:** validate a known-good synthetic receipt against an independently supplied source catalog, then verify altered source/cue/hash/time/text inputs fail with stable non-secret error codes.

**Primary interface:**
- `validateReceipt(receipt,{sources})`
- `validateEvidenceClaim(claim,{sources})`
- CLI `sutra-evidence`
- JSON Schema `receipt.schema.json`

**Guarantee:** a `catalog_matched` result means identity/version/hash/cue interval/exact excerpt agree with the supplied catalog. It does **not** mean the catalog is factually true or trustworthy.

**Dependencies:** none for the evidence package itself; Node >=22 for CLI/tests. No player, learner UI, provider key or server required.

## Artifact 2 — consent inspector

**Location:** `packages/sutra-consent/`

**Builder task:** integrate the plain-browser example, deny a declared external operation and verify zero transport; explicitly allow an exact origin/kind/purpose/disclosure tuple and inspect the redacted event record.

**Primary interface:**
- `createConsentInspector({decide})`
- `inspector.perform(intent,operation)`
- `fetchJsonWithConsent(...)`

**Inputs:** destination origin, contact kind, public purpose, field **labels** intended for disclosure and optional exact network identity. Never pass credentials/private values as disclosure labels.

**Outputs:** allow/deny policy result plus redacted events. No raw prompt, tool arguments, credentials, response body or private error text in exports.

**Denial guarantee:** the operation callback/transport is not invoked after denial.

**Limit:** visible consent is not publisher reputation, endpoint safety or factual verification.

## Artifact 3 — agentic-site starter

**Location:** `tools/sutra-starter/`

**Builder task:** generate the starter into a new directory outside this repository, run its offline/no-dependency verification, serve the loopback example, execute the exact named local network, then run the second-loopback-origin denial/approval walkthrough.

**Core journey:**
1. static site publishes `/agents/agent-manifest.json`, graph and links;
2. browser loads exact named network;
3. synthetic front agent delegates locally;
4. one narrow local action remains explicit;
5. optional second origin is contacted only after consent;
6. wrong/denied destinations fail without fake success.

**No hidden dependency:** generated starter must not depend on `apps/sutra/`, DHAGO/DETOUR, private service configuration, customer data, secret keys or original lesson media.

## Public source and documentation locations

| Tool | Source | Contract/readme | Runnable synthetic example |
| --- | --- | --- | --- |
| Evidence receipts | `packages/sutra-evidence/` | package README + schema | `examples/`, CLI/tests |
| Consent inspector | `packages/sutra-consent/` | package README | plain-browser `examples/` |
| Starter | `tools/sutra-starter/` | template README | generated loopback starter |
| Open Kit aggregate | `docs/sutra/OPEN_KIT.md` | scope/evidence boundary | project CI candidate |

These are repository locations until a public release is separately authorized.

## License, attribution and version boundaries

- Project source: Apache-2.0 root license.
- Redistributors retain license/notices and upstream vendored license/provenance material.
- Starter version is development-tagged; project checks are not official certification.
- Evidence receipt schema/version and source/media hashes are independent version boundaries.
- A later public package/release must bind exact immutable source revision and artifact checksum; current repository paths are not a release claim.

## Clean-host installation task

A valid outside-builder trial is:

1. Use only the released/public quickstart and artifact, not project coaching or a preconfigured project machine.
2. Record OS/runtime/browser and exact kit release/source revision.
3. Start timer before first install/read command.
4. Run the documented synthetic example.
5. Produce one valid evidence receipt **or** one actual browser network invocation, depending on selected artifact.
6. Record every intervention/blocker.
7. Stop timer on the first independently valid result.
8. Target: <=15 minutes for each of two independent builders.

A project maintainer running the same steps is clean-host reproducibility evidence, **not** independent adoption.

## What counts as actual reuse

Counts as reuse only if an outside builder independently uses a released kit artifact in their own environment/project and obtains a valid result. Record release version, environment, result and interventions with consent; public notes should remain de-identified.

Does **not** count:
- repository clone/download alone;
- same-owner SUTRA caller/peer demos;
- project CI;
- a maintainer copying files into another project-owned folder;
- a screenshot, star, page view or package download;
- generated examples operated only by the project team.

## Security/privacy boundary

The kit intentionally excludes personal API keys, private corpus, private customer/device data, authenticated arbitrary MCP, autonomous external writes and hidden services. Synthetic examples may be public; secrets must remain server-side if a future host adds funded inference.

## Exit interpretation

This brief establishes a testable builder contract. It does **not** establish that two outside builders have completed it; that remains phase 076 evidence. A third party can evaluate the kit without importing the learner application or proprietary/private inputs, but usefulness/adoption must be measured separately.
