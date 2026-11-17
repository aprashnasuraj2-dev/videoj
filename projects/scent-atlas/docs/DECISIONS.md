# Design and engineering decisions

## Product strategy: familiar scenes over perfume jargon

**Customer problem:** A screen cannot convey smell. Abstract ingredient pyramids may be more legible to fragrance enthusiasts than to a curious first-time shopper. This concept starts from stable, recognizable material memories (wet pavement, pencil-like cedar, citrus oil) then gradually introduces six fictional fragrance profiles. It intentionally avoids a personality quiz, invented percentages or formula claims.

**Counterexample:** A collector searching for a specific note or brand might prefer a traditional catalog and ingredient facets; scene-led entry is not automatically better. This experience offers both direct kit browsing and a plain-language comparison page to avoid trapping that shopper in the editorial journey.

## Information architecture

A typical path takes **three deliberate actions**: choose a scene → open its kit → confirm the local demo. Optional comparison is never required. Direct-route URLs are the source of truth; no JavaScript router, account or browser storage. An accessible link can always navigate back or explore another kit.

## Validated content model

Exactly six unique sample IDs, three scenes, three distinct kits and one scene per kit. Each kit's first sample must be the scene's declared lead. Build-time validation rejects missing references, mismatched leads, duplicate IDs, repeated vial IDs, wrong kit sizes and structurally incomplete kit roles. This is a fictional sample composition; the code makes **no claims** about actual ingredients, wear time, price or suitability for allergies.

## Static pages vs commerce backend

| Dimension | Chosen: pre-rendered static pages | Rejected: catalog API + checkout |
|---|---|---|
| Core need | Six stable concepts, direct URLs, reading and sample decision | Inventory, payments, order lifecycle not part of the brief |
| Reliability | Browser can render core experience with JavaScript blocked | Network and credential failures threaten core flow |
| Privacy | No data is sent to a collection endpoint | Would require processing account, delivery and payment information |
| Hosting cost | Assets fit into roughly 0.21 MB of original bytes for preview build; CDN caching available | Database, payment, support and observability costs added |
| Constraint | A real launch would require a new project and legal/operational scope | Over-engineers a self-initiated concept |

## Image/typography choice

Three coherent material macro studies share camera logic while assigning distinct visual temperatures. The asset budget is **132,596 bytes total for all three WebP scenes**, leaving room for fast first impressions even without modern font downloads. The no-font download approach intentionally diverges from a preferred named-font pairing, in exchange for deterministic offline rendering and fewer network requests. A finished commercial identity could license and bundle a formal type family.

## Hosting fallback and isolation

Cloudflare Pages Git integration returned HTTP 401 (`8000011`, Pages Git installation internal error) despite the account's Pages Write permission. The isolated fallback is a standalone static Worker with the complete built artifact embedded locally; there are **no subrequests**, and the Worker is bound only to a verified unused child hostname. This costs one Worker invocation per request rather than the static-asset serving model of Pages. Return to isolated Pages when the Git installation/direct-upload credentials are properly available. Nothing is routed through the Aafnai Patro apex or existing DHAGO/DETOUR Worker services.

## Accessibility and failure mode

Semantic HTML has a skip link, one main heading per page, normal anchors, visible focus styles, descriptive alt, a properly headed comparison table, 44+ CSS pixel primary choices and explicit reduced-motion overrides. Mobile comparison uses full per-scene cards rather than transposing a dense four-column matrix. Core operations do not depend on hover, JS, localStorage, media or audio. Assisted screen-reader testing and physical-device observations remain future evidence items; these are design decisions, not a broad WCAG conformity claim.
