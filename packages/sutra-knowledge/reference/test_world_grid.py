#!/usr/bin/env python3
import json,sys,subprocess
from copy import deepcopy
from pathlib import Path
from verify import canonical
from verify_conflict import rawhash,require
from verify_world_grid import verify
def main():
    root=Path(sys.argv[1]);archive=Path(sys.argv[2]).resolve()
    data=(root/'living-world-grid.json').read_bytes()
    snapshot=(root/'living-world-grid.sha256').read_text().strip()
    version=(root/'living-before.sha256').read_text().strip()
    plan=(root/'living-world-plan.sha256').read_text().strip()
    verified=verify(data,snapshot,version,plan);require(verified['status']=='VERIFIED')
    proc=subprocess.run([sys.executable,'-I','-S',str(archive),str((root/'living-world-grid.json').resolve()),'--world-grid','--pin',snapshot,'--version-pin',version,'--plan-pin',plan],capture_output=True,text=True,check=True)
    require(json.loads(proc.stdout)==verified)
    r=verified['result'];require(r['coverage']['totalAssignments']==4 and r['coverage']['executedCells']==16)
    require(any(w['witnesses'] for w in r['worlds']))
    original=json.loads(data);mutants=[]
    for k,v in [('decisionAuthority','VERIFIED'),('interactionWitnesses',[{'invented':True}]),('axes',[]),('qualification','truth established')]:
        m=deepcopy(original);m['result'][k]=v;mutants.append(m)
    for k,v in [('state','constraint_satisfied'),('reportDigest','sha256:'+'0'*64),('execution','VERIFIED')]:
        m=deepcopy(original);row=m['result']['worlds'][1]['rows'][0];row[k]=v if row[k]!=v else 'constraint_refuted';mutants.append(m)
    m=deepcopy(original);m['result']['coverage']['evaluatedAssignments']=1;mutants.append(m)
    m=deepcopy(original);m['result']['worlds'][0]['assignment'][0]['value']='999/1';mutants.append(m)
    for m in mutants:
        require(canonical(m)!=canonical(original));s=json.dumps(m,ensure_ascii=False,separators=(',',':'));require(verify(s.encode(),rawhash(s),version,plan)['status']=='REFUSED')
    require(verify(data+b' ',snapshot,version,plan)['status']=='REFUSED')
    require(verify(data,snapshot,'sha256:'+'0'*64,plan)['status']=='REFUSED')
    require(verify(data,snapshot,version,'sha256:'+'0'*64)['status']=='REFUSED')
    print('ACCEPTED actual browser 4-assignment grid and 16 decisive cells via independent offline archive; REJECTED',len(mutants),'derived mutants plus three stale-pin checks.')
if __name__=='__main__':main()
