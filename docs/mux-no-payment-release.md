# DHAGO film v2 — no-payment Mux publication gate

**Status on 2026-11-14:** the new 64-second `FROM FIBRE TO FABRIC` asset is checked in on [PR #13](https://github.com/aprashnasuraj2-dev/videoj/pull/13), but `apps/preview/src/media-fibre.json` has no new playback ID. Old production Mux playback is deliberately preserved. The +2-point Mux bonus is **not** claimed for the new film.

## Why this can be done without Runway

The video is rendered locally using our own deterministic Python/FFmpeg workflow, so there is **no paid AI video generation cost**. [Mux's published Free plan](https://www.mux.com/pricing) provides up to 10 stored video assets and 100,000 delivered minutes/month. A 64-second complete play uses about 1.067 delivered minutes, subject to buffered/partial segments. These are published allowances, not proof of the account's actual plan or remaining quota. Never upgrade to a paid plan, request premium encoding, or order static MP4 renditions for this task.

## One-time owner-only credential configuration

The GitHub connector in this workflow does not expose a repository Actions secrets write operation. Do not paste Mux tokens into workflow inputs, commits, PR comments, CLI arguments, browser JavaScript, HTML, source files, logs, or temporary Cloudflare Workers. Use the signed-in GitHub Settings UI:

1. Open [repository Actions secrets](https://github.com/aprashnasuraj2-dev/videoj/settings/secrets/actions).
2. Add repository secrets named exactly `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET`. Use the **management API token pair**, not a Mux Data analytics environment key. Since the token was previously included in chat, rotate it and use the replacement secret.
3. Verify the Mux account's plan and available asset slots first; no purchase is authorized.
4. Open [Mux fibre-film provisioning workflow](https://github.com/aprashnasuraj2-dev/videoj/actions/workflows/mux-film.yml), select **Run workflow**, choose the feature branch `film/from-fibre-to-fabric-20261114`, and run once. If GitHub does not offer this branch workflow in its UI, use an Actions re-run of the last branch workflow **after** secrets have been added.
5. The workflow checks the encoded source, finds any matching hash-tagged ready asset or unfinished direct upload, refuses creating an 11th asset, uses Basic quality, waits for Ready, then tests decoded HLS play/seek/captions in Chromium. Only then does it write the **public** playback ID and content hash to the film branch.

The workflow does not read tokens from the repository. If any step fails, inspect its *status and sanitized error category*, do not insert credentials into issue comments, and do not force a second upload. `scripts/verify-mux-upload.mjs` provides three offline regressions for existing-asset reuse, pending-upload reuse and the free-plan safety ceiling.

## Mandatory release boundary

Do not merge the film PR or alter production HTML while `media-fibre.json.playbackId` is null. After successful upload, await exact-head PR CI; verify real Mux decoded time advancement, seek to 32 seconds, captions and the actual stream URL with the **new** playback ID. Build a new immutable `dist-<main SHA>` branch and compare every emitted file's SHA-256/bytes against the **dedicated** `dhago-studio-static` bucket. Publish non-HTML objects first; back up existing HTML; publish `index.html` last. Check both DHAGO public hostnames, journal and stress lab. Preserve any existing published file until a fully verified successor is ready.

### Current known static-origin exceptions

At this checkpoint, the latest pre-film `eae52d9e0c9e` manifest listed 84 files. R2 contained 83 matching file **names**, with `media/studies-in-thread.webm` (7,447,211 bytes) absent and `index.html` a different byte length from that staged manifest. Filename/length checks do not prove SHA-256 parity. Do not claim an exact released build or use unrelated Patro Worker/R2 resources.

## Proof required before claiming the competition bonus

A screenshot of a Mux asset or a valid manifest response alone is not sufficient. Evidence must show a Ready asset with a new public ID tied to our exact film hash, real decoded frames/time advancement on the public site, native seek and chapter state, and the running Video.js v10 skin. Document the Mux use in the Contra entry, but never assert bonus points were awarded before the organizers confirm them.

**Fallback if provisioning remains blocked:** keep the previous working, already Mux-streamed submission active rather than switch to an unverified stream. Submit one clear DHAGO entry before the November 16, 2026 11:59pm Pacific deadline; the owner still must confirm terms, rights, identity and final submission receipt.
