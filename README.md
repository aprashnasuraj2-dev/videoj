# DHAGO — open-source Video.js player experience

A reusable woven chapter timeline built with **Video.js v10**. The demonstration app is not required by the reusable player.

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

## Architecture and contribution

The repository root builds DHAGO. Reusable player code lives in `src/`; the demonstration app lives in `apps/preview/`.

- [Architecture and verification](docs/ARCHITECTURE.md)
- [Contributing](CONTRIBUTING.md)
- [License](LICENSE) and [attribution](NOTICE)
- [Security guidance](SECURITY.md)

DHAGO is an open-source source distribution, not an official Video.js skin or npm registry release. Browser, media-decoder and device behavior varies; consult the integration constraints before deploying.
