# SUTRA Session 0059 — CloudflareB public app deployment

- Deployment completed: 2026-11-27T00:03:20+05:45 (2026-11-26T18:18:20.291972Z).
- Explicit participant instruction in this session: deploy SUTRA directly to the connected **CloudflareB** account and use a `.dev` domain.
- Initial direct deployment revision: `f322757d0ebfbc149aae2ba930c0acf826e08c18`.
- Final canonical production deployment revision after one already-queued documentation push: `2c32a3da0e2d5c7392efb8abd73bf16037a0dd3d`.
- Source: `aprashnasuraj2-dev/videoj`, branch `sutra/caller-peer-failure-boundary`, root `apps/sutra`.
- Cloudflare Pages project: `sutra`.
- Managed production hostname: `https://sutra-c70.pages.dev/`.
- Initial direct deployment ID: `56a0b903-147b-497d-9ba1-6ecb39eaf78e`.
- Final canonical deployment ID: `f2209727-cff2-4142-ad1d-966c42770e48`.
- No merge, paid inference, provider secret, domain purchase, Devpost submission or npm publication occurred.

## CloudflareB account/domain observation

Before deployment, read-only CloudflareB account inspection found:

- zero active or pending Cloudflare DNS zones;
- zero Cloudflare Registrar registrations;
- zero existing Pages projects;
- therefore no owned custom `.dev` hostname was available to bind.

A custom hostname was **not invented or purchased**. The deployment uses Cloudflare Pages' managed `pages.dev` production hostname. Binding a separate custom `.dev` domain remains pending until an actual owned domain is present in the account or supplied by the participant.

## Project creation and build

Created Pages project `sutra` with:

- production branch: `sutra/caller-peer-failure-boundary`;
- root directory: `apps/sutra`;
- build command: `npm ci && npm run build`;
- output directory: `dist`;
- automatic production deployments enabled for that branch;
- preview deployments disabled.

The first production deployment cloned exact revision `f322757d0ebfbc149aae2ba930c0acf826e08c18`. Before automatic production deployments were disabled, one already-queued GitHub push built documentation-only revision `2c32a3da0e2d5c7392efb8abd73bf16037a0dd3d`; it completed successfully and became canonical.

Observed build/deploy log:

- Git clone: success;
- Node 22.23.4 / npm 10.9.9;
- Vite 8.3.4 client build: 866 modules transformed;
- runtime build: 25 modules transformed;
- publication inventory: **74 byte-bound public files, 3 exact network identities**;
- Cloudflare parsed **8 valid header rules**;
- **87/87 files uploaded**;
- final Pages stage: **success**;
- Cloudflare log: `Success: Your site was deployed!`.

## Deployment-control correction

The Pages project initially had production branch auto-deploy enabled. Because SUTRA checkpoint documentation is committed on the same branch, this could create unnecessary production rebuilds. Automatic production deployments were disabled after the first deployment. One push-triggered deployment had already entered the queue; it completed successfully as deployment `f2209727-cff2-4142-ad1d-966c42770e48` at revision `2c32a3da0e2d5c7392efb8abd73bf16037a0dd3d`.

Cloudflare file hashes for the first and final deployments are identical for the selected production-critical artifacts:

- `/index.html` → `4c0cf9a610a8140555e1e662668c5d45`;
- `/agents/agent-manifest.json` → `d7f01dcca4c06b63df18e5b11a3372d2`;
- `/agents/learner.network.json` → `c375a7e2b457b37e635c4af72270a026`;
- `/content/content-profile.json` → `b71b285df4fc896694de7ca46e34d83b`;
- `/runtime/sutra-runtime.js` → `f22caa7fefae8f4665a0875002f0166c`.

This establishes that the documentation-only auto-deploy did not change those published app artifacts. Future branch commits do not automatically deploy. Cloudflare may still create **skipped deployment records** for later Git pushes; for example record `3dbbdb55-9d42-4ce8-9339-8f1bd3d27978` for commit `ed1b1c00c7fe08bdf2d595307a102b2938d1f5e3` was observed with `is_skipped: true` and no stages executed. The canonical production deployment remains `f2209727-cff2-4142-ad1d-966c42770e48`.

## External public verification

An independent public fetch of `https://sutra-c70.pages.dev/` returned the rendered title:

> SUTRA · Evidence-linked learning

and the visible initial source-loading text. The fetch required no login.

Direct public artifact fetches also succeeded for:

- `/content/content-profile.json`;
- `/content/source-catalog.json`;
- `/runtime/sutra-runtime.js`.

The published content profile explicitly reports `mode: "synthetic"`, title `Synthetic timing lesson fixture`, and states that it demonstrates source consistency/browser behavior rather than factual training guidance. That label is retained in production and must not be converted into a final-content claim.

## Release interpretation

This session establishes a **public caller-app deployment on CloudflareB**. It does not establish the full original Phase 083 AafnaiPatro two-origin release because:

- the planned separate peer origin is not deployed;
- no custom owned `.dev` domain exists in CloudflareB yet;
- final rights-cleared lesson media/corpus remains pending;
- funded/live provider inference remains unapproved/unmeasured;
- human/device acceptance and final-candidate release gates remain open.

The earlier no-deployment decision is superseded only to the extent explicitly authorized in this session: public CloudflareB caller-app deployment. Other release/submission gates remain evidence-driven.

## Checklist/count effect

No original checklist task is newly credited solely from this deployment because the existing public-release phases require broader caller+peer/custom-domain/live-task/final-artifact conditions. Counts remain:

- **777/1,107 overall verified**;
- **671/1,000 original verified**;
- **323 original pending**;
- **6 omissions**;
- **1 hardware blocker**.
