# DHAGO media and attribution

The canonical demo uses the project-authored **Studies in Thread**, a 64-second procedural film with synthesized sound, no dialogue, descriptive captions and four real chapter cues.

| Role | Maintained file |
| --- | --- |
| Canonical MP4 | `apps/preview/public/media/studies-in-thread.mp4` |
| Compatibility WebM | `apps/preview/public/media/studies-in-thread.webm` |
| Film poster | `apps/preview/public/media/dhago-studies-poster.svg` |
| Chapters | `apps/preview/public/media/chapters.vtt` |
| Captions | `apps/preview/public/media/captions.vtt` |
| Source generator | `scripts/create-film.py` (Pillow/NumPy/FFmpeg) |
| Chapter weave metadata | `scripts/compile-weave.mjs` |

The 64-second film has boundaries at 0, 16, 32 and 48 seconds. Its chapters are *A thread of light*, *The shape of quiet*, *Where shadows gather* and *Coming home*. DHAGO reads actual cues; the reusable player does not require this particular demo film.

Canonical source checks verify original media hashes, including WebM SHA-256 `c2e7b6b3c4a699c6fa9010245b5c42a90ff93f65c25a1e6a61bf621ea2e7ed39`. The public Mux playback ID, when provided, is a playback identifier rather than a management secret; it does not replace the verified local MP4/WebM path.

Older documentary experiments and one-time video replacement assets were removed from the active source tree. They remain recoverable through historical commits but are not part of the distributed demo. Do not add unlicensed footage or assume project-source Apache-2.0 covers all third-party media. See [NOTICE](../NOTICE) and [LICENSE](../LICENSE).
