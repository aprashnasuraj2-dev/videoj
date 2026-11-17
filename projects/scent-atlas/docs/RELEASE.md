# Scent Atlas — isolated release record

## Public target / scope

- Expected host: `https://scent-atlas.aafnaipatro.com/` (verify post-binding)
- Git source: `https://github.com/aprashnasuraj2-dev/videoj/tree/scent-atlas/projects/scent-atlas`
- Branch boundary: `scent-atlas` only. No changes to `main`, root README, root workflows or GitHub repository description.
- Before production: no DNS record, Pages custom-domain association, or Worker-domain association for `scent-atlas.aafnaipatro.com` was found in the inspected account/zone records.
- Cloudflare account: `8cbd02dbb38348565fe56e14fccf1710`; zone: `3056ed12f9ab1ea7d567f089ee6807be`.

## Preflight baseline (read-only)

- Aafnai Patro apex: `aafnaipatro.com` mapped as a Worker Domain to service `patro`; independent public textual fetch displayed Nepali calendar date १ मंसिर २०८३ / 17 November 2026. DNS apex AAAA `100::`.
- `creative.aafnaipatro.com`: CNAME `public.r2.dev`. Independent HTTP text crawler could not retrieve the page; no claim about HTTP status.
- `detour.aafnaipatro.com`: Worker Domain service `detour-mux-release`, DNS AAAA `100::`. Independent text fetch was inconclusive.
- Other existing domains and Worker routes were inspected read-only; **none were changed** for Scent Atlas.
- Existing Pages projects `detour-videojs`, `dhago-studio`, `aafnai-localcaption-v15`, `aafnai-growth-static` existed before this release.

## Platform choice

The first attempt to provision a Git-connected Pages project returned Cloudflare error `8000011` / HTTP 401 (Git integration installation issue). A dedicated empty **Direct Upload Pages** project, `scent-atlas-studio`, was created. The Pages asset upload endpoint (`/pages/assets/upload`) returned 403 with the available session authorization because it requires a separate upload JWT, not supported by the connected action's header interface. As a contained fallback, prepare an isolated static Worker service `scent-atlas-showroom` and, only after preview checks, bind the unused child hostname using Worker Domains. The empty Pages project can be removed after release, since it contains no content.

## Gate and rollback

1. Validate `npm run verify`, build preview with noindex and package `release/worker.js` from exactly that `dist/`.
2. Upload only script `scent-atlas-showroom`; verify its isolated workers.dev preview, `X-Robots-Tag` and all expected routes. No existing worker or route changes.
3. Rebuild in release mode with canonical live URLs, deploy the same dedicated service, verify preview and known baselines, then attach only `scent-atlas.aafnaipatro.com`.
4. Independently verify HTTPS, all direct page loads, image/JS/CSS requests, 404, cache and CSP, source revision headers, and existing-host baseline associations. Record deployment ID, artifact hash and URL.
5. **Rollback:** if new host fails, detach only the *new* Worker Domain and republish the prior known-good version of `scent-atlas-showroom` if needed. Do not alter the apex, wildcard, other custom domains or shared Worker routes.

## Release evidence

**Pending final verified public deployment.** Update with actual revision, Worker ETag/version, hash, binding ID, hostname, status test results and timestamp. Do not publish a “live” case study without completing these gates.

## Verified isolated preview (2026-11-17)

- Temporary Worker public preview: `https://scent-atlas-showroom.praisethegreatfool.workers.dev/`
- Preview script ETag: `0928150cd3988fd83f25fbfb97542605916a4330a6eeabc073bfb231c9667c43`
- Preview artifact SHA-256: `ef504be8d5936bc2cd4a5c6276dce5950984bb63e11f5a070f37b930f974b9bf`
- Preview source revision: `0046eebab30429c5d629b55e7f32d712b286b39a` (before OG cover addition)
- Independent HTTP content check and screenshot success; 404 returned correctly; `noindex` on preview.
- Production build, custom-domain binding and final public smoke tests are the next release gate.
