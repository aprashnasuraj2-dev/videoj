# Candidate register and scoring

2026-11-15. The [public sample and direct reviews](../submission-report/COMPETITION.md) refresh the brief. The source scores are retained where the same mechanism still applies. Raw = sum of rating (0–10) × weight ÷ 10. Adjusted = raw minus collision / gimmick / media dependency / unclear interaction points. Ties use higher raw score.

Rating column order: originality 18, signature 16, recognizability 12, playback 12, reuse 10, usability 8, accessibility 6, mobile 5, engineering 5, storytelling 4, bonuses 2 and feasibility 2. Each concept gets the same baseline transport and actual provider playback assumptions. Scores are internal design judgments.

| Rank | Concept | Raw | Deductions | Net | Ratings | Mechanism and limiting risk |
| ---: | --- | ---: | --- | ---: | --- | --- |
| 01 | Detour | 90.0 | 6 / 1 / 0 / 1 | 82.0 | 9,9,9,9,10,9,9,9,7,9,9,9 | One held origin and a visible Return ticket survive repeated seeks. mpv already supports marked return. This wins only if viewers notice and use it. |
| 02 | Pausepoint | 83.9 | 3 / 2 / 0 / 1 | 77.9 | 9,9,8,8,9,8,8,8,7,8,8,8 | Set a future point where playback will pause once. Ordinary decoding events can miss exact points. A stop must never fire on a manual seek. |
| 03 | Thumbside | 81.5 | 4 / 2 / 0 / 1 | 74.5 | 8,8,8,8,10,8,9,9,6,7,7,8 | Mirror the compact transport to the free thumb while time stays fixed. Could read as a settings toggle with limited desktop value. |
| 04 | Seam Safe | 77.6 | 5 / 2 / 0 / 2 | 68.6 | 8,7,8,8,9,7,7,8,8,8,7,7 | Place each essential touch control clear of a fold or safe-area edge. Distinct benefit depends on device posture or a constrained embed. |
| 05 | Silent Entrance | 78.2 | 4 / 3 / 2 / 1 | 68.2 | 8,8,7,8,9,8,8,8,6,7,7,8 | Offer deliberate caption-first playback in a shared space. Without real captions it loses much of its value. |
| 06 | Recall Line | 78.1 | 5 / 2 / 3 / 1 | 67.1 | 8,8,8,8,7,8,8,8,7,8,7,7 | Replay the last complete timed caption cue via one action. Cue accuracy varies. Mainstream replay-with-subtitles is close. |
| 07 | Speed Zone | 76.9 | 3 / 4 / 0 / 3 | 66.9 | 8,8,8,8,8,7,7,7,8,7,6,6 | Play a selected range at a viewer-set rehearsal speed. Unexpected rate changes may interrupt viewers. |
| 08 | Edge Time | 77.1 | 6 / 4 / 0 / 2 | 65.1 | 8,7,8,8,8,8,8,8,7,7,7,7 | Make actual seekable boundaries operable in a live DVR control. Live data is required. Static media gives the idea little to do. |
| 09 | Nearfield | 84.5 | 16 / 2 / 1 / 2 | 63.5 | 8,9,9,9,9,8,8,8,7,8,8,8 | Expand a small numeric time window while keeping global seek visible. PRISM closely occupies precision seek. YouTube offers precise seek. |
| 10 | Second View | 76.5 | 6 / 2 / 2 / 3 | 63.5 | 8,8,8,8,7,7,7,7,8,8,7,6 | Compare two user-picked times using a two-position switch. Crops need two pieces of context. QA grows around paused return and mobile. |
| 11 | Pace Key | 75.3 | 7 / 4 / 0 / 2 | 62.3 | 7,7,7,8,9,8,8,8,7,7,7,8 | Temporarily slow with a clearly labeled hold-or-toggle control. Holding a control is tiring. It may feel like ordinary speed settings. |
| 12 | Open Step | 76.1 | 7 / 4 / 2 / 1 | 62.1 | 8,7,8,8,7,8,8,8,7,7,7,7 | Mark completed chapter cues visibly in a lesson session. Line and Copybook already visualize progress by chapter. |
| 13 | Read Shelf | 80.9 | 13 / 2 / 3 / 1 | 61.9 | 8,8,8,8,8,9,9,8,7,8,8,8 | Move captions into a fixed line below the image and resize the line. Copybook already docks captions below the picture. |
| 14 | Beat Count | 75.7 | 4 / 3 / 5 / 2 | 61.7 | 8,8,9,7,6,7,7,8,7,8,7,7 | Skip exact beats in a music performance using authored timing cues. Arbitrary music may have tempo changes or no cue map. |
| 15 | Quiet End | 74.6 | 7 / 5 / 0 / 2 | 60.6 | 7,7,7,8,9,8,8,8,6,7,6,8 | Explicitly choose a quiet stop at the end of a clip or chapter. Likely a familiar sleep feature with limited visual identity. |
| 16 | Mark Sheet | 76.2 | 14 / 2 / 0 / 2 | 58.2 | 7,8,8,8,8,8,7,7,7,8,7,7 | Build timestamped notes during review, with direct links back into playback. Chronoscope already builds timestamped notes into the player. |
| 17 | Angle Pair | 74.1 | 5 / 2 / 7 / 2 | 58.1 | 8,8,8,8,5,7,7,7,8,8,6,5 | Switch between synchronized perspectives on the same actual moment. Requires matched media and raises decode and sync cost. |
| 18 | Frame Lock | 75.2 | 10 / 3 / 2 / 3 | 57.2 | 8,8,8,8,7,7,7,6,8,7,6,5 | Inspect paused pixels or compare actual adjacent frames. Hard to make honest cross-browser frame claims. PRISM is nearby. |
| 19 | Preview Ramp | 75.5 | 11 / 3 / 3 / 2 | 56.5 | 8,8,8,8,6,7,7,7,8,8,7,6 | Show trustworthy time-sampled appearance as a chord of thumbnails. GRID and PRISM already make real frame previews central. |
| 20 | Pulse Gap | 73.3 | 6 / 6 / 3 / 2 | 56.3 | 8,7,8,7,7,7,7,7,8,7,7,6 | Expose where the audio waveform actually goes quiet so users can skip. Amplitude is a poor proxy for meaning and silence can be intentional. |
| 21 | Footlight | 72.7 | 10 / 6 / 0 / 1 | 55.7 | 7,6,8,7,9,8,8,8,5,7,7,8 | Use a single focus beam to reveal only the relevant transport group. Farbspur and other minimalist skins are close. Discovery can regress. |
| 22 | Hold Talk | 72.3 | 7 / 4 / 5 / 3 | 53.3 | 8,7,8,7,6,7,7,8,7,7,7,6 | Offer a speaker-change index that seeks on real supplied cue data. Needs labels. Black Box already shows a speaker-lane narrative. |
| 23 | Chapter Compass | 75.6 | 16 / 4 / 2 / 1 | 52.6 | 7,8,8,8,7,8,8,8,6,7,7,8 | Treat real chapters as destinations and show a position relative to them. Line, Wayfinder and Plate make this territory dense. |
| 24 | Cue Search | 75.3 | 18 / 2 / 4 / 1 | 50.3 | 7,8,8,8,6,8,8,7,8,8,7,7 | Turn matches from actual text tracks into seek results. Verbatim and Vocapedia have stronger current competition adjacency. |
| 25 | Tactile Shift | 75.0 | 15 / 7 / 0 / 3 | 50.0 | 7,8,9,7,9,6,6,7,7,8,7,7 | Push a sprung rocker harder to move faster through time. Arcade and Director's Console already own this interaction family. |
| 26 | Group Pulse | 73.8 | 17 / 3 / 2 / 3 | 48.8 | 8,8,8,7,7,7,6,6,8,8,7,4 | Show each viewer in a small synchronized watch room. LOT 66 has a close social mechanism. Sync and moderation add scope. |
| 27 | Pattern Map | 71.3 | 12 / 6 / 3 / 3 | 47.3 | 8,7,9,6,7,6,6,6,7,8,7,6 | Draw a seekable spatial map from authored evidence about the video. Navigation story may overwhelm familiar seeking. Route skins exist. |
| 28 | Current Light | 69.8 | 15 / 7 / 2 / 1 | 44.8 | 7,6,8,6,8,7,7,7,7,8,7,7 | Adapt illuminated shell to sampled actual frame colors. Glowkey and Spill already do scene-reactive treatment. |
| 29 | Tape Scale | 70.9 | 18 / 7 / 0 / 2 | 43.9 | 6,7,8,7,9,7,7,7,6,7,7,7 | Wind a real seek control using a mechanical tape view. FIELD, VHS Rewind and several VCR builds saturate the metaphor. |
| 30 | Physics Flow | 67.7 | 14 / 10 / 0 / 4 | 39.7 | 7,6,9,6,8,6,5,5,8,8,6,4 | Map playback state to particles or simulated material. Particle, ink and tactile entries already exist; browser cost is substantial. |

## Decision pressure test

- **DETOUR (82.0).** mpv already has the technical mechanism. The bet is on visible discoverability and a useful, disposable point in a web player. No track or chapters are required. A new equivalent competitor raises the collision penalty and reopens the choice. A five-point collision increase drops it below the backup.
- **Pausepoint (77.9).** A single deliberate stop at a future time is compact and media-independent. Frame quantization and seeks across the target can cause a surprise stop. Prototype the separation between forward playback and seeking before switching.
- **Thumbside (74.5).** One-handed interaction has clear mobile value but less visible payoff at desktop, and changing layout can disrupt tab progression. The backup choice is stronger for the challenge's player crop and immediate reveal.
- Every nonzero deduction belongs to the four defined categories. Use the row's limiting mechanism, the sampled competitors and the comparison above when changing an individual penalty. Close overlaps include PRISM and Nearfield, Chronoscope and Mark Sheet, Copybook and Read Shelf, and Verbatim and Cue Search.
