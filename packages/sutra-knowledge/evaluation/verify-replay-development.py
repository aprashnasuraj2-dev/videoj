"""Matched structural replay using independent verifier and separately retained child pin."""
import hashlib,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'reference'))
from verify_evidence_revision import verify as revision
from verify_evidence_recovery import verify as recovery
blob=Path(__file__).with_name('replay-development-cases.json').read_bytes()
digest=hashlib.sha1(b'blob '+str(len(blob)).encode()+b'\0'+blob).hexdigest()
assert digest=='e27ca033a7d7bc7d248ffb1e2b509465adb87e5d'
manifest=json.loads(blob)
data=json.load(sys.stdin)
assert data['profile']=='sutra-replay-development-results/v1' and data['frozenBlob']==digest
assert len(data['rows'])==len(manifest['cases'])==20
rows=[]
for case,row in zip(manifest['cases'],data['rows']):
    assert case['id']==row['id'] and case['kind']==row['kind']
    verify=revision if case['kind']=='revision' else recovery
    assert len(row['pins'])==(4 if case['kind']=='revision' else 6)
    result=verify(row['raw'].encode('utf-8'),*row['pins'])
    structural='accept' if result['status']=='VERIFIED' else 'refuse'
    assert structural==case['expected']['structural'],(case['id'],result)
    assert row['strict']==case['expected']['strict'],case['id']
    rows.append(dict(id=case['id'],strict=row['strict'],structural=structural,hashOnly=row['hashOnly'],declaredPins=row['declaredPins']))
adversaries=[r for r,c in zip(rows,manifest['cases']) if c['expected']['structural']=='refuse']
assert len(adversaries)==16
print(json.dumps(dict(profile='sutra-replay-independent/v1',frozenBlob=digest,matched=len(rows),adversaryCount=len(adversaries),falseAccepts={k:sum(r[k]=='accept' for r in adversaries) for k in ('strict','structural','hashOnly','declaredPins')},intentionalContractDifferences=sum(r['strict']!=r['structural'] for r in rows),qualification='Developer-labeled synthetic inputs; structural verification includes externally retained child pin; no authentication or held-out claim.',rows=rows)))
