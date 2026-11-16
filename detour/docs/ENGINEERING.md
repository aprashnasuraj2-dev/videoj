# DETOUR engineering, verification and media

## API and module boundary

The reusable package exports `detour-video-skin`, `detour-video-skin/styles`, `detour-video-skin/base` and the optional `detour-video-skin/mux` helper. The core is a Video.js v10 custom-element skin over a **host-owned** native media element. No fixture, preview route or Mux management API belongs in the runtime dependency graph.

A normal held position is single-instance and source-scoped. Marker mode optionally exposes up to four checkpoints without consuming them on Return. Ordinary seeking, play state, focus and native text tracks remain authoritative. An in-flight return must not override a newer manual seek.

## Run the checks

```bash
npm ci
npm run build
npm run test:architecture
npm test
DETOUR_ENGINE=firefox npm test
DETOUR_ENGINE=webkit npm test
npm run test:package
node scripts/final-audit.mjs
```

The production audit tests the exact package files, production dependency-license set, public Mux configuration and absence of management secrets in emitted frontend assets. The package excludes `demo/`, `integration/`, `public/`, `tests/`, `scripts/`, and local research.

These tests are automated observations, not evidence of VoiceOver/NVDA or physical-phone certification. Also verify no-chapter/no-caption paths, inaccessible/expired media, low-bandwidth seeking and browser-specific codecs in the actual target environment.

## Public examples and origin separation

- https://detour-entry.aafnaipatro.com/mux/ — checkpoint-enabled hosted example.
- https://detour.aafnaipatro.com/mux/ — separately deployed single-place example.
- https://detour-backup.aafnaipatro.com/ — independently hosted fallback example.

Published routes may point at pinned source revisions rather than the latest repository head. Do not claim live synchronization without checking the deployed source/release manifest and playback.

## Rights and provenance

DETOUR package source is Apache-2.0 with its own `LICENSE`. The public showcase MP4 and captions were authored programmatically for the demo; the source showcase video's recorded SHA-256 is `fa41edd8b8d17a6e0fcb9e3ee4e63513191e4a6850e99ed24df076044e5a87a1`. Test fixtures are separately authored. The generated video is separate from the **source-only** reusable npm pack.

Pinned runtime dependencies retain their own license terms (the previously audited production dependency set uses Apache-2.0, BSD-3-Clause and MIT). The optional public Mux playback configuration contains public IDs only; management tokens must not enter the frontend or a generated archive. Third-party editorial media used outside the DETOUR demo retains source credit and its own terms.

## Restoration boundaries

Retain independent route ownership and storage bindings. Do not infer that the checkpoint example, single-place mirror and backup are identical. Restore from a specifically validated source/dist pair and re-run public playback and keyboard checks after any deploy. Previous dated run identifiers and evidence packets can be retrieved from Git history, without treating them as current documentation.
