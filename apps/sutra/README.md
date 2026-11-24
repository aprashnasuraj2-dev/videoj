# SUTRA isolated learner and runtime spike

A local, synthetic learning workspace with receipt validation, searchable native-media transcript cues, deliberate source comparison, local review exports and explicit peer-consent testing. It is not a funded live-AI service, a finished agentic website or a public deployment.

```sh
cd apps/sutra
npm ci
npm run build
npm test
npm run dev
```

Node >=22.12; Vite is pinned to 8.3.4 in this package/lockfile. Output remains apps/sutra/dist. Root DHAGO dist and detour/dist are independent. No preview or DETOUR source/media is imported.

## Reusable runtime

packages/sutra-runtime vendors ten unchanged nsDeploy reference modules at commit 486ecf26aa8775963f9b765f894734bef1ac9817, with Apache-2.0 license and a drift-check inventory. The restricted host validates schemas, source identity, execution budgets and fixed caller-approved model selection before dispatch. The graph, manifest and links are published under public/agents. External peers/MCP remain **default-deny**; the optional workbench uses a consent inspector to fetch data-only peer artifacts, and a separately injected fixed-schema JSON-only read MCP adapter is available for controlled tests. Coded/REST execution and funded inference remain disabled.

“Run scripted network test” exercises real reference-loop delegation from learner to evidence using an explicit deterministic test driver. The UI and trace name that mode; it is not live AI or factual verification. See packages/sutra-runtime/README.md for the API, limits and remaining integration surface.

## Player and timing fixture

The lazy player-adapter.js imports only the existing src/create-player.ts surface and its reusable dependencies. @videojs/html and the optional Mux build peer are pinned to 10.4.0 here. Vite dedupe resolves shared-source imports from this app's own dependencies; no root npm install is needed. Mux's optional chunk is built because the shared player supports it, but is not used by the native timing fixture.

The silent eight-second MP4 is a generated timing marker, not instructional content or the entrant's submission video. tools/make-timing-fixture.py regenerates it with FFmpeg and refreshes media/cue hashes. Byte-identical encoding depends on the FFmpeg build; metadata binds the bytes actually generated. Before mount, the app checks downloaded bytes and loads a local Blob of that exact content. Actual native metadata/currentTime/seeking are authoritative. A failed load/seek never produces a success message. The rights-cleared original lesson remains pending.

## Validation and failure boundaries

“Check example” checks references against a supplied synthetic catalog. “Try altered quotation” returns QUOTE_MISMATCH. Catalog consistency does not establish factual truth, publisher trust, semantic support or operational safety. No keys, third-party analytics, hosted writes or paid model requests exist in this shell. Dynamic text is set with textContent.

npm test checks build/source boundaries, published graph parity and actual fixture hashes. npm run test:browser uses Chromium for the learner flow, standalone consent, two-origin peer composition and independent cross-origin controlled MCP fixture. It verifies native decode/play/pause/seek, cue search and keyboard navigation, comparison states, bounded JSON exports, consent denial and 360px overflow. Run npx playwright install --with-deps chromium first in a capable environment. Local Chromium is blocked by this execution environment's socket restriction; CI owns browser verification. Physical hardware, Firefox/Safari and human visual review remain separate unverified gates.

## Reviewed local cards

The synthetic timing receipt can be previewed before a user-confirmed local save. The controller owns an immutable receipt copy and consumes the proposal ID before attempting persistence. Duplicate confirmation cannot repeat a completed write. Cancellation writes nothing. A generic failure after a write begins is reported as unknown, not definite failure, and is never automatically retried. Known browser quota/security rejections are distinct. Reload and deletion are supported with a maximum of ten synthetic records in this app's dedicated localStorage key. Saved reviews can be explicitly downloaded as validated allowlisted JSON receipts. The export is marked synthetic and unverified and strips extraneous localStorage fields; clicking download does not assert that the browser saved the file. No model-proposed action catalog or hosted write is claimed yet.

## Peer, transcript and comparison workbenches

The peer workbench is optional. Entering a URL makes no contact; an explicit action then displays a real approval dialog separately for the external manifest and graph GETs. Denial leaves the local source and native media available. A valid peer graph is executed in the caller browser with an explicitly scripted model; the site serving public artifacts receives neither prompt text nor a provider key. A user-initiated JSON execution receipt exposes only bounded public agent/origin/approval metadata, not raw messages. The optional synthetic consent preview remains separately labeled as simulated.

The source-scoped transcript becomes available only after the actual eight-second media fixture loads and byte/duration checks pass. Search, no-results, keyboard cue navigation, active native-time highlighting and translated-wording labels are implemented. No auto-follow scroll or fake progress clock is used.

The comparison panel defaults to a **missing guide claim**: loading a peer graph is not equivalent to fetching a rights-cleared written lesson. A separate, explicitly hypothetical two-source conflict demonstrates an unresolved disagreement rather than inventing consensus. Provenance and date **basis** are shown distinctly from factual credibility.

## Important acceptance gaps

The branch's synthetic and loopback demonstrations do not prove actual independent HTTPS interoperability, publisher trust, original-lesson rights, a factual-review process, real model accuracy, production browser CORS, human user research, hardware coverage or external builder adoption. A real default funded model and approved service budget are still participant-owned inputs. Keep public deployment and official Devpost filing closed until the major checklist gates have current evidence.

## Rollout retention (development / pre-release)

SUTRA keeps mutable pointers and immutable content separate. A future rollout that must keep a stale client working can merge immutable files from the immediately previous static build into the newly built directory:

```bash
npm run rollout:retain -- --previous /path/to/previous-dist --next ./dist
```

The helper copies only:

- Vite-style hashed files under `assets/`;
- content-addressed network graphs under `agents/v/<git-blob-sha>/...`, after verifying the directory hash matches the graph bytes.

It deliberately does **not** copy `index.html`, `agents/agent-manifest.json`, canonical `agents/*.network.json`, media, API responses, credentials or other mutable pointers. If the same immutable path exists with different bytes, the helper fails instead of overwriting it. This is a local rollout mechanism and test fixture; it is not evidence that Cloudflare has retained a previous production deployment.


### Zero-model source question mode

The learner includes an explicit **Ask locally** path implemented in `src/local-answer.js`. A bounded lexical index over the already verified source catalog provides exact source cue receipts, seek and review actions without any model call, account, added dependency, or request after the initial content loads. Questions are matched by shared normalized source tokens; it deliberately abstains on unsupported wording, insufficient overlap, and near-equal source matches. It does **not** generate summaries, reason semantically, evaluate factual correctness, or replace review. The existing exact-phrase source search stays available if the local index hits its bounded limit. The optional provider lane is separate.
