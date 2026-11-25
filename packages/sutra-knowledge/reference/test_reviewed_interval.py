#!/usr/bin/env python3
import json,sys,subprocess
from copy import deepcopy
from pathlib import Path
from verify_conflict import rawhash,require
from verify_reviewed_interval import verify
def main():
    root=Path(sys.argv[1]);archive=Path(sys.argv[2]).resolve()
    data=(root/'living-interval.json').read_bytes()
    pins=[(root/f'living-interval{suffix}.sha256').read_text().strip() for suffix in ('','-version','-plan')]
    r=verify(data,*pins);require(r['status']=='VERIFIED')
    require({c['id']:c['status'] for c in r['result']['candidates']}=={'normal_capacity':'HOLDS_FOR_ALL_DECLARED_VALUES','failure_capacity':'NOT_RESOLVED_BY_INTERVAL_ENCLOSURE'})
    cli=subprocess.run([sys.executable,'-I','-S',str(archive),str((root/'living-interval.json').resolve()),'--interval','--pin',pins[0],'--version-pin',pins[1],'--plan-pin',pins[2]],capture_output=True,text=True,check=True)
    require(json.loads(cli.stdout)==r)
    original=json.loads(data);mutants=[]
    for k,v in [('decisionAuthority','VERIFIED'),('qualification','95 percent confidence'),('ranges',[])]:
        m=deepcopy(original);m['result'][k]=v;mutants.append(m)
    m=deepcopy(original);m['result']['candidates'][0]['status']='HOLDS_FOR_ALL_DECLARED_VALUES';mutants.append(m)
    m=deepcopy(original);m['result']['candidates'][0]['nodes'][0]['bounds']=dict(lower='999/1',upper='999/1');mutants.append(m)
    m=deepcopy(original);m['result']['candidates'][0]['usedRanges']=[];mutants.append(m)
    for m in mutants:
        require(m!=original);s=json.dumps(m,ensure_ascii=False,separators=(',',':'));require(verify(s.encode(),rawhash(s),pins[1],pins[2])['status']=='REFUSED')
    require(verify(data+b' ',*pins)['status']=='REFUSED')
    for i in range(1,3):
        p=list(pins);p[i]='sha256:'+'0'*64;require(verify(data,*p)['status']=='REFUSED')
    print('ACCEPTED actual browser interval enclosure via independent Fraction verifier; REJECTED',len(mutants),'derived mutations and three pin controls.')
if __name__=='__main__':main()
