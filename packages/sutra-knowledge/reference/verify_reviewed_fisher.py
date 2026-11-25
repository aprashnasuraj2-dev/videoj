"""Independent exact two-group conditional test over admitted reviewed counts."""
from fractions import Fraction
from math import comb
from hashlib import sha256
from verify import canonical,keys
from verify_conflict import rawhash,require
from verify_reviewed_compiler import host,pin
from verify_living_version import reconstruct,check_wire,ERRORS
from verify_reviewed_binomial import count,prob,wire
VERSION='sutra-reviewed-fisher/v1'
MAX_BYTES=262144
DESIGN=('binaryOutcome','distinctGroups','independentObservations','comparableOutcomeDefinition','samplingOrAssignment','selectionAndMissingness','hypothesisPrespecified','multiplicityFamilyComplete','confoundingAndApplicability')
QUAL='Exact conditional hypergeometric probability under the declared equal-odds null with fixed margins. Two-sided means probability ordering including ties, not twice a one-sided tail. Distinct spans and declared scopes do not establish disjoint samples, common outcome definition, exchangeability, sampling, randomization, independence, absence of confounding or causal applicability. The observed difference is descriptive only. Bonferroni uses declared family size; completeness is not verified. No hypothesis truth, practical effect, clinical or external action authority.'
def calculate(vtext,vpin,ptext,ppin):
    require(pin(ppin) and rawhash(ptext)==ppin)
    replay=reconstruct(vtext,vpin);v=check_wire(vtext,6);p=check_wire(ptext,6)
    require(keys(p,('version','versionDigest','groupA','groupB','alternative','familyAlpha','familySize','design')) and type(p['version']) is int and p['version']==1 and p['versionDigest']==vpin and p['alternative'] in ('greater','less','two-sided-probability-order') and type(p['familySize']) is int and 1<=p['familySize']<=1000 and keys(p['design'],DESIGN) and all(p['design'][k] in ('DECLARED_NOT_VERIFIED','UNRESOLVED') for k in DESIGN))
    require(all(keys(p[g],('successBinding','trialBinding')) for g in ('groupA','groupB')))
    ids=[p[g][k] for g in ('groupA','groupB') for k in ('successBinding','trialBinding')]
    require(all(isinstance(i,str) for i in ids) and len(set(ids))==4 and any(c['admission']=='ADMITTED' for c in replay['candidates']))
    _,bindings,_=host(v['contractText'],v['contractPin']);a,an,b,bn=bs=[bindings[i] for i in ids];ka,na,kb,nb=map(count,bs)
    require(0<na and 0<nb and ka<=na and kb<=nb and na+nb<=256 and a['type']==an['type'] and b['type']==bn['type'] and a['type']['scope']!=b['type']['scope'] and a['type']['unit']==b['type']['unit'])
    for i,x in enumerate(bs):
        for y in bs[i+1:]:
            s,t=x['span'],y['span'];require(s['sourceId']!=t['sourceId'] or max(s['start'],t['start'])>=min(s['end'],t['end']))
    alpha=prob(p['familyAlpha']);require(0<alpha<1);threshold=alpha/p['familySize']
    k=ka+kb;n=na+nb
    masses={x:Fraction(comb(k,x)*comb(n-k,na-x),comb(n,na)) for x in range(max(0,na-(n-k)),min(na,k)+1)}
    require(sum(masses.values())==1);observed=masses[ka]
    tail=sum((mass for x,mass in masses.items() if (x>=ka if p['alternative']=='greater' else x<=ka if p['alternative']=='less' else mass<=observed)),Fraction(0))
    unresolved=[k for k in DESIGN if p['design'][k]=='UNRESOLVED']
    return dict(version=VERSION,versionDigest=vpin,planDigest=ppin,groupA=dict(successes=ka,trials=na,successBinding=ids[0],trialBinding=ids[1],declaredScope=a['type']['scope']),groupB=dict(successes=kb,trials=nb,successBinding=ids[2],trialBinding=ids[3],declaredScope=b['type']['scope']),alternative=p['alternative'],observedProportionA=wire(Fraction(ka,na)),observedProportionB=wire(Fraction(kb,nb)),observedDifferenceAminusB=wire(Fraction(ka,na)-Fraction(kb,nb)),feasibleTables=len(masses),observedTableProbability=wire(observed),exactConditionalTail=wire(tail),familyAlpha=wire(alpha),familySize=p['familySize'],perTestAlpha=wire(threshold),mathematicalThreshold='TAIL_AT_OR_BELOW_DECLARED_THRESHOLD' if tail<=threshold else 'TAIL_ABOVE_DECLARED_THRESHOLD',design=p['design'],unresolvedDesign=unresolved,interpretation='DESIGN_UNRESOLVED_CONDITIONAL_CALCULATION_ONLY' if unresolved else 'DECLARED_MODEL_ONLY_NOT_INDEPENDENTLY_VERIFIED',decisionAuthority='NONE',qualification=QUAL)
def verify(data,expected,vpin,ppin):
    if not all(pin(p) for p in (expected,vpin,ppin)):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        b=check_wire(data.decode('utf-8',errors='strict'),40);require(keys(b,('versionText','versionDigest','planText','planDigest','result')) and b['versionDigest']==vpin and b['planDigest']==ppin)
        r=calculate(b['versionText'],vpin,b['planText'],ppin);require(canonical(r)==canonical(b['result']))
        return dict(status='VERIFIED',profile=VERSION,result=r,qualification='Independent conditional two-group arithmetic replay; design, source truth, statistical applicability and authority are unverified.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
