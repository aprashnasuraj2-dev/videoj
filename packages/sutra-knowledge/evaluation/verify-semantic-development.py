"""Independent rational arithmetic and matched vote metrics, not semantic annotation."""
import hashlib,json,sys
from collections import Counter
from fractions import Fraction
from pathlib import Path
blob=Path(__file__).with_name('semantic-development-v1.json').read_bytes()
digest=hashlib.sha1(b'blob '+str(len(blob)).encode()+b'\0'+blob).hexdigest()
assert digest=='609ad48d3d18c2ff620abeae7a3b52747aae78c1'
spec=json.loads(blob);data=json.load(sys.stdin)
assert data['profile']=='sutra-semantic-development-results/v1' and data['frozenBlob']==digest
assert len(spec['cases'])==len(data['rows'])==40
def compute(f,v):
    if f=='period': return (v['prior']>v['limit'],v['current']>v['limit'])
    if f=='inclusive': return (v['value']>v['limit'],v['value']>=v['limit'])
    if f=='denominator': return (v['outcome']/v['prior_population']>v['benchmark'],v['outcome']/v['population']>v['benchmark'])
    if f=='operator': return (v['x']+v['y']>v['limit'],v['x']*v['y']>v['limit'])
    if f=='relative': return (v['new']-v['old']>v['limit'],(v['new']-v['old'])/v['old']>v['limit'])
    if f=='direction': return (v['current']>v['prior'],v['current']<v['prior'])
    if f=='population': return (v['aggregate']>v['limit'],v['subgroup']>v['limit'])
    if f=='equivalent': return (v['limit']<v['x'],v['x']>v['limit'])
    raise AssertionError(f)
def state(b): return 'constraint_satisfied' if b else 'constraint_refuted'
def choose(vectors,voters):
    counts=Counter(vectors[k] for k in voters)
    winners=[s for s,n in counts.items() if n*2>len(voters)]
    return [k for k,s in vectors.items() if winners and s==winners[0]]
metrics={k:dict(abstained=0,wrongOnly=0,rightOnly=0,mixed=0,retainedWrong=0) for k in ('first','rawMajority','deduplicatedMajority','retainAll')}
distinguished=0;witness_cases=0;copies=0
for c,row in zip(spec['cases'],data['rows']):
    assert c['id']==row['id']
    base={k:Fraction(v) for k,v in c['inputs'].items()}
    worlds=[base]+[{**base,**{k:Fraction(v) for k,v in s['replacements'].items()}} for s in c['scenarios']]
    outcomes=[compute(c['family'],w) for w in worlds]
    signatures={};labels={};unique=[]
    for i,p in enumerate(c['programs']):
        signature=tuple(state(o[i]) for o in outcomes)
        assert list(signature)==p['expected'],(c['id'],p['id'],signature)
        unique.append(p['id']+'_0')
        for n in range(p['copies']):
            key=p['id']+'_'+str(n);signatures[key]=signature;labels[key]=p['semanticLabel']
    assert [r['id'] for r in row['observed']]==list(signatures)
    for r in row['observed']:
        assert tuple(r['signature'])==signatures[r['id']] and r['semanticLabel']==labels[r['id']],c['id']
    assert len({r['programDigest'] for r in row['observed']})==2,c['id']
    distinct=len(set(signatures.values()))>1
    assert distinct==row['distinct']==c['expectedDistinctSignature']
    pairs=sorted('|'.join(sorted((a,b))) for i,a in enumerate(signatures) for b in list(signatures)[i+1:] if signatures[a][0]==signatures[b][0] and signatures[a][1]!=signatures[b][1])
    assert pairs==row['pairs'],c['id']
    choices=dict(first=[next(iter(signatures))],rawMajority=choose(signatures,list(signatures)),deduplicatedMajority=choose(signatures,unique),retainAll=list(signatures))
    assert choices==row['selections'],c['id']
    for k,ids in choices.items():
        m=metrics[k];selected=[labels[i] for i in ids];right=selected.count('RIGHT');wrong=selected.count('WRONG')
        m['retainedWrong']+=wrong
        m['abstained' if not ids else 'mixed' if right and wrong else 'rightOnly' if right else 'wrongOnly']+=1
    distinguished+=distinct;witness_cases+=bool(pairs);copies+=len(signatures)
print(json.dumps(dict(profile='sutra-semantic-independent/v1',frozenBlob=digest,matched=40,distinctSignatureCases=distinguished,newWitnessCases=witness_cases,candidateInstances=copies,matchedEvaluations=copies*2,metrics=metrics,qualification='Developer-intended formulas only. Independent arithmetic, not independent semantic labels, no empirical accuracy or natural-language interpretation claim.')))
