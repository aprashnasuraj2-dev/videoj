#!/usr/bin/env python3
"""Independent reviewed compiler snapshot profile. Pins are caller-held."""
import re
from hashlib import sha256
from verify import canonical,keys
from verify_capsule import wire
from verify_conflict import rawhash
from verify_reviewed_compiler import VERSION,audit
MAX_BYTES=262144
PIN=re.compile(r'sha256:[a-f0-9]{64}',re.ASCII)
def valid(x):return isinstance(x,str) and PIN.fullmatch(x) is not None
def reject(reason):return dict(status='REFUSED',reason=reason)
def verify(data,expected_digest,contract_pin):
    if not valid(expected_digest):return reject('PIN_REQUIRED')
    if not valid(contract_pin):return reject('CONTRACT_PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return reject('SIZE_OR_TYPE')
    digest='sha256:'+sha256(data).hexdigest()
    if digest!=expected_digest:return reject('PIN_MISMATCH')
    try:b=wire(data.decode('utf-8',errors='strict'),40)
    except (ValueError,TypeError,UnicodeError,OverflowError,RecursionError):return reject('WIRE_REFUSED')
    if not keys(b,('version','contractText','proposalText','result')) or b['version']!=VERSION or not isinstance(b['contractText'],str) or not isinstance(b['proposalText'],str) or not isinstance(b['result'],dict):return reject('REVIEWED_SCHEMA')
    try:
        if not 1<=len(b['contractText'].encode('utf-8'))<=MAX_BYTES:raise ValueError('contract bound')
        if rawhash(b['contractText'])!=contract_pin:return reject('CONTRACT_PIN_MISMATCH')
        r=audit(b['contractText'],contract_pin,b['proposalText'])
        if canonical(r)!=canonical(b):return reject('REPLAY_MISMATCH')
        return dict(status='VERIFIED',snapshotDigest=digest,contractDigest=contract_pin,proposalDigest=r['result']['proposalDigest'],conclusion=r['result']['target']['status'],questionRelevance='UNVERIFIED',methodValidity='UNVERIFIED',qualification='Exact reviewed contract and proposal computation replay only; no source truth, semantic relevance, method validity, identity, freshness or external authority.')
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError,StopIteration):return reject('REPLAY_REFUSED')
