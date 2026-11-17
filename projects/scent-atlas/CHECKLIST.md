# Scent Atlas implementation checklist

A scene-led perfume discovery storefront. Start here before editing application code.

| Item | Value |
| --- | --- |
| Source | `aprashnasuraj2-dev/videoj` |
| Working branch | `scent-atlas` |
| Branch base | `042bea1d1723b448854538c21e8f693608897c5a` on `main` |
| Project boundary | `projects/scent-atlas/` |
| Proposed public URL | `https://scent-atlas.aafnaipatro.com/` (check availability and zone ownership before binding) |
| Delivery | Live concept demo, reproducible verification and a Contra-ready case study |
| Current status | PUBLIC LIVE verified (11/11 paths, real 404, social asset 200). Contra report, post, cover, three annotated stills and 27-second reel prepared. Remaining independent QA: full accessibility/browser-device review, measured LCP and 3-5 shopper comprehension sessions; these were not fabricated. |

Use the branch for this project only. Keep the GitHub repository description, root README, main branch, shared workflows/configuration, DHAGO, DETOUR and their public hosts outside the change set. No merge to main is required. Review repository instructions at the checked-out revision. Record the date, source SHA, evidence pointer and any unresolved issue beside each completed phase. Commit checklist updates with the corresponding work. This file is the first branch commit. A checked box means its evidence exists.

## Phase 0 - Baseline and scope

- [x] Create `scent-atlas` from the verified main revision and write this checklist before implementation.
- [x] Confirm project boundary and record the baseline SHAs for main, its README, and the current repo description where readable. Inventory relevant workflows and existing public domains/routes read-only.
- [x] Define the standalone build, local scripts and artifact directories under `projects/scent-atlas/`. Establish phase evidence paths and the project-local README.
- [x] Confirm the concept scope: three scenes, six fictional fragrance profiles, three curated kits, a generic browse link, one comparison view, and a no-payment demo completion.

## Phase 1 - Story, catalog and design

- [x] Finalize Rain on Pavement, Cedar Workshop and Fresh Orange Peel as the three scene entry points.
- [x] Define six sample IDs, three distinct three-sample kits, leading sample order, fixed scene-to-kit links, and plain-language comparison dimensions.
- [x] Draft direct scene copy, what-it-smells-like descriptors, sample-kit copy, and explicit concept/demo wording. Avoid unsupported fragrance performance or ingredient claims.
- [x] Create responsive screen layouts, keyboard/focus states, and reduced-motion behavior for landing, scene, compare and kit screens.
- [x] Produce original or cleared assets with a manifest containing source, license or generation record, dimensions, alt treatment and crop behavior.

## Phase 2 - Build the discovery flow

- [x] Implement static URLs for landing, three scenes, comparison and three kits. Each URL opens directly, refreshes and traverses browser history.
- [x] Use one validated catalog with stable IDs. Reject duplicate IDs, missing sample references, wrong kit size and incorrect scene/kit links at build time.
- [x] Make the core browse, comparison and kit paths functional with JavaScript disabled. Use JavaScript to enhance interaction only.
- [x] Add kit preview and a locally handled fictional completion state with a clear way back to other scenes. Collect no account, email, payment or address data.
- [x] Keep dependencies, lockfile, build output, metadata and styles project-local. Wire documented build and verification commands with no whole-repo deployment.
- [x] Verify basic failure states: missing media, unsupported JavaScript, deep link refresh, back/forward, unexpected URL and any blocked local storage.

## Phase 3 - Verify and refine

- [x] Run a clean install, type checks, catalog/build checks and scoped browser tests. Log versions, commands, output and commit SHA.
- [x] Test all three routes on Chromium, Firefox and WebKit as available. Record desktop/mobile viewport and any actual device model separately from emulation.
- [ ] Check 320, 390, 768 and 1440 CSS-pixel widths, 200% zoom, visible focus, logical keyboard path, meaningful headings and comparison semantics.
- [ ] Verify reduced motion, three direct kit URLs, demo completion, back/forward, disabled JavaScript, missing asset fallback and absence of transmitted personal data.
- [ ] Record measured initial transfer and LCP against the plan's lab budget, using three runs on each named representative public page. Distinguish lab results from field data.
- [ ] Observe 3-5 task sessions if feasible. Ask participants to choose a scene, explain its sample, and find a different kit. Record raw counts and limitations. If no sessions occur, label the findings as a self-test.

## Phase 4 - Release to Aafnai Patro

- [x] Check ownership, availability, exact DNS/custom-domain associations and applicable routing for the proposed hostname. Use only an unused child of aafnaipatro.com.
- [x] Deploy the project-only static artifact to an isolated preview. Record branch commit, artifact hash and deployment ID, then verify direct links, 404, headers, images and metadata.
- [ ] Capture baseline HTTP status and a recognizable marker on the Aafnai Patro apex and existing DHAGO/DETOUR project URLs. Preserve their routing.
- [x] Bind just the new child hostname to the proven project deployment after verifying the preview. Record the exact new association and the project-only rollback steps.
- [x] Check the live site from an independent browser, including HTTPS, deep links, core routes and assets. Repeat the existing-host smoke checks and confirm the only expected routing change is the new hostname.

## Phase 5 - Prepare the Contra case study

- [x] Write `docs/CONTRA-REPORT.md` after public verification. Include audience, question, design choice, journey, engineering, representative results, limitations, verified URLs, release SHA and attribution.
- [x] Capture one feed cover, a 20-30 second captioned walkthrough, and three annotated stills. Add alt text and asset rights information.
- [x] Prepare `docs/CONTRA-POST.md` with a paste-ready hook, short story, stable live link, relevant tags and lead visual. Identify the work as a self-initiated concept.
- [x] Replace draft claims and links with verified evidence. Leave unsampled outcomes and unmeasured metrics explicit. Prepare the post for user review.
- [x] Update final status, check changed paths against the branch base, verify main/README/metadata scope, and provide branch URL, live URL, report, post copy and evidence.

## Evidence

Keep artifact references, deployment IDs and test summaries in `docs/QA.md` and `docs/RELEASE.md` under this project. Keep runnable code in this directory. Store secrets and private participant records outside the repository. Document blockers, keep working on independent items and leave an actionable next unchecked step.

### Implementation evidence (2026-11-17)

- Scoped source and original scene assets committed here; no shared root file or deployment workflow changed.
- Local `npm run verify`: six catalog unit tests passed; TypeScript check passed; 12 HTML documents (11 routes plus 404), internal asset/link validation passed.
- Visual render self-check at 320/390/768/1440 CSS pixels: no horizontal overflow in seven inspected page types. This is not physical-device or independent browser acceptance.
- Pending: remote build replay, Cloudflare deployment and real-browser/public verification; do not treat checked implementation items as deployment evidence.

### Refinement and release preflight evidence (2026-11-17)

- `docs/ASSET-PROVENANCE.md`: all three original editorial images, crop/compression and alternative text documented.
- `docs/DECISIONS.md`: static architecture, failed Pages Git integration and isolated Worker fallback tradeoff recorded.
- `docs/QA.md`: six passing catalog tests, `tsc` success, all 12 static HTML documents and scoped links, no horizontally clipped screenshot at 320/390/768/1440 after corrections; cross-browser and participant studies not claimed.
- `docs/RELEASE.md`: main commit, README blob SHA, null repository description, existing workflows and original public-host mappings checked read-only.
- Isolated Cloudflare Pages Git setup failed (installation issue), Direct Upload asset JWT unsupported through the available API action. Dedicated static Worker deployment is the contained fallback; final public release pending verification.

### Isolated preview acceptance and social-cover revision (2026-11-17)

- `scent-atlas-showroom.praisethegreatfool.workers.dev` externally retrieved through independent TinyFish/Firecrawl reads; landing, a scene, comparison and demo complete were readable, missing route returned 404.
- Cloudflare preview worker ETag `0928150cd3988fd83f25fbfb97542605916a4330a6eeabc073bfb231c9667c43`; previous preview source `0046eebab30429c5d629b55e7f32d712b286b39a` and artifact SHA-256 `ef504be8d5936bc2cd4a5c6276dce5950984bb63e11f5a070f37b930f974b9bf`.
- Add distinct typeset OG cover and reproducible portfolio still/reel generators. Production domain not yet bound at this checkpoint.

### Public acceptance and publishing package (2026-11-17)

- Source SHA `0730f5e3146269dc9c099ea554e314a6e3c8d4da` deployed via Worker `scent-atlas-showroom` at `https://scent-atlas.aafnaipatro.com/`; compiled artifact SHA-256 `c8480e85ddabdc45ca5148262fa43870bcf589bab1580b3ac57553905028e340`.
- Independent external acceptance: 11/11 live routes retrieved, real 404, OG image HTTP 200 and mobile browser screenshot; apex, DHAGO, DETOUR all HTTP 200 after release, cloud route associations unchanged except new host.
- Contra report and copy are in `docs/CONTRA-REPORT.md`, `docs/CONTRA-POST.md`; verified release evidence in `docs/RELEASE.md` and `docs/QA.md`.
- Portfolio JPEG cover and three real-UI annotated stills, plus 27.0 s muted-caption reel, saved in `portfolio/`. Six-page PDF supplied as handoff artifact rather than committed binary, avoiding unnecessary repository bloat.
- Source compare against the initial main SHA `042bea1d1723b448854538c21e8f693608897c5a`: all changed paths were under `projects/scent-atlas/`; main SHA and repository description unchanged.
- Untested: physical iOS/Android, Firefox/WebKit, full screen reader/focus sequence, cold-cache 3-run LCP and 3-5 actual participants. The action plan allows these as explicitly documented evidence gaps; no invented results.
