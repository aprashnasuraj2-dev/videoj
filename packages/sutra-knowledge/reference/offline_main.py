#!/usr/bin/env python3
"""Closed command line for the independent Proof Capsule v1 verifier."""
import argparse
import json
import re
from pathlib import Path
from verify_capsule import verify, read_bytes, refused, FORMAT

PIN_FILE = re.compile(rb'sha256:[a-f0-9]{64}(?:\r?\n)?', re.ASCII)


def load_pin(path):
    with Path(path).open('rb') as f:
        data=f.read(74) # 71 digest characters + optional CRLF; extra byte refuses
    if not PIN_FILE.fullmatch(data):
        return ''
    return data.rstrip(b'\r\n').decode('ascii')


def main():
    parser=argparse.ArgumentParser(description='Verify a SUTRA Proof Capsule v1 offline against a separately trusted digest. No freshness or empirical-truth claim.')
    parser.add_argument('--version',action='version',version='SUTRA independent offline verifier / '+FORMAT)
    parser.add_argument('capsule',help='Exact exported JSON bytes')
    pins=parser.add_mutually_exclusive_group(required=True)
    pins.add_argument('--pin',help='Independently retained sha256:<64 lowercase hex>')
    pins.add_argument('--pin-file',help='Separately retained ASCII digest file; never auto-derived from the capsule')
    args=parser.parse_args()
    try:
        pin=args.pin if args.pin is not None else load_pin(args.pin_file)
        result=verify(read_bytes(args.capsule),pin)
    except OSError:
        print(json.dumps(refused('INPUT_UNAVAILABLE'),indent=2))
        return 2
    print(json.dumps(result,indent=2))
    return 0 if result['status']=='VERIFIED' else 1


if __name__=='__main__':
    raise SystemExit(main())
