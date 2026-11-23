# SUTRA isolated learner shell

A working local shell with synthetic transcript-cue selection, real evidence-validator results and an intentionally rejected altered quotation. It does not run agents, inference or peer networks and is not publicly deployed. No footage, playback progress, seek result or factual verification is simulated.

```sh
cd apps/sutra
npm ci
npm run build
npm test
npm run dev
```

Node >=22.12; Vite pinned to 8.3.4 with its own lockfile. Build output is only `apps/sutra/dist/`; root DHAGO `dist/` and `detour/dist/` are independent. The app imports the dependency-free evidence package directly and needs no root npm installation. No DHAGO preview or DETOUR code/media is imported.

## Player boundary

Future player work belongs in an explicit adapter importing only `src/create-player.ts` and its reusable dependencies. Root source may require root dependencies at that time; resolve them explicitly then. This shell intentionally defers the real DHAGO integration to phase 042. It does not import a fake adapter or silently use the old v8 API. Missing rights-cleared media is shown as a readable empty state.

## Current interaction

Select the transcript cue or “Check example” to compare receipt shape, source/media identity, interval and exact text against the supplied synthetic catalog. “Try altered quotation” demonstrates QUOTE_MISMATCH. Matching means consistent with this catalog; it does not establish factual truth, source authenticity, publisher trust or operational safety.

No API keys, storage writes, third-party analytics, peer requests or model requests exist in this shell. Dynamic corpus text is assigned with textContent rather than inserted as HTML. Static-first production output can be evaluated for Cloudflare later; this change modifies no domains or deployments.
