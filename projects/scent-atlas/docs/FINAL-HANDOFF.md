# Scent Atlas — final handoff, 17 November 2026

**Public experience:** https://scent-atlas.aafnaipatro.com/  
**Dedicated working branch:** https://github.com/aprashnasuraj2-dev/videoj/tree/scent-atlas  
**Project directory:** `projects/scent-atlas/` only.  
**Deployed source revision:** `0730f5e3146269dc9c099ea554e314a6e3c8d4da`  
**Portfolio/report commit:** `d7fd10486e56c512d558419ec845f6ff2c15e085` (documents and media; no deployed site code changed).  
**Compiled Worker SHA-256:** `c8480e85ddabdc45ca5148262fa43870bcf589bab1580b3ac57553905028e340`  
**Cloudflare Worker service:** `scent-atlas-showroom`; exact Worker Domain association `b7462b7ae52c81105e536032c6a99f58966ecb85`.

## Verified delivery

- Three illustrated familiar scenes, six typed and validated fictional fragrances and three named three-vial concept kits.
- Landing, all three scene stories, full comparison, three kits, three local completion pages and readable 404: **11 application routes plus fallback**.
- Dedicated public HTTPS host; original WebP material studies; no external origin fetch, checkout, forms, cookies or analytics.
- Six catalog tests, strict TypeScript check, static integrity/links, responsive visual inspection at four CSS widths, isolated preview, independent public route/asset/status checks.
- Independent public HTTP fetch: 11/11 routes, 404 for invalid path, 200 for OG asset and for the three pre-existing host homepages after release.
- Contra case study (`docs/CONTRA-REPORT.md`), post copy (`docs/CONTRA-POST.md`), media guide, editorial cover, three annotated stills and 27-second captioned silent reel.
- A separate six-page professionally composed PDF case study is delivered as a downloadable file rather than checked into source control.

## Deliberately open validation

The five unchecked items in `CHECKLIST.md` concern full keyboard/screen-reader/zoom validation, complete real-browser and disabled-feature behavior, measured multi-run mobile LCP, sessions with 3-5 real participants, and pre-release HTTP baselines for all legacy hosts. Where post-release HTTP checks exist, they are clearly labeled as post-release, not invented pre-release history. The public demo does not claim measured conversion effects, formula authenticity, allergy safety or actual orders.

## Next action for the owner

Review the long-form Contra report and the media selection. If accepted, upload the already prepared cover/reel/stills and copy to Contra. Publishing to the owner's Contra profile was intentionally not performed: the deliverable is paste-ready for final editorial approval. Public site and repository branch are already live; no merge to main or deployment of unrelated projects is required.

## Operational caution

Git-connected Pages creation failed with Cloudflare integration error 8000011, and Direct Upload required a separate asset-upload credential unavailable through the connected action. The clean, isolated static Worker fallback is currently in use. It incurs a Worker invocation for each served request; before a high-traffic paid campaign, migrate these same static build outputs to a dedicated Pages or Workers Static Assets delivery project after access is fixed. Avoid any change to shared Workers or wildcard routes.
