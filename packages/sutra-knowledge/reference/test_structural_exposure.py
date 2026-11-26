#!/usr/bin/env python3
"""Independent portable exposure replay for the frozen corpus and actual browser downloads."""
import json,sys,subprocess
from pathlib import Path
from copy import deepcopy
from verify_conflict import require,rawhash
from verify_structural_exposure import verify
def check(data,pin,version):
    result=verify(data,pin,version);require(result['status']=='VERIFIED')
    o=json.loads(data);count=0
    for mutate in (
        lambda x:x['result'].update(decisionAuthority='VERIFIED'),
        lambda x:x['result']['counts'].update(conservativeCohorts=99),
        lambda x:x['result']['cut'].update(minimumCohorts=99),
        lambda x:x['result']['cut'].update(sets=[['invented']]),
        lambda x:x['result']['cohorts'][0].update(independence='ESTABLISHED'),
        lambda x:x['result']['candidates'][0].update(ancestryCompleteness='COMPLETE'),
    ):
        m=deepcopy(o);mutate(m);wire=json.dumps(m,ensure_ascii=False,separators=(',',':'))
        require(verify(wire.encode(),rawhash(wire),version)['status']=='REFUSED');count+=1
    bad='sha256:'+'0'*64
    for p,v in ((bad,version),(pin,bad)):require(verify(data,p,v)['status']=='REFUSED');count+=1
    return result,count
def main():
    if len(sys.argv)==3:
        root=Path(sys.argv[1]);archive=Path(sys.argv[2]).resolve();count=0
        for domain in ('finance','engineering'):
            stem=root/('guided-'+domain+'-exposure');path=stem.with_suffix('.json')
            data=path.read_bytes();pin=stem.with_suffix('.sha256').read_text().strip();version=Path(str(stem)+'-version.sha256').read_text().strip()
            r,n=check(data,pin,version);count+=n
            require(r['result']['cut']['minimumCohorts']==1)
            proc=subprocess.run([sys.executable,'-I','-S',str(archive),str(path.resolve()),'--exposure','--pin',pin,'--version-pin',version],capture_output=True,text=True,check=True)
            require(json.loads(proc.stdout)==r)
        print(json.dumps(dict(actualBrowserExposure=2,archiveMatches=2,refused=count)));return
    cases=json.load(sys.stdin)['results'];require(len(cases)==30);count=0
    for c in cases:
        r,n=check(c['bundleText'].encode(),c['snapshotPin'],c['versionDigest']);count+=n
        require(r['result']==c['report'])
    print(json.dumps(dict(independentPortableExposure=30,refused=count)))
if __name__=='__main__':main()
