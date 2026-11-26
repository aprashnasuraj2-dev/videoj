# SUTRA community tools and impact — pre-release evidence note

Observed: 2026-11-26.

This document is intentionally narrower than a marketing impact report. It explains what the reusable SUTRA building blocks are for, what has been observed in repository/CI checks, and what **has not** been demonstrated by outside builders.

## Impact boundary first

Current independent external adoption count: **not established**.

The SUTRA learner, SUTRA peer, loopback peer/MCP fixtures, neutral-consumer CI and same-repository clean-host checks are engineering evidence. They do **not** count as independent community users, production adopters, endorsements or outside publishers.

Installation reproducibility and package separation can be tested by the project itself. Adoption requires a genuinely external builder/use case. Those are different claims and remain different in the final submission.

## Reusable building blocks

### 1. Evidence validator — `packages/sutra-evidence/`

**Builder problem:** A tool can emit a plausible citation object while pointing at the wrong source version, media identity, cue interval or quotation.

**Reusable job:** Validate a bounded v1 source receipt against an independently supplied source catalog and distinguish invalid, shape-only and catalog-matched results.

**What it deliberately does not solve:** factual truth, semantic support, publisher identity, signatures or user trust.

**Current example/check:** the package includes synthetic receipt/catalog examples and a Node CLI. The Open Kit candidate runs the CLI without the learner UI or provider credentials.

### 2. Consent inspector — `packages/sutra-consent/`

**Builder problem:** Browser agents can hide network contact behind a tool/peer operation, making the destination and disclosed fields difficult for a user to understand before contact.

**Reusable job:** Present the origin, contact kind, purpose and disclosure labels before one external operation, default deny, and optionally remember only an exact session-scoped contact tuple.

**What it deliberately does not solve:** endpoint reputation, factual truth, malicious public content or undoing a request after bytes have already left the browser.

**Current example/check:** plain-browser example plus Node/Chromium tests; denial executes zero simulated/external effect at the decision boundary.

### 3. Restricted browser runtime — `packages/sutra-runtime/`

**Builder problem:** A published agent graph needs an inspectable execution boundary instead of implicitly gaining arbitrary remote code, model routing, writes or credentials.

**Reusable job:** Compile and execute bounded declarative graphs with caller-owned model selection, budgets, cancellation, sanitized events, explicit peer loading and a strict public-read MCP subset.

**What it deliberately does not solve:** arbitrary MCP compatibility, arbitrary executable peer code, universal prompt-injection defense or live-provider quality.

**Current example/check:** pinned upstream nsDeploy core is byte-verified; runtime tests cover graph validation, caller-local peer composition, source/MCP boundaries, cancellation and bounded trace behavior.

### 4. Source tools — `packages/sutra-source-tools/`

**Builder problem:** A model or UI should not be allowed to invent a source citation simply because related text exists somewhere in a prompt.

**Reusable job:** Bounded exact source search and exact cue read against a host-provided registry, returning receipts that can be independently revalidated.

**What it deliberately does not solve:** semantic retrieval quality, factual correctness or broad web search.

### 5. Publisher starter — `tools/sutra-starter/` / Open Kit artifact

**Builder problem:** A new publisher needs a minimal example that exposes inspectable agent artifacts without inheriting SUTRA learner UI, private media or provider credentials.

**Reusable job:** Generate/test a small publication with a pinned restricted runtime and safe local action example.

**What it deliberately does not solve:** production hosting, independently operated HTTPS, provider setup or adoption.

### 6. Open Kit packager — `tools/sutra-open-kit/`

**Builder problem:** Copying reusable source by hand makes it easy to omit licenses, drift vendor bytes or mix private/generated files into a shareable bundle.

**Reusable job:** Build a deterministic private engineering candidate containing the evidence validator, consent inspector and publisher starter with file hashes, lengths, licenses and secret/path checks.

**What it deliberately does not solve:** publisher authentication, a public release signature, npm publication or the final competition package.

## Installation usability is not adoption

Project-controlled checks currently answer questions such as:
- can the candidate be built deterministically;
- can a tar round-trip preserve its inventory;
- can the evidence CLI run without the learner;
- can the consent example deny an operation without executing it;
- can the publisher starter verify the vendored runtime and run its tests.

Those checks are evidence of **reproducibility and separation**, not evidence that an unrelated developer found the tools useful, understood the APIs without help, or adopted them in another product.

Therefore:
- same-owner SUTRA caller/peer origins count as zero independent adopters;
- loopback services count as zero independent public publishers;
- CI runners count as zero external builders;
- an authored neutral consumer proves a consumer boundary, not community adoption;
- repository stars, traffic or clone counts would not by themselves prove successful integration.

## External-builder evidence still missing

The following must remain unclaimed until observed:
- number of independent builders who attempted installation;
- time-to-first-success for those builders;
- interventions/help required;
- outside projects using the tools;
- independently operated public peer/MCP origins;
- production impact on learning outcomes or builder productivity.

A future outside-builder record should identify the tested immutable candidate, environment, start/end time, commands, interventions and outcome while avoiding unnecessary personal information.

## Maintenance boundary

SUTRA's reusable source is offered without a hosted-service SLA, guaranteed response time or promise of indefinite compatibility.

A realistic maintenance scope is:
- preserve fail-closed security/evidence boundaries;
- keep current documented Node/browser compatibility explicit;
- fix reproducible correctness/accessibility/security defects;
- keep upstream attribution and pinned-runtime integrity;
- version breaking public contract changes if/when a public release exists.

Outside that boundary unless separately adopted:
- running a free inference service indefinitely;
- supporting every MCP transport/provider/router;
- operating third-party peers;
- storing community/user accounts;
- guaranteeing every media codec/device;
- maintaining old competition infrastructure forever.

## Short factual contribution paragraph

> SUTRA includes reusable source building blocks for evidence-linked browser agents: a receipt validator that checks citations against an independent catalog, a default-deny consent inspector for external contact, a restricted caller-side graph runtime, bounded source tools, and a deterministic publisher starter/Open Kit candidate. The components are tested independently from the learner and do not require a personal API key. Current evidence demonstrates repository/CI reproducibility and controlled browser integration; it does not yet demonstrate independent external adoption, public third-party interoperability, or production impact.

This paragraph is safe as a **pre-release draft** because it avoids public-link, adoption, award, user-outcome and live-provider claims. It must be revisited against the final public candidate before submission.

## Phase 086 status boundary

This note can support:
- P086-01 builder problem per reusable tool;
- P086-04 installation usability versus production adoption;
- P086-06 realistic limitations/maintenance boundary;
- P086-07 same-owner origins are not community users;
- P086-08 a short truthful contribution section.

It cannot support:
- P086-02 final versioned public source/docs/example links;
- P086-03 actual outside-builder counts/install times/interventions;
- P086-05 target-user task results;
- P086-09 final report artifact with public links;
- P086-10 phase exit.
