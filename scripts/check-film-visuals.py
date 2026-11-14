#!/usr/bin/env python3
"""Artifact-based visual regression for DHAGO's original textile film.

Uses FFmpeg and the Python standard library only. Samples actual encoded pixels,
not source-code palettes or mocked animation states. This is intentionally
not a subjective certification of artistic quality or cultural authenticity.
"""
import argparse
import json
import subprocess
from pathlib import Path

WIDTH, HEIGHT = 1280, 720


def frame(path, seconds):
    command = [
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(seconds),
        '-i', str(path), '-frames:v', '1', '-f', 'rawvideo',
        '-pix_fmt', 'rgb24', '-',
    ]
    decoded = subprocess.check_output(command)
    if len(decoded) != WIDTH * HEIGHT * 3:
        raise RuntimeError(f'No complete {WIDTH}x{HEIGHT} frame at {seconds}s')
    return decoded


def chroma(decoded):
    # Restrict to textile stage, away from the film's lower-left editorial text.
    # Sample every third pixel for stable, cheap cross-platform comparisons.
    red = blue = count = 0
    for y in range(140, 560, 2):
        for x in range(100, 1180, 3):
            index = (y * WIDTH + x) * 3
            r, g, b = decoded[index:index + 3]
            count += 1
            if r > 125 and r > g * 1.25 and r > b * 1.25:
                red += 1
            if b > 85 and b > r * 1.17 and b > g * 1.05:
                blue += 1
    return {'warm_thread': round(red / count, 5),
            'indigo_thread': round(blue / count, 5)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    args = parser.parse_args()
    media = Path(args.source)
    if not media.is_file():
        raise SystemExit(f'Missing encoded source: {media}')
    early = chroma(frame(media, 35))
    late = chroma(frame(media, 45))
    cloth = chroma(frame(media, 53))
    result = {
        'loom_35s': early,
        'loom_45s': late,
        'cloth_53s': cloth,
        'motion_ink_growth': round(late['warm_thread'] - early['warm_thread'], 5),
    }
    print(json.dumps(result, indent=2))
    if cloth['warm_thread'] < .014 or cloth['indigo_thread'] < .014:
        raise SystemExit('Finished fabric lost its patterned warm/indigo woven threads')
    if result['motion_ink_growth'] < .005:
        raise SystemExit('Interlacing scene lost progressive woven-thread motion')
    print('Verified encoded film contains a growing weave and distinct cloth accents.')


if __name__ == '__main__':
    main()
