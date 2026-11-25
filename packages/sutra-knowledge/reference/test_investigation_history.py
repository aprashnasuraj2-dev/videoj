#!/usr/bin/env python3
import json,subprocess,sys
from copy import deepcopy
from pathlib import Path
from hashlib import sha256
from verify_conflict import require
from verify_investigation_history import verify
def main():
    require(len(sys.argv)==3)
    root=Path(sys.argv[1]);archive=Path(sys.argv[2]).resolve()
    data=(root/'living-history.json').read_bytes();pin=(root/'living-history.sha256').read_text(encoding='ascii').strip()
    r=verify(data,pin);require(r['status']=='VERIFIED')
    v=r['result'];require(len(v['versions'])==3 and len(v['branches'])==2 and v['decisionAuthority']=='NONE')
    require(v['versions'][0]['parent'] is None and all(x['parent']==v['root'] for x in v['versions'][1:]))
    require({b['head'] for b in v['branches']}=={x['digest'] for x in v['versions'][1:]})
    cli=subprocess.run([sys.executable,'-I','-S',str(archive),str((root/'living-history.json').resolve()),'--history','--pin',pin],capture_output=True,text=True,check=True)
    require(json.loads(cli.stdout)==r)
    require(verify(data+b' ',pin)['status']=='REFUSED')
    require(verify(data,'sha256:'+'0'*64)['status']=='REFUSED')
    h=json.loads(data);mutants=[]
    for change in ('reverse','orphan','duplicate','unreachable','duplicate_branch','forged','wrong_version_pin'):
        m=deepcopy(h)
        if change=='reverse':m['versions'].reverse()
        elif change=='orphan':m['versions'].pop(0)
        elif change=='duplicate':m['versions'].append(m['versions'][0])
        elif change=='unreachable':m['branches'][0]['head']=v['root']
        elif change=='duplicate_branch':m['branches'].append(m['branches'][0])
        elif change=='forged':m['result']='VERIFIED'
        else:m['versions'][1]['digest']='sha256:'+'0'*64
        raw=json.dumps(m,ensure_ascii=False,separators=(',',':')).encode('utf-8')
        require(verify(raw,'sha256:'+sha256(raw).hexdigest())['status']=='REFUSED');mutants.append(change)
    print('ACCEPTED actual browser 3-version, 2-branch history via independent Python archive; rejected',len(mutants),'structural mutations plus pin controls.')
if __name__=='__main__':main()
