"""Command line: python -m newsroom --help."""
from __future__ import annotations
import argparse
import json
import shutil
import sys
from pathlib import Path
from .pipeline import build, voice_path, ffprobe_duration
from .timing import import_timestamps
from .validation import load, source_ledger, ManifestError
from .i18n import verify_text_engine, language
from .review_gate import build_review_pack, check_release


def cli(argv=None):
    p=argparse.ArgumentParser(prog='newsroom',description='Reproducible, evidence-led vertical news video generator')
    c=p.add_subparsers(dest='command',required=True)
    init=c.add_parser('new',help='Create language-specific starter JSON project (no network)');init.add_argument('target',type=Path);init.add_argument('--language',choices=['en','ne','ne-en'],default='en')
    val=c.add_parser('validate',help='Validate editorial evidence + manifest');val.add_argument('project',type=Path)
    pre=c.add_parser('preflight',help='Check video and voice dependencies');pre.add_argument('project',type=Path);pre.add_argument('--voice',type=Path)
    stamp=c.add_parser('timing',help='Import exact character or word timestamps for English/Nepali narration');stamp.add_argument('project',type=Path);stamp.add_argument('timestamps',type=Path);stamp.add_argument('output',type=Path);stamp.add_argument('--srt',type=Path,help='Export truly aligned SRT (voice-relative timestamps)')
    ren=c.add_parser('render',help='Render a new MP4 with voice, captions, music and QA');ren.add_argument('project',type=Path);ren.add_argument('--voice',type=Path);ren.add_argument('--out',type=Path);ren.add_argument('--subs',type=Path,help='Real aligned SRT file (recommended)');ren.add_argument('--preview',action='store_true');ren.add_argument('--strict',action='store_true',help='Require exact scene cues or aligned SRT');ren.add_argument('--workers',type=int,default=2)
    pack=c.add_parser('review-pack',help='Create offline Nepali/English storyboard, voice audition and 14s opening BEFORE full export')
    pack.add_argument('project',type=Path);pack.add_argument('--voice',type=Path)
    pack.add_argument('--subs',type=Path);pack.add_argument('--out',type=Path,required=True)
    pack.add_argument('--seconds',type=float,default=14)
    gate=c.add_parser('release-check',help='Refuse publication without human editorial, voice, text, sources and asset-hash signoff')
    gate.add_argument('project',type=Path);gate.add_argument('--voice',type=Path,required=True)
    gate.add_argument('--subs',type=Path,required=True);gate.add_argument('--opening',type=Path,required=True)
    gate.add_argument('--approval',type=Path,required=True);gate.add_argument('--video',type=Path)
    ren.add_argument('--release',action='store_true',help='Require release signoff BEFORE and AFTER full 1080p render')
    ren.add_argument('--approval',type=Path,help='Human-signed approval JSON from review-pack')
    ren.add_argument('--review-opening',type=Path,help='Short audition MP4 from review-pack')
    args=p.parse_args(argv)
    try:
        if args.command=='new':
            name='example_ai_bubble_ne.json' if args.language in {'ne','ne-en'} else 'example_ai_bubble.json'
            sample=Path(__file__).parent/'templates'/name
            if args.target.exists():p.error(f'Refusing to overwrite {args.target}')
            args.target.parent.mkdir(parents=True,exist_ok=True)
            data=json.loads(sample.read_text(encoding='utf-8'))
            data['metadata']['language']=args.language
            args.target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            print(f'Created {args.language} starter {args.target}; replace topic, figures, sources, script and voice file.')
        elif args.command=='validate':
            obj=load(args.project)
            typography=verify_text_engine(language(obj['metadata']))
            print(json.dumps({'valid':True,'scene_count':len(obj['scenes']),'source_count':len(obj['sources']),'cutoff':obj['metadata']['as_of'],'typography':typography},indent=2))
        elif args.command=='preflight':
            obj=load(args.project)
            print('Typography:',json.dumps(verify_text_engine(language(obj['metadata']))))
            print(f'FFmpeg: {shutil.which("ffmpeg") or "NOT INSTALLED"}\nFFprobe: {shutil.which("ffprobe") or "NOT INSTALLED"}')
            try:
                v=voice_path(obj,args.project,args.voice)
                print(f'Natural narration supplied: {v}\nDuration: {ffprobe_duration(v):.2f}s')
            except FileNotFoundError as e:print(str(e));return 2
            return 0
        elif args.command=='timing':
            print(json.dumps(import_timestamps(args.project,args.timestamps,args.output,args.srt),indent=2))
        elif args.command=='review-pack':
            result=build_review_pack(args.project,args.out,voice=args.voice,subs=args.subs,seconds=args.seconds)
            print(json.dumps(result,ensure_ascii=False,indent=2))
            return 0 if result['mechanical_passed'] else 2
        elif args.command=='release-check':
            result=check_release(args.project,args.voice,args.subs,args.opening,args.approval,args.video)
            print(json.dumps(result,ensure_ascii=False,indent=2))
            return 0 if result['release_ready'] else 2
        elif args.command=='render':
            if args.release:
                if args.preview or not args.strict or not all((args.voice,args.subs,args.approval,args.review_opening)):
                    raise ValueError('--release requires --strict, --voice, --subs, --approval, --review-opening and forbids --preview')
                review=check_release(args.project,args.voice,args.subs,args.review_opening,args.approval)
                if not review['release_ready']:
                    print(json.dumps(review,ensure_ascii=False,indent=2),file=sys.stderr)
                    return 2
            report=build(args.project,output=args.out,voice_override=args.voice,preview=args.preview,strict=args.strict,workers=args.workers,subs=args.subs)
            if args.release:
                product=Path(report['file'])
                verdict=check_release(args.project,args.voice,args.subs,args.review_opening,args.approval,product)
                if not verdict['release_ready']:
                    raise ValueError('Post-render publication review failed: '+str(verdict['issues']))
                report['human_signoff_verified_against_files']=True
            print(json.dumps(report,indent=2));return 0
        return 0
    except (ManifestError, ValueError, FileNotFoundError, RuntimeError, OSError) as e:
        print(f'ERROR: {e}',file=sys.stderr)
        return 2

if __name__=='__main__':raise SystemExit(cli())