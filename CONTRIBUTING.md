# Contributing to DHAGO

Contributions to accessibility, reliable media behavior, compact player UI and source-level portability are welcome. Changes should remain narrowly scoped and testable.

## Development

| Project | Working directory | Editable player implementation | Core verification |
| --- | --- | --- | --- |
| DHAGO | repository root | `src/` | `npm run typecheck && npm run build && npm test` |

Use Node.js 24. Run `npm ci` in the relevant directory. Browser tests need the Playwright engines installed; some media tests also need FFmpeg. Do not modify generated outputs or commit credentials.

Make one focused change, document the behavior or compatibility limit, run the relevant checks and include reproducible steps and screenshots when altering UI behavior. For accessibility changes, report actual devices/assistive technology tested separately from browser emulation.

## Design constraints

Keep native playback state truthful. Do not invent chapters, bandwidth switching, dropped frames or a seekable Return state. Preserve keyboard and reduced-motion behavior, native captions, and the ordinary seek model. A hosting page, demo video or service-specific token must not become a dependency of the reusable player.

DHAGO supports source adoption and is not advertised as a published npm package. Review [architecture](docs/ARCHITECTURE.md) and the project-specific README before proposing API changes.

## Releases and licensing

The code is Apache-2.0, subject to the license and attribution files. Media and dependencies retain their own provenance and licensing. Source contributions are not permission to upload unrelated media or publish to an existing production domain. Record exactly what was tested and which version was shipped.
