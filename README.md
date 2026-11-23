# DHAGO & DETOUR — open-source Video.js player experiences

Two independent, reusable approaches to video navigation, built with **Video.js v10**. Use either player in your own project; the demos illustrate the interaction without being required by the reusable code.

| | [DHAGO](#dhago--woven-time) | [DETOUR](#detour--keep-your-place) |
| --- | --- | --- |
| Core idea | A woven chapter timeline that follows the real media clock | Save a position, explore elsewhere, and return from the same seek rail |
| Reusable source | [`src/`](src/) | [`detour/skin/`](detour/skin/) |
| Integration guide | [`INSTALL.md`](INSTALL.md) | [`detour/README.md`](detour/README.md) |
| Browser examples | [DHAGO Studio](https://creative.aafnaipatro.com/) | [DETOUR checkpoint demo](https://detour-entry.aafnaipatro.com/mux/) |
| Module boundary | TypeScript + Vite-compatible HTML custom elements | Pack-installable native-media component with optional Mux helper |
| Publication | Source integration; not published to npm | `npm pack`; not published to npm |

## DHAGO — woven time

*Dhago* means “thread” in Nepali. Its chapter ribbon uses actual WebVTT cues, a visible seek thumb and familiar playback controls. Linen, Ink and Paper surfaces share one interaction language. Where available, the player can show real buffering and frame-quality observations; unsupported telemetry is omitted, not fabricated.

The original [Studies in Thread](https://creative.aafnaipatro.com/) film is a 64-second procedural motion study, not a prerequisite for using the skin.

**Run DHAGO from the repository root:**

```bash
npm ci
npm run dev
npm run typecheck
npm run build
```

See [installation and host integration](INSTALL.md), [Studio Journal](https://creative.aafnaipatro.com/journal.html), [ribbon example](https://creative.aafnaipatro.com/ribbon.html) and [playback stress lab](https://creative.aafnaipatro.com/stress.html). Browser regression: `npm test` (install the Playwright browsers first).

## DETOUR — keep your place

DETOUR lets viewers hold one position, seek freely and return without losing the original point. The standard API keeps a single held position; hosts can opt into **up to four source-scoped checkpoints** on the seek rail. Live, nonseekable and audio-only media keep ordinary controls without an unavailable Return action.

**Run DETOUR separately:**

```bash
cd detour
npm ci
npm run build
npm run test:architecture
npm test
npm pack
```

See the [package API and examples](detour/README.md), [published checkpoint demo](https://detour-entry.aafnaipatro.com/mux/) and [technical boundaries](detour/docs/ENGINEERING.md). The independent [single-place demonstration](https://detour.aafnaipatro.com/mux/) shows the default interaction.

## Architecture and contribution

The repository root builds **DHAGO**. `detour/` is a separate project with its own `package.json`, dependencies, build, tests, and Apache-2.0 license. Neither reusable player depends on the other's preview site or demo media. Developing one should not silently change the other's runtime, hosted route, or release.

- [Architecture and verification](docs/ARCHITECTURE.md)
- [Contributing](CONTRIBUTING.md)
- [License](LICENSE) and [attribution](NOTICE)
- [Security guidance](SECURITY.md)

Both are open-source source distributions, not official Video.js skins or npm registry releases. Browser, media-decoder and device behavior varies; consult the integration constraints before deploying. Prior planning records are preserved in version history, rather than treated as current product instructions.

## SUTRA - planned agentic learning companion

The active [SUTRA workspace](docs/sutra/README.md) contains the user-requested [detailed checklist](docs/sutra/CHECKLIST.md), [progress register](docs/sutra/PROGRESS.md) and [continuation procedure](docs/sutra/CONTINUE.md) for the Open Agentic Web Challenge. Say **“continue with sutra”** to resume from verified repository status and carry out the next dependency-ready task.

At tracker bootstrap this is a planned separate application, not a shipped player or public agent service. Use the register for the current implementation/release state. Existing DHAGO and DETOUR boundaries remain as documented above.
