#!/usr/bin/env python3
"""Replay the actual frozen development benchmark exports independently.
Not independent human labels or a general semantic verifier."""
from pathlib import Path
import json
import sys
from hashlib import sha1
from verify_conflict import rawhash, require
from verify_evidence_revision import verify

FROZEN='d199bddb0bcc9023eb0c3cf77697e3cd3c278786'
CANDIDATES=('primary_view','secondary_view')
def wire(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',',':'))

def main():
    require(len(sys.argv)==2)
    raw=(Path(__file__).resolve().parent.parent/'evaluation'/'revision-development-v1.json').read_bytes()
    require(sha1(b'blob '+str(len(raw)).encode()+b'\x00'+raw).hexdigest()==FROZEN)
    spec=json.loads(raw)
    expected={c['id']:c['expected']['states'] for c in spec['cases'] if 'states' in c['expected']}
    bundles=json.loads(Path(sys.argv[1]).read_bytes())
    require(len(expected)==32 and len(bundles)==32 and {c['id'] for c in bundles}==set(expected))
    tamper=0
    for case in bundles:
        data=case['bundleText'].encode('utf-8')
        parent,plan=case['parentDigest'],case['planDigest']
        report=verify(data,case['snapshotPin'],parent,plan)
        require(report['status']=='VERIFIED')
        changes={c['id']:c['after'] for c in report['result']['changes']}
        require([changes[i] for i in CANDIDATES]==expected[case['id']])
        # An altered child digest or altered claimed conditional status must
        # fail even if the attacker recomputes the outer snapshot digest.
        for edit in ('childDigest','status'):
            m=json.loads(data)
            if edit=='childDigest':
                m['childDigest']=parent
            else:
                r=m['changes'][0]
                r['after']='CONDITIONALLY_REFUTED' if r['after']=='CONDITIONALLY_SATISFIED' else 'CONDITIONALLY_SATISFIED'
            altered=wire(m)
            require(verify(altered.encode('utf-8'),rawhash(altered),parent,plan)['status']=='REFUSED')
            tamper+=1
    print(json.dumps({'profile':'revision-development-independent/v1','accepted':len(bundles),'repinnedTamperRefused':tamper,'qualification':'Separate Python transformation and arithmetic replay against the same frozen developer labels; not independent annotation or external truth.'}))
if __name__=='__main__':
    main()
