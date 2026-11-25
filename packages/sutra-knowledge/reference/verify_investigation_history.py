#!/usr/bin/env python3
"""Independent exact history replay. No claims about producer locking or storage."""
from hashlib import sha256
from verify import keys
from verify_conflict import require
from verify_reviewed_compiler import pin,ident
from verify_living_version import reconstruct,check_wire,ERRORS
VERSION='sutra-investigation-history/v1'
MAX_BYTES=262144
QUAL='Exact versions and declared branch heads replayed within a bounded single-parent history. No automatic merge, durable storage, cross-process concurrency, semantic truth or action authority.'
def verify(data,expected):
    if not pin(expected):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        h=check_wire(data.decode('utf-8',errors='strict'),8)
        require(keys(h,('version','versions','branches')) and h['version']==VERSION and isinstance(h['versions'],list) and 1<=len(h['versions'])<=12 and isinstance(h['branches'],list) and 1<=len(h['branches'])<=8)
        known={};root=None;rows=[]
        for v in h['versions']:
            require(keys(v,('digest','versionText')) and pin(v['digest']) and v['digest'] not in known)
            r=reconstruct(v['versionText'],v['digest']);parent=r['previousDigest']
            if parent is None:
                require(root is None);root=v['digest']
            else:require(parent in known)
            known[v['digest']]=parent
            rows.append(dict(digest=v['digest'],parent=parent,question=r['originalQuestion']['text'],triage=r['triage'],candidates=[dict(id=c['id'],status=c['obligations']['computation']) for c in r['candidates']]))
        require(root is not None)
        heads={}
        for b in h['branches']:
            require(keys(b,('name','head')) and ident(b['name']) and b['name'] not in heads and b['head'] in known);heads[b['name']]=b['head']
        # Walk each ancestry chain independently; no reuse of producer state.
        reachable=set()
        for head in heads.values():
            chain=set()
            while head is not None:
                require(head not in chain);chain.add(head);head=known[head]
            require(root in chain);reachable.update(chain)
        require(reachable==set(known))
        view=dict(version=VERSION,digest=expected,root=root,branches=[dict(name=k,head=heads[k]) for k in sorted(heads)],versions=rows,decisionAuthority='NONE',qualification=QUAL)
        return dict(status='VERIFIED',profile=VERSION,result=view,qualification='Independent bounded parent closure and conditional replay; no semantic or empirical truth, producer locking, storage durability or identity assurance.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
