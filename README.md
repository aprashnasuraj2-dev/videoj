# SUTRA 2.0 — a debugger for conclusions

SUTRA is a debugger for conclusions. Product objective: falsification-first investigative reasoning and reproducibility. Trust/runtime infrastructure: consent, causal integrity, monotonic witnesses, compensation and bounded recovery, as a separate second act. Competition objective: attack a conclusion, expose declared ancestry, compute what survives and a decisive next observation, then verify a portable Proof Capsule offline. No paid inference required.

[Active V2 workspace](docs/sutra-v2/README.md) · [Roadmap](docs/sutra-v2/ROADMAP.md) · [Continuation](docs/sutra-v2/CONTINUE.md)

The independent Video.js projects below remain reusable and are not dependencies of the SUTRA conclusion debugger.

## DHAGO & DETOUR — open-source Video.js player experiences

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

## SUTRA 2.0 — active engineering workspace

The active SUTRA product workspace is [`docs/sutra-v2/`](docs/sutra-v2/README.md): [continuation procedure](docs/sutra-v2/CONTINUE.md), [active roadmap](docs/sutra-v2/ROADMAP.md), [checklist](docs/sutra-v2/CHECKLIST.md), [machine progress cursor](docs/sutra-v2/progress.json), and [session evidence](docs/sutra-v2/SESSIONS.md). Say **“continue with sutra”** to reconcile the latest remote SUTRA branch/PR and continue the next dependency-ready V2 engineering task.

The original [`docs/sutra/`](docs/sutra/README.md) workspace is preserved as the SUTRA1 historical baseline, evidence register, and reusable implementation source; it is **not** the current product priority queue. `apps/sutra` is the legacy learner/runtime base and `apps/sutra-v2` is the current V2 browser laboratory. The static Pages candidate now targets V2; the legacy release materializer remains a compatibility gate. Passing candidate CI is not release authorization.

Existing DHAGO and DETOUR boundaries remain independent. No SUTRA deployment, DNS cutover, paid inference, release, or competition submission is implied by development progress.
