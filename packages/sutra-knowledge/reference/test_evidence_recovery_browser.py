#!/usr/bin/env python3
"""Independently verify the actual browser's two-transition recovery artifact."""
import json,sys,subprocess
from pathlib import Path
from verify_conflict import rawhash,require
from verify_evidence_recovery import verify
def main():
    root=Path(sys.argv[1]);archive=Path(sys.argv[2]).resolve();report=root/'living-recovery.json';data=report.read_bytes()
    pin=(root/'living-recovery.sha256').read_text().strip()
    p=json.loads((root/'living-recovery-input-pins.json').read_text())
    pins=[pin,p['ancestorDigest'],p['revisionPlanDigest'],p['parentDigest'],p['recoveryPlanDigest']]
    result=verify(data,*pins);require(result['status']=='VERIFIED')
    require({x['id']:x['after'] for x in result['result']['changes']}=={'operating_cash':'CONDITIONALLY_SATISFIED','after_capital':'CONDITIONALLY_REFUTED'})
    require(result['result']['recoveredBindingIds']==['capex_before','capex_now'])
    count=0
    for i in range(5):
        bad=pins[:];bad[i]='sha256:'+'0'*64
        require(verify(data,*bad)['status']=='REFUSED');count+=1
    x=json.loads(data);v=json.loads(x['childVersion']);a=json.loads(v['annotationText'])
    next(c for c in a['candidates'] if c['id']=='after_capital')['facets']['definition']['references']=[{'kind':'binding','id':'capex_now'}]
    wire=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
    v['annotationText']=wire(a);v['annotationPin']=rawhash(v['annotationText']);x['childVersion']=wire(v);x['childDigest']=rawhash(x['childVersion'])
    t=wire(x);require(verify(t.encode(),rawhash(t),*pins[1:])['status']=='REFUSED');count+=1
    proc=subprocess.run([sys.executable,'-I','-S',str(archive),str(report.resolve()),'--evidence-recovery','--pin',pins[0],'--ancestor-pin',pins[1],'--revision-plan-pin',pins[2],'--version-pin',pins[3],'--plan-pin',pins[4]],capture_output=True,text=True,check=True)
    require(json.loads(proc.stdout)==result)
    print(json.dumps({'actualBrowserRecoveryVerified':True,'standaloneArchiveMatches':True,'refusedTamperAndPins':count}))
if __name__=='__main__':main()
