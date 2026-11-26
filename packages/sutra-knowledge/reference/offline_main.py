#!/usr/bin/env python3
"""Closed command line for the independent Proof Capsule v1 verifier."""
import argparse
import json
import re
from pathlib import Path
from verify_capsule import verify, read_bytes, refused, FORMAT
from verify_aligned_capsule import verify as verify_aligned, MAX_BYTES as MAX_ALIGNED_BYTES
from verify_trial_snapshot import verify as verify_trial, MAX_BYTES as MAX_TRIAL_BYTES
from verify_reviewed_snapshot import verify as verify_reviewed, MAX_BYTES as MAX_REVIEWED_BYTES
from verify_living_version import verify as verify_living, MAX_BYTES as MAX_LIVING_BYTES
from verify_world_grid import verify as verify_grid, MAX_BYTES as MAX_GRID_BYTES
from verify_investigation_history import verify as verify_history, MAX_BYTES as MAX_HISTORY_BYTES
from verify_robust_acquisition import verify as verify_acquisition, MAX_BYTES as MAX_ACQUISITION_BYTES
from verify_reviewed_interval import verify as verify_interval, MAX_BYTES as MAX_INTERVAL_BYTES
from verify_reviewed_binomial import verify as verify_binomial, MAX_BYTES as MAX_BINOMIAL_BYTES
from verify_reviewed_fisher import verify as verify_fisher, MAX_BYTES as MAX_FISHER_BYTES
from verify_reviewed_question import verify as verify_question, MAX_BYTES as MAX_QUESTION_BYTES
from verify_controlled_roundtrip import verify as verify_roundtrip, MAX_BYTES as MAX_ROUNDTRIP_BYTES
from verify_withdrawal_revision import verify as verify_withdrawal, MAX_BYTES as MAX_WITHDRAWAL_BYTES
from verify_evidence_revision import verify as verify_transaction, MAX_BYTES as MAX_TRANSACTION_BYTES
from verify_semantic_probe_suite import verify as verify_probe_suite, MAX_BYTES as MAX_PROBE_SUITE_BYTES
from verify_evidence_recovery import verify as verify_recovery, MAX_BYTES as MAX_RECOVERY_BYTES
from verify_structural_exposure import verify as verify_exposure, MAX_BYTES as MAX_EXPOSURE_BYTES

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
    profiles=parser.add_mutually_exclusive_group()
    profiles.add_argument('--aligned',action='store_true',help='Explicitly select the caller-pinned aligned capsule profile')
    profiles.add_argument('--trial',action='store_true',help='Explicitly select the research trial snapshot profile')
    profiles.add_argument('--reviewed',action='store_true',help='Explicitly select the reviewed compiler snapshot profile')
    profiles.add_argument('--living',action='store_true',help='Explicitly select exact living investigation version replay')
    profiles.add_argument('--world-grid',action='store_true',help='Explicitly select finite synthetic world grid replay')
    profiles.add_argument('--history',action='store_true',help='Explicitly select bounded living investigation history replay')
    profiles.add_argument('--acquisition',action='store_true',help='Explicitly select finite robust acquisition policy replay')
    profiles.add_argument('--interval',action='store_true',help='Explicitly select reviewed continuous interval replay')
    profiles.add_argument('--binomial',action='store_true',help='Explicitly select conditional binomial arithmetic replay')
    profiles.add_argument('--fisher',action='store_true',help='Explicitly select conditional two-group Fisher arithmetic replay')
    profiles.add_argument('--question',action='store_true',help='Explicitly select restricted reviewed question mapping replay')
    profiles.add_argument('--roundtrip',action='store_true',help='Explicitly select controlled reconstruction replay')
    profiles.add_argument('--withdrawal',action='store_true',help='Explicitly select exact source-withdrawal transformation replay')
    profiles.add_argument('--evidence-transaction',action='store_true',help='Explicitly select atomic multi-source revision replay')
    profiles.add_argument('--evidence-recovery',action='store_true',help='Explicitly select exact immediately preceding evidence recovery replay')
    profiles.add_argument('--exposure',action='store_true',help='Explicitly select declared structural exposure replay')
    profiles.add_argument('--probe-suite',action='store_true',help='Explicitly select exact finite semantic probe review subset')
    parser.add_argument('--ancestor-pin',help='Separately retained pre-revision ancestor digest')
    parser.add_argument('--revision-plan-pin',help='Separately retained preceding atomic revision plan digest')
    parser.add_argument('--policy-pin',help='Separately retained acquisition policy digest')
    parser.add_argument('--version-pin',help='Separately retained living investigation version digest')
    parser.add_argument('--plan-pin',help='Separately retained synthetic grid plan digest')
    parser.add_argument('--contract-pin',help='Separately retained reviewed contract digest')
    parser.add_argument('--source-pin',help='Separately retained normalized trial source digest')
    parser.add_argument('--after-source-pin',help='Separately retained second normalized trial source digest for comparison')
    parser.add_argument('--case-pin',help='Separately retained case SHA-256; required for aligned profile')
    args=parser.parse_args()
    if args.case_pin is not None and not args.aligned:parser.error('--case-pin requires --aligned')
    if (args.source_pin is not None or args.after_source_pin is not None) and not args.trial:parser.error('trial source pins require --trial')
    if args.contract_pin is not None and not (args.reviewed or args.question):parser.error('--contract-pin requires --reviewed or --question')
    if args.version_pin is not None and not (args.world_grid or args.acquisition or args.interval or args.binomial or args.fisher or args.roundtrip or args.withdrawal or args.evidence_transaction or args.evidence_recovery or args.exposure or args.probe_suite):parser.error('version pin requires an applicable profile')
    if args.plan_pin is not None and not (args.world_grid or args.acquisition or args.interval or args.binomial or args.fisher or args.question or args.withdrawal or args.evidence_transaction or args.evidence_recovery or args.probe_suite):parser.error('plan pin requires an applicable profile')
    if (args.ancestor_pin is not None or args.revision_plan_pin is not None) and not args.evidence_recovery:parser.error('ancestor and revision plan pins require --evidence-recovery')
    if args.policy_pin is not None and not args.acquisition:parser.error('--policy-pin requires --acquisition')
    try:
        pin=args.pin if args.pin is not None else load_pin(args.pin_file)
        if args.exposure:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_EXPOSURE_BYTES+1)
            result=verify_exposure(data,pin,args.version_pin)
        elif args.probe_suite:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_PROBE_SUITE_BYTES+1)
            result=verify_probe_suite(data,pin,args.version_pin,args.plan_pin)
        elif args.evidence_recovery:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_RECOVERY_BYTES+1)
            result=verify_recovery(data,pin,args.ancestor_pin,args.revision_plan_pin,args.version_pin,args.plan_pin)
        elif args.evidence_transaction:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_TRANSACTION_BYTES+1)
            result=verify_transaction(data,pin,args.version_pin,args.plan_pin)
        elif args.withdrawal:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_WITHDRAWAL_BYTES+1)
            result=verify_withdrawal(data,pin,args.version_pin,args.plan_pin)
        elif args.roundtrip:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_ROUNDTRIP_BYTES+1)
            result=verify_roundtrip(data,pin,args.version_pin)
        elif args.question:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_QUESTION_BYTES+1)
            result=verify_question(data,pin,args.contract_pin,args.plan_pin)
        elif args.fisher:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_FISHER_BYTES+1)
            result=verify_fisher(data,pin,args.version_pin,args.plan_pin)
        elif args.binomial:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_BINOMIAL_BYTES+1)
            result=verify_binomial(data,pin,args.version_pin,args.plan_pin)
        elif args.interval:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_INTERVAL_BYTES+1)
            result=verify_interval(data,pin,args.version_pin,args.plan_pin)
        elif args.acquisition:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_ACQUISITION_BYTES+1)
            result=verify_acquisition(data,pin,args.version_pin,args.plan_pin,args.policy_pin)
        elif args.history:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_HISTORY_BYTES+1)
            result=verify_history(data,pin)
        elif args.world_grid:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_GRID_BYTES+1)
            result=verify_grid(data,pin,args.version_pin,args.plan_pin)
        elif args.living:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_LIVING_BYTES+1)
            result=verify_living(data,pin)
        elif args.reviewed:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_REVIEWED_BYTES+1)
            result=verify_reviewed(data,pin,args.contract_pin)
        elif args.trial:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_TRIAL_BYTES+1)
            result=verify_trial(data,pin,args.source_pin,args.after_source_pin)
        elif args.aligned:
            with Path(args.capsule).open('rb') as f:data=f.read(MAX_ALIGNED_BYTES+1)
            result=verify_aligned(data,pin,args.case_pin)
        else:result=verify(read_bytes(args.capsule),pin)
    except OSError:
        print(json.dumps(refused('INPUT_UNAVAILABLE'),indent=2))
        return 2
    print(json.dumps(result,indent=2))
    return 0 if result['status']=='VERIFIED' else 1


if __name__=='__main__':
    raise SystemExit(main())
