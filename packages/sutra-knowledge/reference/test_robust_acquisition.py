#!/usr/bin/env python3
import json,sys,subprocess
from copy import deepcopy
from pathlib import Path
from verify_conflict import rawhash,require
from verify_robust_acquisition import verify
def main():
    root=Path(sys.argv[1]);archive=Path(sys.argv[2]).resolve()
    data=(root/'living-acquisition.json').read_bytes()
    snapshot=(root/'living-acquisition.sha256').read_text().strip()
    version=(root/'living-acquisition-version.sha256').read_text().strip()
    grid=(root/'living-acquisition-grid.sha256').read_text().strip()
    policy=(root/'living-acquisition-policy.sha256').read_text().strip()
    r=verify(data,snapshot,version,grid,policy);require(r['status']=='VERIFIED')
    require(r['result']['noObservation']['worstObjective']==6 and r['result']['plan']['worstObjective']==2 and r['result']['decisionAuthority']=='NONE')
    cli=subprocess.run([sys.executable,'-I','-S',str(archive),str((root/'living-acquisition.json').resolve()),'--acquisition','--pin',snapshot,'--version-pin',version,'--plan-pin',grid,'--policy-pin',policy],capture_output=True,text=True,check=True)
    require(json.loads(cli.stdout)==r)
    original=json.loads(data);mutants=[]
    for k,v in [('worstCaseImprovement',999),('decisionAuthority','VERIFIED'),('perfectInformationLowerBound',5),('availableActions',[]),('qualification','real observation')]:
        m=deepcopy(original);m['result'][k]=v;mutants.append(m)
    for k,v in [('worstObjective',0),('acquisitionCostUpper',0),('worstExposure',0),('branches',[])]:
        m=deepcopy(original);m['result']['plan'][k]=v;mutants.append(m)
    for m in mutants:
        s=json.dumps(m,ensure_ascii=False,separators=(',',':'));require(verify(s.encode(),rawhash(s),version,grid,policy)['status']=='REFUSED')
    require(verify(data+b' ',snapshot,version,grid,policy)['status']=='REFUSED')
    bad='sha256:'+'0'*64
    for pins in [(bad,grid,policy),(version,bad,policy),(version,grid,bad)]:require(verify(data,snapshot,*pins)['status']=='REFUSED')
    print('ACCEPTED actual browser robust acquisition policy (6 → 2 abstract units) via independent offline archive; REJECTED',len(mutants),'derived mutations and four pin controls.')
if __name__=='__main__':main()
