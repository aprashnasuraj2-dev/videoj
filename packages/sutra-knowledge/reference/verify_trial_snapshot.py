#!/usr/bin/env python3
"""Independent portable trial snapshot replay. Both source and report pins are caller-held."""
import re
from hashlib import sha256
from verify import canonical,keys
from verify_capsule import wire
from verify_conflict import rawhash
from verify_trial_partition import VERSION,reconstruct_partition,reconstruct_comparison
MAX_BYTES=262144
PIN=re.compile(r'sha256:[a-f0-9]{64}',re.ASCII)
def valid(x):return isinstance(x,str) and PIN.fullmatch(x) is not None
def reject(reason):return dict(status='REFUSED',reason=reason)
def verify(data,expected_digest,source_pin,after_pin=None):
    if not valid(expected_digest):return reject('PIN_REQUIRED')
    if not valid(source_pin):return reject('SOURCE_PIN_REQUIRED')
    if after_pin is not None and not valid(after_pin):return reject('AFTER_SOURCE_PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return reject('SIZE_OR_TYPE')
    digest='sha256:'+sha256(data).hexdigest()
    if digest!=expected_digest:return reject('PIN_MISMATCH')
    try:b=wire(data.decode('utf-8',errors='strict'),32)
    except (ValueError,TypeError,UnicodeError,RecursionError):return reject('WIRE_REFUSED')
    if not isinstance(b,dict) or b.get('version')!=VERSION or b.get('kind') not in ('partition','comparison'):return reject('TRIAL_SCHEMA')
    if b['kind']=='partition':
        if after_pin is not None:return reject('SOURCE_PIN_PROFILE')
        if not keys(b,('version','kind','sourceText','result')) or not isinstance(b['sourceText'],str) or not isinstance(b['result'],dict) or b['result'].get('mode') not in ('aggregate','partition'):return reject('TRIAL_SCHEMA')
    else:
        if not valid(after_pin):return reject('AFTER_SOURCE_PIN_REQUIRED')
        if not keys(b,('version','kind','beforeText','afterText','result')) or not isinstance(b['beforeText'],str) or not isinstance(b['afterText'],str):return reject('TRIAL_SCHEMA')
    try:
        source=b['sourceText'] if b['kind']=='partition' else b['beforeText']
        def source_hash(t):
            data=t.encode('utf-8',errors='strict')
            if not 1<=len(data)<=MAX_BYTES:raise ValueError('source size')
            return rawhash(t)
        if source_hash(source)!=source_pin:return reject('SOURCE_PIN_MISMATCH')
        if b['kind']=='comparison' and source_hash(b['afterText'])!=after_pin:return reject('AFTER_SOURCE_PIN_MISMATCH')
        replayed=reconstruct_partition(source,source_pin,b['result']['mode']) if b['kind']=='partition' else reconstruct_comparison(source,source_pin,b['afterText'],after_pin)
        if canonical(replayed)!=canonical(b):return reject('REPLAY_MISMATCH')
        return dict(status='VERIFIED',snapshotDigest=digest,sourceDigest=source_pin,afterSourceDigest=after_pin,kind=b['kind'],conclusion=replayed['result']['universalObservedLower'] if b['kind']=='partition' else replayed['result']['independentReplication'],qualification='Exact trial snapshot and normalized-source replay; not clinical, empirical, identity or freshness verification.')
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError):return reject('REPLAY_REFUSED')
