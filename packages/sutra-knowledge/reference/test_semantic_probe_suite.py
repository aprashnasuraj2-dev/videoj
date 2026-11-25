#!/usr/bin/env python3
import json,sys
from copy import deepcopy
from verify_conflict import rawhash,require
from verify_semantic_probe_suite import verify
def wire(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def check(data,snapshot,version,plan):
    result=verify(data,snapshot,version,plan);require(result['status']=='VERIFIED')
    obj=json.loads(data)
    def refused(m):
        s=wire(m);require(verify(s.encode(),rawhash(s),version,plan)['status']=='REFUSED')
    for k,v in [('decisionAuthority','VERIFIED'),('optimization','APPROXIMATE'),('structuralGroups',[]),('qualification','truth established')]:
        m=deepcopy(obj);m['result'][k]=v;refused(m)
    m=deepcopy(obj);m['result']['counts']['coveredPairs']+=1;refused(m)
    m=deepcopy(obj);m['result']['gridCoverage']['truncated']=not m['result']['gridCoverage']['truncated'];refused(m)
    if obj['result']['selectedWorlds']:
        m=deepcopy(obj);m['result']['selectedWorlds']=[];refused(m)
    if obj['result']['pairs']:
        m=deepcopy(obj);m['result']['pairs'][0]['status']='PROVEN_EQUIVALENT';refused(m)
    for j,p in enumerate(obj['result']['pairs']):
        if p['witnesses']:
            m=deepcopy(obj);m['result']['pairs'][j]['witnesses'][0]['minimality']='PROVEN_GLOBAL_MINIMUM';refused(m);break
    require(verify(data+b' ',snapshot,version,plan)['status']=='REFUSED')
    require(verify(data,snapshot,'sha256:'+'0'*64,plan)['status']=='REFUSED')
    require(verify(data,snapshot,version,'sha256:'+'0'*64)['status']=='REFUSED')
    return result['result']
def main():
    cases=json.load(sys.stdin);require(len(cases)==5)
    rows=[check(c['bundleText'].encode(),c['snapshotPin'],c['versionDigest'],c['planDigest']) for c in cases]
    require(rows[0]['counts']['selectedWorlds']==1 and rows[0]['pairs'][0]['witnesses'][0]['minimality']=='MINIMAL_WITHIN_DECLARED_TESTED_SUBSETS')
    require(rows[1]['gridCoverage']['truncated'] and rows[1]['counts']['selectedWorlds']==0)
    require(rows[2]['counts']['coveredPairs']==2 and rows[3]['counts']['coveredPairs']==3)
    require(rows[4]['pairs'][0]['status']=='UNRESOLVED_IN_EVALUATED_WORLDS')
    print('5 independent synthetic probe-suite cases: joint witness, duplicate structure, prefix truncation, exact budget and unresolved arithmetic; repinned output tampering refused.')
if __name__=='__main__':main()
