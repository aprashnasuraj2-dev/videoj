"""Command line: python -m newsroom --help."""
from __future__ import annotations
import argparse
import json
import shutil
import sys
from pathlib import Path
from .pipeline import build, voice_path, ffprobe_duration
from .timing import import_heygen_timestamps
from .validation import load, source_ledger, ManifestError


def cli(argv=None):
    p=argparse.ArgumentParser(prog='newsroom',description='Reproducible, evidence-led vertical news video generator')
    c=p.add_subparsers(dest='command',required=True)
    init=c.add_parser('new',help='Create a starter JSON project from template (no network)');init.add_argument('target',type=Path)
    val=c.add_parser('validate',help='Validate editorial evidence + manifest');val.add_argument('project',type=Path)
    pre=c.add_parser('preflight',help='Check video and voice dependencies');pre.add_argument('project',type=Path);pre.add_argument('--voice',type=Path)
    stamp=c.add_parser('timing',help='Add exact per-scene cues from HeyGen character timestamps');stamp.add_argument('project',type=Path);stamp.add_argument('timestamps',type=Path);stamp.add_argument('output',type=Path);stamp.add_argument('--srt',type=Path,help='Export truly aligned SRT (voice-relative timestamps)')
    ren=c.add_parser('render',help='Render a new MP4 with voice, captions, music and QA');ren.add_argument('project',type=Path);ren.add_argument('--voice',type=Path);ren.add_argument('--out',type=Path);ren.add_argument('--subs',type=Path,help='Real aligned SRT file (recommended)');ren.add_argument('--preview',action='store_true');ren.add_argument('--strict',action='store_true',help='Require exact scene cues or aligned SRT');ren.add_argument('--workers',type=int,default=2)
    args=p.parse_args(argv)
    try:
        if args.command=='new':
            sample=Path(__file__).parent/'templates'/'example_ai_bubble.json'
            if args.target.exists():p.error(f'Refusing to overwrite {args.target}')
            args.target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(sample,args.target)
            print(f'Created starter {args.target}; replace topic, figures, sources, script and voice file.')
        elif args.command=='validate':
            obj=load(args.project)
            print(json.dumps({'valid':True,'scene_count':len(obj['scenes']),'source_count':len(obj['sources']),'cutoff':obj['metadata']['as_of']},indent=2))
        elif args.command=='preflight':
            obj=load(args.project)
            print(f'FFmpeg: {shutil.which("ffmpeg") or "NOT INSTALLED"}\nFFprobe: {shutil.which("ffprobe") or "NOT INSTALLED"}')
            try:
                v=voice_path(obj,args.project,args.voice)
                print(f'Natural narration supplied: {v}\nDuration: {ffprobe_duration(v):.2f}s')
            except FileNotFoundError as e:print(str(e));return 2
            return 0
        elif args.command=='timing':
            print(json.dumps(import_heygen_timestamps(args.project,args.timestamps,args.output,args.srt),indent=2))
        elif args.command=='render':
            report=build(args.project,output=args.out,voice_override=args.voice,preview=args.preview,strict=args.strict,workers=args.workers,subs=args.subs)
            print(json.dumps(report,indent=2));return 0
        return 0
    except (ManifestError, ValueError, FileNotFoundError, RuntimeError, OSError) as e:
        print(f'ERROR: {e}',file=sys.stderr)
        return 2

if __name__=='__main__':raise SystemExit(cli())