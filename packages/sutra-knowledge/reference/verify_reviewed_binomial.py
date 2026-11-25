#!/usr/bin/env python3
"""Independent Fraction/math.comb replay of a declared fixed-n binomial model."""
from fractions import Fraction
from math import comb
from hashlib import sha256
import re
from verify import canonical,keys
from verify_conflict import rawhash,require
from verify_reviewed_compiler import host,pin
from verify_living_version import reconstruct,check_wire,ERRORS
VERSION='sutra-reviewed-binomial/v1'
MAX_BYTES=262144
DESIGN=('binaryOutcome','fixedSampleSize','independentTrials','commonProbability','selectionAndMissingness','hypothesisPrespecified','multiplicityFamilyComplete')
QUAL='Exact inclusive one-sided binomial tail under a declared fixed-n common-probability independent-trial null model. Bonferroni threshold uses the caller-declared family size; completeness is not verified. Tail probability is not the probability the hypothesis is true; threshold crossing is not causal, practical, clinical, or generalizable evidence. Source truth, numerator subset relation, design, selection, missingness, prespecification, multiplicity, power and applicability are not established.'
def wire(f):return f'{f.numerator}/{f.denominator}'
def prob(s):
    require(isinstance(s,str) and re.fullmatch(r'(?:0|[1-9][0-9]{0,6})/[1-9][0-9]{0,6}',s))
    n,d=map(int,s.split('/'));require(0<=n<=d<=1000000);return Fraction(n,d)
def count(b):
    require(b['type']['kind']=='count' and not any(b['type']['dimension']) and b['span']['origin']=='source_assertion')
    f=Fraction(b['value']);require(f.denominator==1 and 0<=f<=256);return int(f)
def calculate(vtext,vpin,ptext,ppin):
    require(pin(ppin) and rawhash(ptext)==ppin)
    replay=reconstruct(vtext,vpin);v=check_wire(vtext,6);p=check_wire(ptext,6)
    require(keys(p,('version','versionDigest','successBinding','trialBinding','nullProbability','alternative','familyAlpha','familySize','design')) and type(p['version']) is int and p['version']==1 and p['versionDigest']==vpin and p['alternative'] in ('greater','less') and type(p['familySize']) is int and 1<=p['familySize']<=1000 and keys(p['design'],DESIGN) and all(p['design'][k] in ('DECLARED_NOT_VERIFIED','UNRESOLVED') for k in DESIGN))
    require(isinstance(p['successBinding'],str) and isinstance(p['trialBinding'],str) and p['successBinding']!=p['trialBinding'] and any(c['admission']=='ADMITTED' for c in replay['candidates']))
    _,bindings,_=host(v['contractText'],v['contractPin']);a,b=bindings[p['successBinding']],bindings[p['trialBinding']];k,n=count(a),count(b)
    require(0<n and k<=n and a['type']==b['type'])
    null,alpha=prob(p['nullProbability']),prob(p['familyAlpha']);require(0<alpha<1)
    threshold=alpha/p['familySize'];indices=range(k,n+1) if p['alternative']=='greater' else range(0,k+1)
    tail=sum((comb(n,i)*null**i*(1-null)**(n-i) for i in indices),Fraction(0))
    unresolved=[k for k in DESIGN if p['design'][k]=='UNRESOLVED']
    return dict(version=VERSION,versionDigest=vpin,planDigest=ppin,counts=dict(successes=k,trials=n,successBinding=a['id'],trialBinding=b['id'],declaredScope=a['type']['scope']),nullProbability=wire(null),alternative=p['alternative'],observedProportion=wire(Fraction(k,n)),exactOneSidedTail=wire(tail),familyAlpha=wire(alpha),familySize=p['familySize'],perTestAlpha=wire(threshold),mathematicalThreshold='TAIL_AT_OR_BELOW_DECLARED_THRESHOLD' if tail<=threshold else 'TAIL_ABOVE_DECLARED_THRESHOLD',design=p['design'],unresolvedDesign=unresolved,interpretation='DESIGN_UNRESOLVED_CONDITIONAL_CALCULATION_ONLY' if unresolved else 'DECLARED_MODEL_ONLY_NOT_INDEPENDENTLY_VERIFIED',decisionAuthority='NONE',qualification=QUAL)
def verify(data,expected,vpin,ppin):
    if not all(pin(p) for p in (expected,vpin,ppin)):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        b=check_wire(data.decode('utf-8',errors='strict'),40);require(keys(b,('versionText','versionDigest','planText','planDigest','result')) and b['versionDigest']==vpin and b['planDigest']==ppin)
        r=calculate(b['versionText'],vpin,b['planText'],ppin);require(canonical(r)==canonical(b['result']))
        return dict(status='VERIFIED',profile=VERSION,result=r,qualification='Independent conditional binomial arithmetic replay. Sampling assumptions, source truth, statistical applicability and authority are not verified.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
