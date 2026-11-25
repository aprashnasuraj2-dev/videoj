"""Two actual browser reconstructions and independently repinned mutations."""
import json,sys,subprocess
from pathlib import Path
from copy import deepcopy
from verify_conflict import rawhash,require
from verify_controlled_roundtrip import verify
def main():
    root=Path(sys.argv[1]);archive=Path(sys.argv[2]).resolve()
    for name in ('before','after'):
        path=root/f'living-roundtrip-{name}.json';data=path.read_bytes()
        pin=(root/f'living-roundtrip-{name}.sha256').read_text().strip();vp=(root/f'living-roundtrip-{name}-version.sha256').read_text().strip()
        r=verify(data,pin,vp);require(r['status']=='VERIFIED');result=r['result']
        require(len(result['candidates'])==5 and len(result['differences'])==10 and any(c['admission']=='REFUSED' and c['computation'] is None for c in result['candidates']))
        require(result['decisionAuthority']=='NONE' and all(x['interpretationEquivalence']=='NOT_ESTABLISHED' for x in result['differences']))
        if name=='after':
            require(any(q['facet']=='time' and q['status']=='SOURCE_LINKED_DECLARATION' for c in result['candidates'] for q in c['qualifiers']))
            require(any(q['facet']=='negation' and q['status']=='UNSUPPORTED_DECLARATION' for c in result['candidates'] for q in c['qualifiers']))
        run=subprocess.run([sys.executable,'-I','-S',str(archive),str(path.resolve()),'--roundtrip','--pin',pin,'--version-pin',vp],capture_output=True,text=True,check=True);require(json.loads(run.stdout)==r)
        original=json.loads(data);mutants=[]
        def mutate(fn):
            m=deepcopy(original);fn(m['result']);require(m!=original);mutants.append(m)
        mutate(lambda m:m.__setitem__('decisionAuthority','VERIFIED'))
        mutate(lambda m:m['candidates'].pop())
        mutate(lambda m:m['differences'][0].__setitem__('interpretationEquivalence','EQUIVALENT'))
        mutate(lambda m:next(c for c in m['candidates'] if c['computation'])['computation']['steps'][-1].__setitem__('statement','Invented instruction'))
        mutate(lambda m:next(c for c in m['candidates'] if c['computation'])['computation']['steps'].pop())
        mutate(lambda m:next(c for c in m['candidates'] if c['computation'])['questionSelection'].__setitem__('unselectedPrefix','invented'))
        mutate(lambda m:m['candidates'][0]['qualifiers'].pop())
        mutate(lambda m:m['candidates'][0]['review'].__setitem__('entailment','VERIFIED'))
        for m in mutants:
            s=json.dumps(m,ensure_ascii=False,separators=(',',':'));require(verify(s.encode(),rawhash(s),vp)['status']=='REFUSED')
        require(verify(data+b' ',pin,vp)['status']=='REFUSED');require(verify(data,pin,'sha256:'+'0'*64)['status']=='REFUSED')
        print('ACCEPTED',name,'actual reconstruction; REJECTED',len(mutants),'repinned mutations and two pin controls.')
if __name__=='__main__':main()
