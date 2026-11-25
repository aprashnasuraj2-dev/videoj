#!/usr/bin/env python3
"""Independent recovery exports, nested tampering and actual offline archive."""
import json,sys,subprocess,tempfile
from pathlib import Path
from copy import deepcopy
from verify_conflict import rawhash,require
from verify_evidence_recovery import verify
from build_offline_verifier import build,NAME
def wire(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def main():
    cases=json.load(sys.stdin);require(len(cases)==4)
    expected=[['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED'],['CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED'],['BLOCKED_MISSING_INPUT','CONDITIONALLY_SATISFIED'],['CONDITIONALLY_SATISFIED','CONDITIONALLY_SATISFIED']]
    count=0
    with tempfile.TemporaryDirectory() as tmp:
        root=Path(tmp);build(root)
        for i,c in enumerate(cases):
            data=c['bundleText'].encode();pins=[c[k] for k in ('snapshotPin','ancestorDigest','revisionPlanDigest','parentDigest','recoveryPlanDigest')]
            result=verify(data,*pins);require(result['status']=='VERIFIED')
            require([r['after'] for r in result['result']['changes']]==expected[i])
            obj=json.loads(data)
            def refuse(m,recovery_pin=pins[-1]):
                nonlocal count
                t=wire(m);require(verify(t.encode(),rawhash(t),*pins[1:4],recovery_pin)['status']=='REFUSED');count+=1
            for key,value in [('recoveredBindingIds',[]),('stillMissingBindingIds',['invented']),('changes',[]),('decisionAuthority','VERIFIED'),('childDigest',pins[3]),('priorTransactionDigest','sha256:'+'0'*64)]:
                m=deepcopy(obj);m[key]=value;refuse(m)
            m=deepcopy(obj);p=json.loads(m['recoveryPlanText']);p['restorations'][0]['rebindings'][0]['span']['quote']='999';m['recoveryPlanText']=wire(p);m['recoveryPlanDigest']=rawhash(m['recoveryPlanText']);refuse(m,m['recoveryPlanDigest'])
            # Reattach an old binding-linked meaning with valid newly sealed
            # child bytes: this may be a valid version, but is not this recovery.
            m=deepcopy(obj);v=json.loads(m['childVersion']);a=json.loads(v['annotationText'])
            target=next(x for x in a['candidates'] if x['id']=='secondary_view')
            target['facets']['definition']['references']=[{'kind':'binding','id':'second'}]
            v['annotationText']=wire(a);v['annotationPin']=rawhash(v['annotationText']);m['childVersion']=wire(v);m['childDigest']=rawhash(m['childVersion']);refuse(m)
            for j in range(len(pins)):
                wrong=pins[:];wrong[j]='sha256:'+'0'*64;require(verify(data,*wrong)['status']=='REFUSED');count+=1
            path=root/'case.json';path.write_bytes(data)
            p=subprocess.run([sys.executable,'-I','-S',str(root/NAME),str(path),'--evidence-recovery','--pin',pins[0],'--ancestor-pin',pins[1],'--revision-plan-pin',pins[2],'--version-pin',pins[3],'--plan-pin',pins[4]],capture_output=True,text=True,check=True)
            require(json.loads(p.stdout)==result)
        require(cases[-1] and result['result']['changes'][0]['classification']=='NONTARGET_INPUT_RECOVERED')
        child=json.loads(json.loads(cases[-1]['bundleText'])['childVersion']);batch=json.loads(child['batchText']);p=json.loads(batch['proposals'][0]['proposalText'])
        require(next(n for n in p['nodes'] if n['id']=='original_unknown')['kind']=='unknown')
        require(not p['claims'])
    print(json.dumps({'profile':'evidence-recovery-independent/v1','accepted':len(cases),'tamperAndPinRefused':count,'offlineArchiveMatches':len(cases)}))
if __name__=='__main__':main()
