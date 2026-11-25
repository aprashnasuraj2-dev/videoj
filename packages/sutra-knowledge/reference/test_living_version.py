#!/usr/bin/env python3
"""Exact actual browser version and impact artifact parity, with independent pins."""
import json,sys,subprocess
from copy import deepcopy
from pathlib import Path
from verify import canonical,keys
from verify_conflict import bounded_load,rawhash,require
from verify_living_version import verify,compare
def main():
    require(len(sys.argv)==3)
    root=Path(sys.argv[1]);archive=Path(sys.argv[2]).resolve()
    b=(root/'living-before.json').read_bytes();a=(root/'living-after.json').read_bytes()
    bp=(root/'living-before.sha256').read_text(encoding='ascii').strip();ap=(root/'living-after.sha256').read_text(encoding='ascii').strip()
    for data,pin,name in [(b,bp,'living-before.json'),(a,ap,'living-after.json')]:
        r=verify(data,pin);require(r['status']=='VERIFIED')
        proc=subprocess.run([sys.executable,'-I','-S',str(archive),str((root/name).resolve()),'--living','--pin',pin],capture_output=True,text=True,check=True)
        require(json.loads(proc.stdout)==r)
        require(verify(data+b' ',pin)['status']=='REFUSED')
        require(verify(data,'sha256:'+'0'*64)['status']=='REFUSED')
        altered=json.loads(data);altered['result']='VERIFIED';t=json.dumps(altered,ensure_ascii=False,separators=(',',':'))
        require(verify(t.encode('utf-8'),rawhash(t))['status']=='REFUSED')
    actual=bounded_load((root/'living-impact.json').read_text(encoding='utf-8'),1048576,40)
    def check(x):
        try:
            require(keys(x,('beforeVersion','beforeDigest','afterVersion','afterDigest','impact')) and x['beforeVersion'].encode('utf-8')==b and x['afterVersion'].encode('utf-8')==a and x['beforeDigest']==bp and x['afterDigest']==ap)
            expected=compare(x['beforeVersion'],bp,x['afterVersion'],ap)
            claimed=deepcopy(x['impact'])
            # Producer-specific refusal diagnostics are not independent proof.
            # Only independently confirmed refused candidates are normalized.
            refused={r['id'] for r in expected['missing'] if r['reason']=='REFUSED'}
            for row in claimed['missing']:
                if row['id'] in refused:
                    require(isinstance(row['reason'],str) and len(row['reason'])<=128);row['reason']='REFUSED'
            return canonical(expected)==canonical(claimed)
        except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError,StopIteration):return False
    require(check(actual));expected=compare(b.decode('utf-8'),bp,a.decode('utf-8'),ap)
    require(expected['sourceChanges']==[dict(id='report_b',change='CHANGED')])
    require(sum(r['outcome']=='CONDITIONAL_RESULT_REVERSED' for r in expected['candidates'])==4)
    mutants=[]
    for k,v in [('decisionAuthority','MAJORITY'),('sourceChanges',[]),('affectedDependencyNodes',[]),('questionChanged',True),('nextReview',[]),('qualification','truth established'),('recomputation','INCREMENTAL')]:
        m=deepcopy(actual);m['impact'][k]=v;mutants.append(m)
    for k,v in [('outcome','CONDITIONAL_RESULT_SURVIVES'),('dependencyAffected',False),('reviewRequired',False),('after','VERIFIED')]:
        m=deepcopy(actual);m['impact']['candidates'][0][k]=v;mutants.append(m)
    m=deepcopy(actual);m['afterDigest']=bp;mutants.append(m)
    m=deepcopy(actual);m['beforeVersion']+=' ';mutants.append(m)
    for m in mutants:require(canonical(m)!=canonical(actual) and not check(m))
    print('ACCEPTED actual browser before/after pinned versions via independent Python archive; four conditional reversals and exact scoped impact; REJECTED',len(mutants),'impact mutations plus pin/schema controls; refusal diagnostic excluded.')
if __name__=='__main__':main()
