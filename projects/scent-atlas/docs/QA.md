# Quality assurance and evidence

**Date:** 2026-11-17 · **Project:** Scent Atlas · **Source:** `scent-atlas` branch; preliminary source revision `2d5cea3756dca7562a66424ad9da8147a263be45` (subsequent refinement commit to follow).

## Scope and reproducible commands

Local environment: Linux, Node v22.16.0, npm v10.9.2, TypeScript CLI v5.8.3, Chromium installed at `/usr/bin/chromium`. No project npm dependencies. Commands from `projects/scent-atlas/`:

```bash
npm ci --offline
npm run test
npm run typecheck
npm run build
node scripts/verify.mjs
SCENT_ATLAS_PREVIEW=1 npm run build
node scripts/package-worker.mjs
node --check release/worker.js
```

### Observed local results

| Check | Observed | Evidence / limitation |
|---|---|---|
| Typed catalog negative tests | 6 of 6 passed | Duplicate sample; duplicate vial; missing reference; wrong lead; repeated scene mapping; happy path |
| TypeScript | 0 reported errors | `tsc --noEmit --strict --target ES2022 --module ESNext src/catalog.ts` using global v5.8.3 |
| Build | Passed | 11 routes + 404 document, project-local assets, robots and sitemap in release mode |
| Static integrity | Passed | 12 HTML documents inspected; all internal file links resolved in generated artifact; no external forms/analytics found |
| Visual overflow | No clipping detected | Chromium render in a controlled `set_content` harness; seven page types at 320, 390, 768 and 1440 CSS px (28 observations), after correction of mobile scene-media aspect-ratio and mobile compare matrix |
| Images | All three photo assets decoded in screenshot harness | Same-origin CSS/image references generated; inline-data screenshot harness used because container network navigation was blocked |
| Keyboard | Skip link receives first Tab focus | Chromium visual harness; other real navigation/state transitions unverified |
| Reduced motion | `scroll-behavior: auto` observed | Chromium context with `reduced_motion='reduce'` |
| 200% zoom | No horizontal overflow on compared page | One zoom spot check in Chromium; not a substitute for full accessibility audit |
| JS off | Core content and link hrefs are present in static HTML | All routes pre-rendered; full physical/browser JS-off navigation not independently tested |
| Multi-browser | **Not tested** | Packaged Playwright Firefox/WebKit/Chromium are absent. System Chromium available for visual render only. |
| Public network, CSP, HTTPS | **Pending** | Validate isolated preview and independent public URL after binding |
| LCP and real transfer | **Not measured** | Initial raw asset total is inspectable; no reliable cold-cache mobile lab sample available yet |
| Human comprehension task sessions | **Not conducted** | This is a self-test, not 3–5 participant validation, and cannot establish conversion lift |

### Notable visual corrections

1. Replaced the unusable narrow-screen transposition of a three-column comparison with three full descriptive scene cards. The complete six-fragrance inventory remains below.
2. Removed the image container's 16:9 aspect-ratio/min-height conflict which otherwise forced an approximately 693px width at 320px viewport.
3. Kept all photos under 50 KiB each in WebP to reduce layout shift and transfer weight.

### Source-derived budgets versus measurements

The action plan proposes **≤450 KiB initial transfer and median LCP ≤2.5s** in three cold-cache mobile lab runs for landing, one scene and one kit. The produced preview artifact contains 19 content assets with a combined raw uncompressed file size around 211,399 bytes; this is **not** equivalent to an observed HTTP transfer or LCP. No performance claim is made. Script content/worker binary size is separate from per-request transfer. Public cloud compression, cache headers, and three-run metrics must be recorded after release.

### Real-world acceptance still due

After exact live binding: independently verify HTTP 200 on all 11 routes, 404 status, HEAD behavior, missing resource handling, canonical and OG URLs, self-hosted assets, CSP header, no PII submission/third-party requests, same-host asset delivery, and the other existing Aafnai Patro domain markers before/after. Perform real Firefox/WebKit and physical Android/iOS tests if those browsers/devices become available. No broad WCAG conformance or conversion change should be claimed on this evidence alone.

## Isolated public preview: external fetch evidence

- Preview hostname `https://scent-atlas-showroom.praisethegreatfool.workers.dev/` bound to the dedicated static Worker `scent-atlas-showroom`, isolated from the apex and all previously deployed services.
- 2026-11-17: independent TinyFish fetch returned real content and correct direct links for landing, `/scenes/rain/`, `/compare/`, `/kits/rain/complete/`; missing route returned a specific HTTP **404**.
- 2026-11-17: separate Firecrawl browser scrape returned HTTP **200** for the landing page, the expected scene image URLs, an actual screenshot, the expected canonical metadata, and `noindex,nofollow` preview robots metadata.
- These checks establish that published preview content was readable; they do not imply measured mobile LCP, real purchase behavior, or complete Firefox/WebKit verification.
- Subsequent cover image asset adds 1600 × 1200 OG media to the final build; budget must be recalculated from the final manifest (unrequested OG image does not load as a normal landing-page `<img>`).

## Production acceptance: 2026-11-17

**Released source:** `0730f5e3146269dc9c099ea554e314a6e3c8d4da`  
**Compiled static Worker SHA-256:** `c8480e85ddabdc45ca5148262fa43870bcf589bab1580b3ac57553905028e340`  
**Domain:** `https://scent-atlas.aafnaipatro.com/`

- An external TinyFish batch independently fetched **11/11** public application routes (landing; three scenes; compare; three kit pages; three completion pages). Titles, scene copy, canonical URLs and production indexing metadata matched the implementation; each completion displayed "No order was placed." No route errors were reported for those eleven requests.
- Separate Firecrawl fetch checked **HTTP 200** for the landing page, **HTTP 200** with `image/webp` for `/media/social-cover.webp`, and **HTTP 404** with a readable friendly HTML page for an invalid URL.
- An externally executed browser scrape returned a mobile-viewport screenshot and recognized the main text/image content, independent of local `set_content` renders.
- Final release pages expose production `index,follow,max-image-preview:large`; isolated `workers.dev` preview gets an explicit `X-Robots-Tag: noindex,nofollow` even when it shares the production bundle.
- Files constituting the first-party landing request (HTML, CSS, tiny optional script, three WebP scene images and favicon) total **156,553 raw bytes (~152.9 KiB)**. This is a static source-asset sum, **not** recorded HTTP transfer or a measured LCP; latency/core web vitals remain unmeasured.
- Post-release Cloudflare read-only mapping: only the new `scent-atlas.aafnaipatro.com` AAAA `100::` and Worker Domain `scent-atlas-showroom` were added. Apex continued to map to `patro`; DETOUR continued to map to `detour-mux-release`; `creative.aafnaipatro.com` remained CNAME `public.r2.dev`; the shared Worker route list was not edited.

**Outstanding verification:** real mobile Safari/Firefox/WebKit interaction, complete screen-reader audit, automated axe/WCAG conformance audit, three cold-cache lab LCP runs and 3-5 volunteer comprehension sessions. These are not presented as completed or promised on a schedule.

### Legacy-host regression result

Independent post-release Firecrawl fetches returned HTTP **200** on the Aafnai Patro apex, DHAGO (`creative.aafnaipatro.com`) and DETOUR (`detour.aafnaipatro.com`) homepages. The visible titles and core content were consistent with their intended identities. These are smoke tests, not tests of unrelated application features or video playback. Pre/post Cloudflare service mappings were identical except for the deliberate addition of the Scent Atlas child host.
