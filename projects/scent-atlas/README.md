# Scent Atlas

**A perfume store for people who cannot smell the screen.** A self-initiated, fictional concept storefront built around three familiar sensory locations: Rain on Pavement, Cedar Workshop and Fresh Orange Peel.

This is a standalone project **within** `aprashnasuraj2-dev/videoj`, on the dedicated `scent-atlas` branch. It does not use or modify the repository's existing player systems, top-level README, CI or deployments. Source and scripts live under `projects/scent-atlas/`.

## Experience

- `/` — choose one of three photographic material memories, or browse the kits directly.
- `/scenes/rain/`, `/scenes/cedar/`, `/scenes/orange/` — three distinct scene stories with clear opening, middle and finish notes.
- `/compare/` — accessible descriptive comparison and all six fictional fragrance profiles.
- `/kits/rain/`, `/kits/cedar/`, `/kits/orange/` — three curated kits, each with three unique, named 2 mL *illustrative* vials.
- `/kits/{scene}/complete/` — direct-linkable, purely local completion notice. **No order is ever placed.**
- `/404.html` — useful custom missing-route page; the hosting adapter sends the HTTP 404 status.

Public and preview domains must be verified before publishing any release URL. No analytics, third-party dependencies, cookies, storage, accounts, delivery addresses, checkout or personal-data requests are used.

## Reproduce

Requires Node.js >=22.10 for native TypeScript stripping. The application build has **zero runtime dependencies** and a project-local lockfile. `npm ci` works without registry access. Static typechecking uses a separately available TypeScript 5.8+ CLI (e.g., `tsc 5.8.3`); this is intentionally not a requirement for site rendering.

```bash
cd projects/scent-atlas
npm ci
npm run test
npm run build
node scripts/verify.mjs
npm run typecheck   # if `tsc` 5.8+ is installed
npm run preview     # http://localhost:4173
```

Preview/noindex artifact: `SCENT_ATLAS_PREVIEW=1 npm run build`. The normal build adds `robots.txt` and a sitemap for the planned canonical hostname. If binding a different verified hostname, set `SCENT_ATLAS_ORIGIN=https://...` before building.

An isolated Worker fallback can be packaged using `node scripts/package-worker.mjs`; this is an entirely static, no-origin-fetch artifact and must **only** be deployed to a dedicated Worker. It is not required for the site's ordinary HTML functioning. The browser itself uses static HTML, CSS and an optional 550-byte clipboard enhancement.

## What is and is not claimed

Six sample identities and their descriptions are invented. 2 mL vials and labels are illustrated; the brand has no inventory, formulation, ingredient declarations, efficacy data or commercial fulfillment. The web experience cannot establish how real participants would understand the scents or whether conversion would change. See `docs/QA.md`, `docs/DECISIONS.md`, `docs/ASSET-PROVENANCE.md` and `docs/RELEASE.md`.
