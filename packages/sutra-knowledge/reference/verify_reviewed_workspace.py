#!/usr/bin/env python3
"""Independent fixture reconstruction for actual human-authored browser selection."""
import sys,json
from pathlib import Path
from copy import deepcopy
from verify import canonical
from verify_conflict import bounded_load,require,rawhash
from verify_reviewed_compiler import verify,compact
def fixture():
    q='Is site A higher than site B?'
    a='測定 🧪 A: 12.50; repeat: 12.50;';b='Site B: 10.25;'
    sources=[dict(id=i,text=s,digest=rawhash(s),lineage=r) for i,s,r in [('report_a',a,'root_a'),('report_b',b,'root_b')]]
    t=dict(kind='stress',unit='MPa',scope='sample_scope',dimension=[-1,1,-2])
    bindings=[]
    for i,s,token in [('a',sources[0],'12.50'),('b',sources[1],'10.25')]:
        start=len(s['text'][:s['text'].rindex(token)].encode('utf-8'))
        bindings.append(dict(id=i,span=dict(sourceId=s['id'],start=start,end=start+len(token.encode('utf-8')),quote=token),type=t))
    return compact(dict(version=1,question=dict(text=q,digest=rawhash(q)),sources=sources,bindings=bindings))
def main():
    require(len(sys.argv)==2)
    with Path(sys.argv[1]).open(encoding='utf-8') as fp:b=bounded_load(fp.read(1048577),1048576,40)
    contract=fixture();pin=rawhash(contract)
    require(b['contractText']==contract and verify(b,pin))
    r=b['result'];require(r['target']['status']=='CONDITIONALLY_SATISFIED' and r['target']['questionRelevance']=='UNVERIFIED' and r['target']['declaredLineages']==['root_a','root_b'])
    require(json.loads(b['proposalText'])['nodes']==[dict(id='left_value',kind='input',bindingId='a'),dict(id='right_value',kind='input',bindingId='b'),dict(id='target',kind='constraint',op='gt',args=['left_value','right_value'])])
    mutants=[]
    m=deepcopy(b);m['result']['bindings'][0]['span']['start']-=1;mutants.append(m)
    m=deepcopy(b);m['result']['target']['status']='VERIFIED';mutants.append(m)
    m=deepcopy(b);m['result']['target']['declaredLineages']=['one'];mutants.append(m)
    m=deepcopy(b);m['contractText']+=' ';mutants.append(m)
    m=deepcopy(b);p=json.loads(m['proposalText']);p['nodes'][0]['value']='999';m['proposalText']=compact(p);mutants.append(m)
    for m in mutants:require(not verify(m,pin))
    print('ACCEPTED actual manually selected repeated numeric token after multibyte source; REJECTED',len(mutants),'mutants')
if __name__=='__main__':main()
