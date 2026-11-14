# Film candidate: FROM FIBRE TO FABRIC (64.000 seconds)

This is an **original procedural material film**, not a recording of Nepali artisans or real textile-production footage. It is inspired by the relationship among loose fibres, yarn torsion, warp/weft interlacing and cloth. It does not call sheep wool Chyangra pashmina, label Kashmir as Nepal, or claim to depict a specific Dhaka weaving method.

## Delivered and reproducible

- Source generator: `scripts/create-film-v2.py`, deterministic random seeds; Pillow, NumPy, OpenCV, FFmpeg
- CI production: [render workflow](../.github/workflows/render-fibre-to-fabric.yml) creates and validates both encoded renditions. Original `studies-in-thread.mp4` is retained.
- New media (feature-branch only pending review): `media/from-fibre-to-fabric.mp4` (H.264/AAC, 1280×720, 24 fps), `.webm` (VP9/Opus, 1280×720, 24 fps), and source-derived poster
- Source-specific [chapters](../apps/preview/public/media/from-fibre-to-fabric-chapters.vtt) and [captions](../apps/preview/public/media/from-fibre-to-fabric-captions.vtt)
- `scripts/generate-storyboard.py` extracts *64 actual encoded frames* at 1-second intervals and creates sprite + VTT, not fake thumbnails
- `scripts/compile-weave.mjs` samples the new encoded film's midpoints and chapter audio independently; metadata never crosses over to the legacy Mux film

## Exact four chapter intervals

1. 00:00–00:16 — Raw fibre
2. 00:16–00:32 — Twist into thread
3. 00:32–00:48 — Warp meets weft
4. 00:48–01:04 — Cloth holds time

Audio is an original synthesized studio sound design, not location field recording. No externally sourced film, soundtrack, image, voice, or rights-managed stock is embedded. No Runway or paid generative-video account is required. Apache-2.0 repository terms apply to the authored code/assets, subject to owner confirmation of competition declarations.

## Acceptance and truthful deployment

Open `/?film=fibre` from the Vite site to inspect the candidate. This opt-in **uses the exact local MP4 / VP9 compatibility rendition and local thumbnail VTT**, not the previous original film's Mux stream. The ordinary root remains the verified legacy Mux presentation until the new film receives creative acceptance, new Mux provisioning, exact-head CI, R2 integrity verification, and final public smoke.

**Not yet established:** documentary authenticity, real-device and assistive-technology acceptance, new Mux asset, public deployment of this revision, final cover/screenshots, or contest submission receipt. Do not mark the submission technically ready based on source generation alone.

## Rebuild

```sh
python3 -m pip install numpy pillow opencv-python-headless
python3 scripts/create-film-v2.py --out .generated-film --webm
npm ci
npm run prepare:storyboard
npm run prepare:weave
npm run typecheck
npm run build
npm test
```

The public demo remains on its previous verified film until all release gates pass. Avoid uploading the film twice or replacing a Mux playback ID with an unrelated video's ID.
