#!/usr/bin/env python3
"""Independent aligned snapshot consumer. Two caller-retained pins, no freshness."""
import re
from hashlib import sha256
from verify import canonical, keys
from verify_conflict import bounded_load, rawhash
from verify_pinned_investigation import replay, alignment, ALIGNED_VERSION, bounded_text

FORMAT='sutra-aligned-proof-capsule/v1'
MAX_BYTES=262144
PIN=re.compile(r'sha256:[a-f0-9]{64}',re.ASCII)
LIMITATIONS=[
 'Finite aligned typed worlds and declared source lineage only.',
 'Retain the case pin and exact snapshot pin independently of untrusted capsule bytes.',
 'Replay establishes neither source truth, model completeness, semantic validity, independence, signer identity nor freshness.',
 'A valid historical snapshot with its own trusted pin remains verifiable; no monotonic witness is included.'
]
ERRORS=(ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError)
def refused(reason):return dict(status='REFUSED',reason=reason)
def digest(data):return 'sha256:'+sha256(data).hexdigest()
def valid_pin(p):return isinstance(p,str) and PIN.fullmatch(p)
def wire(data):
    obj=bounded_load(data.decode('utf-8',errors='strict'),MAX_BYTES,32)
    stack=[obj]
    while stack:
        x=stack.pop()
        if isinstance(x,str):x.encode('utf-8',errors='strict')
        elif isinstance(x,dict):stack.extend(x.keys());stack.extend(x.values())
        elif isinstance(x,list):stack.extend(x)
    return obj
def verify(data,pin,case_pin):
    if not valid_pin(pin):return refused('PIN_REQUIRED')
    if not valid_pin(case_pin):return refused('CASE_PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return refused('SIZE_OR_TYPE')
    actual=digest(data)
    if actual!=pin:return refused('PIN_MISMATCH')
    try:b=wire(data)
    except ERRORS:return refused('WIRE_REFUSED')
    if not keys(b,('format','investigation','limitations')) or b['format']!=FORMAT or b['limitations']!=LIMITATIONS:
        return refused('CAPSULE_SCHEMA')
    i=b['investigation']
    if not keys(i,('version','caseText','eventText','result','alignment')) or i['version']!=ALIGNED_VERSION or not isinstance(i['caseText'],str) or not isinstance(i['eventText'],str):
        return refused('CAPSULE_SCHEMA')
    try:
        if rawhash(bounded_text(i['caseText']))!=case_pin:return refused('CASE_PIN_MISMATCH')
        result=replay(i['caseText'],case_pin,i['eventText'])
        shape=alignment(i['caseText'])
        if canonical(result)!=canonical(i['result']) or canonical(shape)!=canonical(i['alignment']):return refused('REPLAY_MISMATCH')
        return dict(status='VERIFIED',capsuleDigest=actual,caseDigest=case_pin,eventDigest=result['eventDigest'],schemaDigest=shape['schemaDigest'],conclusion=result['state'],qualification='Exact aligned snapshot replay against caller-retained case and snapshot pins; not truth or freshness.')
    except ERRORS:return refused('REPLAY_REFUSED')
