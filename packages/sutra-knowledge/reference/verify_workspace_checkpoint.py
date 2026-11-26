#!/usr/bin/env python3
"""Independent bounded workspace replay. Never restores permissions or results."""
from hashlib import sha256
import json
import sys
from verify import keys
from verify_conflict import rawhash, require
from verify_reviewed_compiler import compact, host, ident, pin, text
from verify_living_version import check_wire, reconstruct, ERRORS
from verify_investigation_history import verify as history_verify

VERSION = 'sutra-workspace-checkpoint/v1'
MAX_BYTES = 262144

def read_piece(p):
    require(keys(p, ('text', 'pin')) and pin(p['pin']) and isinstance(p['text'], str))
    require(rawhash(p['text']) == p['pin'])
    return p['text']

def draft_replay(p):
    raw = read_piece(p)
    d = check_wire(raw, 8)
    require(keys(d, ('version','question','sources','bindings')) and type(d['version']) is int and d['version'] == 1)
    require(text(d['question'], 1000) and '\r' not in d['question'])
    require(isinstance(d['sources'], list) and len(d['sources']) <= 8)
    require(isinstance(d['bindings'], list) and len(d['bindings']) <= 64)
    # Editable draft wire order is part of the browser checkpoint contract.
    require(compact(dict(version=1, question=d['question'], sources=d['sources'], bindings=d['bindings'])) == raw)
    sources = []
    docs = {}
    for s in d['sources']:
        require(keys(s, ('id','text','lineage')) and ident(s['id']) and s['id'] != 'question' and s['id'] not in docs)
        require(ident(s['lineage']) and text(s['text'],16384) and '\r' not in s['text'])
        docs[s['id']] = s['text']
        sources.append(dict(id=s['id'], text=s['text'], digest=rawhash(s['text']), lineage=s['lineage']))
    bindings = []
    for b in d['bindings']:
        require(keys(b, ('id','sourceId','start','end','type')) and ident(b['id']) and b['sourceId'] in docs)
        a,z=b['start'],b['end']
        source=docs[b['sourceId']].encode('utf-16-le')
        require(type(a) is int and type(z) is int and 0 <= a < z <= len(source)//2)
        before=source[:a*2].decode('utf-16-le').encode('utf-8')
        quote=source[a*2:z*2].decode('utf-16-le')
        # Check end boundary as well as start; no surrogate half may survive.
        source[z*2:].decode('utf-16-le')
        span=dict(sourceId=b['sourceId'],start=len(before),end=len(before)+len(quote.encode('utf-8')),quote=quote)
        bindings.append(dict(id=b['id'],span=span,type=b['type']))
    c=compact(dict(version=1,question=dict(text=d['question'],digest=rawhash(d['question'])),sources=sources,bindings=bindings))
    host(c,rawhash(c))
    return dict(question=d['question'],sourceCount=len(sources),bindingCount=len(bindings))

def verify(data, expected):
    if not pin(expected): return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES: return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected: return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        w=check_wire(data.decode('utf-8'),6)
        require(keys(w,('version','draft','history','baseline')) and w['version']==VERSION)
        summary=draft_replay(w['draft'])
        summary.update(historyPin=None,versions=0,branches=0,baselinePin=None)
        if w['history'] is not None:
            h=history_verify(read_piece(w['history']).encode('utf-8'),w['history']['pin'])
            require(h['status']=='VERIFIED')
            summary.update(historyPin=w['history']['pin'],versions=len(h['result']['versions']),branches=len(h['result']['branches']))
        if w['baseline'] is not None:
            reconstruct(read_piece(w['baseline']),w['baseline']['pin'])
            summary['baselinePin']=w['baseline']['pin']
        return dict(status='VERIFIED',summary=summary,decisionAuthority='NONE',qualification='Independent bounded draft admission and history/baseline replay; no freshness, semantic truth, consent or execution.')
    except ERRORS:
        return dict(status='REFUSED',reason='REPLAY_REFUSED')

if __name__=='__main__':
    # Bounded batch interface for differential regression only.
    data=sys.stdin.buffer.read(2097153)
    require(len(data)<=2097152)
    cases=json.loads(data)
    require(isinstance(cases,list) and 1<=len(cases)<=16)
    print(json.dumps([verify(c['text'].encode('utf-8'),c['pin']) for c in cases],ensure_ascii=False))
