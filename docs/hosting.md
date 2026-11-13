# Public hosting and deployment

Public collection: https://creative.aafnaipatro.com/

Compatibility address: https://dhago.aafnaipatro.com/

Both custom domains point directly to the existing `dhago-studio-static` R2 bucket in the connected Cloudflare account. Only these two hosts map `/` to `/index.html` through a URL transform. No Patro application route, worker, asset, DNS record or sitemap is replaced. The empty `dhago-studio` Pages project is not the serving origin.

The production build contains plain static files. Hashed assets are uploaded first, HTML entry points last. Existing objects are compared by key and MD5 ETag before uploading: unchanged media and other assets are reused. Old hashed assets are retained so a previously loaded page continues to work. No general SPA fallback masks missing media or scripts as HTML.

Video requests go directly to Mux after its public playback ID is configured. `?local` explicitly selects the original MP4; playback failure never silently changes the claimed Mux source. The original film is retained in Git and at the existing R2 key. This architecture adds zero application Worker invocations per ordinary static request; R2 operations, storage and Mux delivery remain metered under their account allowances.

## Release evidence

Record the source revision, public playback ID, object hashes, production smoke result and captures in `submission/manifest.json` and `tests/QA.md`. A 200 response alone proves neither playback nor bonus eligibility. The annotated `journal.html` is a separate studio publication using the portable skin to navigate scene notes; final bonus eligibility is the judges' decision.

## Recovery

To roll back, restore the prior HTML entry points and their matching source revision; retained hashed assets remain available. Never replace zone-wide rulesets or delete shared bucket content to deploy this project. Leave both direct domains enabled through judging.
