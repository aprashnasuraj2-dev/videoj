#!/usr/bin/env python3
"""Independent synthetic atomic transaction parity and tamper controls."""
import json,sys,subprocess
from pathlib import Path
from copy import deepcopy
from verify_conflict import rawhash,require
from verify_evidence_revision import verify
def wire(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def check(data,pin,parent,plan):
    r=verify(data,pin,parent,plan);require(r['status']=='VERIFIED')
    obj=json.loads(data)
    require(verify(data,pin,parent,plan,obj['childDigest'])==r)
    require(verify(data,pin,parent,plan,'sha256:'+'0'*64)==dict(status='REFUSED',reason='CHILD_PIN_MISMATCH'))
    require(verify(data,pin,parent,plan,'invalid')==dict(status='REFUSED',reason='CHILD_PIN_REQUIRED'))
    def refused(x,pp=parent,pl=plan):
        s=wire(x);require(verify(s.encode('utf-8'),rawhash(s),pp,pl)['status']=='REFUSED')
    for k,v in [('decisionAuthority','VERIFIED'),('changes',[]),('sourceChanges',[]),('invalidatedBindingIds',['invented']),('reselectedBindingIds',['invented']),('missingBindingIds',['invented']),('qualification','truth'),('childDigest',parent)]:
        m=deepcopy(obj);m[k]=v;refused(m)
    for edit in (lambda p:p['operations'].append(p['operations'][0]),lambda p:p['operations'][0].update(previousDigest='sha256:'+'0'*64),lambda p:p['operations'][0].update(sourceId='question')):
        m=deepcopy(obj);p=json.loads(m['planText']);edit(p);m['planText']=wire(p);m['planDigest']=rawhash(m['planText']);refused(m,pl=m['planDigest'])
    # Independently repinned program change, with all nested binding digests updated.
    m=deepcopy(obj);v=json.loads(m['childVersion']);b=json.loads(v['batchText']);a=json.loads(v['annotationText'])
    for entry in b['proposals']:
        p=json.loads(entry['proposalText'])
        if 'nodes' not in p:continue
        next(n for n in p['nodes'] if n['id']==p['targetId'])['op']='eq';entry['proposalText']=wire(p);break
    v['batchText']=wire(b);a['batchDigest']=rawhash(v['batchText']);v['annotationText']=wire(a);v['annotationPin']=rawhash(v['annotationText'])
    m['childVersion']=wire(v);m['childDigest']=rawhash(m['childVersion']);refused(m)
    # Actual numeric reselection must match the independent plan, not merely a valid child.
    p=json.loads(obj['planText'])
    for op in p['operations']:
        if op.get('rebindings'):
            m=deepcopy(obj);q=json.loads(m['planText']);target=next(o for o in q['operations'] if o.get('rebindings'))
            target['rebindings'][0]['span']['quote']='999';m['planText']=wire(q);m['planDigest']=rawhash(m['planText']);refused(m,pl=m['planDigest']);break
    for args in [(data+b' ',pin,parent,plan),(data,pin,'sha256:'+'0'*64,plan),(data,pin,parent,'sha256:'+'0'*64),(data,'sha256:'+'0'*64,parent,plan)]:require(verify(*args)['status']=='REFUSED')
    return r
def main():
    if len(sys.argv)==3:
        root=Path(sys.argv[1]);archive=Path(sys.argv[2]).resolve();report=root/'living-transaction.json';data=report.read_bytes()
        pin,parent,plan=((root/('living-transaction'+s+'.sha256')).read_text().strip() for s in ('','-parent','-plan'))
        result=check(data,pin,parent,plan)
        require({c['id']:c['after'] for c in result['result']['changes']}=={'operating_cash':'CONDITIONALLY_REFUTED','after_capital':'BLOCKED_MISSING_INPUT'})
        proc=subprocess.run([sys.executable,'-I','-S',str(archive),str(report.resolve()),'--evidence-transaction','--pin',pin,'--version-pin',parent,'--plan-pin',plan],capture_output=True,text=True,check=True)
        require(json.loads(proc.stdout)==result)
        child=(root/'living-transaction-child.sha256').read_text().strip()
        command=proc.args
        accepted=subprocess.run(command+['--child-pin',child],capture_output=True,text=True,check=True);require(json.loads(accepted.stdout)==result)
        refused=subprocess.run(command+['--child-pin','sha256:'+'0'*64],capture_output=True,text=True);require(refused.returncode==1 and json.loads(refused.stdout)==dict(status='REFUSED',reason='CHILD_PIN_MISMATCH'))
        invalid=subprocess.run(command+['--child-pin','invalid'],capture_output=True,text=True);require(invalid.returncode==1 and json.loads(invalid.stdout)==dict(status='REFUSED',reason='CHILD_PIN_REQUIRED'))
        print('Actual browser atomic revision independently replayed with standalone archive, separately retained final child and repinned tamper controls.');return
    require(len(sys.argv)==1)
    cases=json.load(sys.stdin);require(len(cases)==4);classes=set()
    for c in cases:
        r=check(c['bundleText'].encode('utf-8'),c['snapshotPin'],c['parentDigest'],c['planDigest'])
        classes.update(x['classification'] for x in r['result']['changes'])
    require(classes=={'TARGET_INPUT_MISSING','TARGET_INPUT_RESELECTED','CONTEXT_OR_NONTARGET_REVISED','REFUSED_PARENT_QUARANTINED','NO_SCOPED_SOURCE_DEPENDENCY'})
    print('4 independent atomic transaction cases, all five classifications, nested repinning and stale/forged plan controls refused.')
if __name__=='__main__':main()
