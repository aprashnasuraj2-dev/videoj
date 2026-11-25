#!/usr/bin/env python3
"""Actual browser report + separate synthetic adversaries; no external sources."""
import json,sys,subprocess
from copy import deepcopy
from pathlib import Path
from verify_conflict import rawhash,require
from verify_withdrawal_revision import verify
def wire(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def test(data,pin,parent,plan):
    result=verify(data,pin,parent,plan);require(result['status']=='VERIFIED')
    obj=json.loads(data)
    def refused(x,pp=parent,pl=plan):
        s=wire(x);require(verify(s.encode('utf-8'),rawhash(s),pp,pl)['status']=='REFUSED')
    for k,v in [('decisionAuthority','VERIFIED'),('changes',[]),('qualification','truth established'),('parentDigest','sha256:'+'0'*64),('childDigest',parent),('planDigest','sha256:'+'0'*64)]:
        m=deepcopy(obj);m[k]=v;refused(m)
    m=deepcopy(obj);p=json.loads(m['planText']);p['sourceId']='question';m['planText']=wire(p);m['planDigest']=rawhash(m['planText']);refused(m,pl=m['planDigest'])
    for k,v in [('classification','FABRICATED'),('after','VERIFIED'),('parentProposalDigest','sha256:'+'0'*64),('removedReferences',[dict(facet='method',kind='claim',id='fake')])]:
        m=deepcopy(obj);m['changes'][0][k]=v;refused(m)
    m=deepcopy(obj);m['impact']['sourceChanges']=[];refused(m)
    # Rehash child and every nested pin after a plausible but unauthorized formula change.
    # Generic living replay can still accept the changed program; the withdrawal profile must not.
    m=deepcopy(obj);child=json.loads(m['childVersion']);batch=json.loads(child['batchText']);ann=json.loads(child['annotationText'])
    for p in batch['proposals']:
        proposal=json.loads(p['proposalText'])
        if 'nodes' not in proposal:continue
        target=next(n for n in proposal['nodes'] if n['id']==proposal['targetId'])
        target['op']='eq' if target['op']!='eq' else 'gt';p['proposalText']=wire(proposal);break
    child['batchText']=wire(batch);ann['batchDigest']=rawhash(child['batchText']);child['annotationText']=wire(ann);child['annotationPin']=rawhash(child['annotationText']);m['childVersion']=wire(child);m['childDigest']=rawhash(m['childVersion']);refused(m)
    for args in [(data+b' ',pin,parent,plan),(data,pin,'sha256:'+'0'*64,plan),(data,pin,parent,'sha256:'+'0'*64),(data,'sha256:'+'0'*64,parent,plan)]:
        require(verify(*args)['status']=='REFUSED')
    return result
def main():
    if len(sys.argv)==1:
        cases=json.load(sys.stdin);require(len(cases)==3)
        classifications=set()
        for c in cases:
            r=test(c['bundleText'].encode('utf-8'),c['snapshotPin'],c['parentDigest'],c['planDigest'])
            classifications.update(x['classification'] for x in r['result']['changes'])
        require(classifications=={'TARGET_EVIDENCE_WITHDRAWN','NO_SCOPED_SOURCE_DEPENDENCY','CONTEXT_OR_NONTARGET_WITHDRAWN','REFUSED_PARENT_QUARANTINED'})
        print('3 independent synthetic withdrawal cases; all four dependency classes; 13 repinned mutations and four pin controls per case.')
        return
    require(len(sys.argv)==3)
    root=Path(sys.argv[1]);archive=Path(sys.argv[2]).resolve()
    report=root/'living-withdraw-report.json';data=report.read_bytes()
    pin=(root/'living-withdraw-report.sha256').read_text().strip();parent=(root/'living-withdraw-before.sha256').read_text().strip();plan=(root/'living-withdraw-plan.sha256').read_text().strip()
    result=test(data,pin,parent,plan)
    obj=json.loads(data);require(obj['parentVersion'].encode('utf-8')==(root/'living-withdraw-before.json').read_bytes() and obj['childVersion'].encode('utf-8')==(root/'living-withdraw-after.json').read_bytes())
    require(obj['childDigest']==(root/'living-withdraw-after.sha256').read_text().strip())
    require(result['result']['sourceId']=='investment_report')
    require({x['id']:x['after'] for x in result['result']['changes']}=={'operating_cash':'CONDITIONALLY_SATISFIED','after_capital':'BLOCKED_MISSING_INPUT'})
    proc=subprocess.run([sys.executable,'-I','-S',str(archive),str(report.resolve()),'--withdrawal','--pin',pin,'--version-pin',parent,'--plan-pin',plan],capture_output=True,text=True,check=True)
    require(json.loads(proc.stdout)==result)
    print('Actual browser withdrawal report independently reconstructed using downloaded offline archive; surviving and unresolved results; 13 repinned mutations plus four pin controls refused.')
if __name__=='__main__':main()
