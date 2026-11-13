# DHAGO judging rehearsal — 2026-11-13

**Purpose:** identify the weaknesses most likely to reduce the Video.js Skins Design Challenge score, not predict the judges or assert a first-place finish. The official brief assigns visual/originality 10, usability 5, accessibility 5, execution/polish 5 and possible bonus evidence worth 2 points. The active entry deadline remains Nov 16, 11:59pm PST, as recorded in `docs/brief.md`.

## Evidence-based design assessment

| Criterion | What has been demonstrated | First-prize risk / counterexample | Next action |
| --- | --- | --- | --- |
| Visual & originality (10) | Original 64s procedural film; plain-weave ribbon with chapter-specific coloured inlay; materially related chapter cards and journal margin; consistent Linen/Ink/Paper surfaces | A novelty-heavy entry may be more immediately conspicuous. A beautifully typeset landing page does **not** establish a unique skin if the player crop looks generic | Lead submitted imagery with the player, readable ribbon, seeking thumb and genuine current chapter; avoid extra ornament outside it |
| Usability (5) | Actual play/pause, seek, volume, speed, captions, fullscreen; 320/375/768/1280 layouts; touch-emulation checks; end-frame state correction | User may not discover secondary controls at first glance; no timed unaided first-use trial yet | Owner runs a 5-action phone trial without instructions |
| Accessibility (5) | Keyboard focus order, focus return, 44px targets, scoped axe scans, 200% text, forced colours, descriptive captions, reduced-motion, opaque shelf | Automated success is **not** VoiceOver/NVDA proof; one browser without H.264/AAC support cannot play either the original MP4 or HLS | Run the exact `docs/owner-review.md` manual protocol in a real browser and screen reader |
| Execution & polish (5) | Source CI 35/35; current public Chrome smoke 2/2 played Mux after exact-publish; full 78-asset R2 release verified by 76 SHA-256 text matches and two binary MD5/size matches; previous entry points retained | Source parity does **not** prove codec support in every judge browser. External automation lacked decoders for both media paths | Postrelease Chrome smoke and journal seek passed; confirm hardware/browser and assistive-technology behavior separately; keep old build for rollback |
| Mux bonus | Public Mux playback ID is actually the requested `.m3u8`; CI verified decoded playback and chapter seeking | A visible Mux logo or a fetched manifest is insufficient if media never advances | Record current live run and playback ID in manifest |
| Real-site bonus | Separate annotated Studio Journal lives on the public site and reuses the same skin with working scene-note links | Judges may consider a companion competition showcase less independent than an existing unrelated publication | Describe it truthfully as a live documentary journal, not as evidence judges have approved the bonus |

## Rejected alternative

A highly animated loom with a custom gesture grammar might draw immediate attention, but it would introduce at least one new navigation model, broaden motion/assistive-tech testing, and compete with the footage. We kept a conventional, accurate seek thumb as the interaction anchor and used coloured warp/weft patterns to make the **real timeline** distinctive. This is an engineering trade-off, not a claim that quiet design guarantees superior judging.

## Freeze discipline

No speculative quality selector, fake waveform or invented audience stats. No extra Mux upload merely to change a poster. Prefer closing public playback and human accessibility gaps over feature expansion. Exact parity is recorded in `submission/manifest.json`; judging and owner account confirmations remain outstanding.

References: [Video.js skin guidance](https://videojs.org/docs/framework/html/guides/build-your-own-skin), [official challenge](https://contra.com/community/topic/videojsskinschallenge/guidelines).
