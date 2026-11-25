#!/usr/bin/env python3
"""Independent Fraction interval enclosure over admitted reviewed DAGs."""
from fractions import Fraction
from hashlib import sha256
from verify import canonical,keys
from verify_conflict import rawhash,require
from verify_reviewed_compiler import audit,host,pin
from verify_living_version import reconstruct,check_wire,ERRORS
from verify_world_grid import rational
VERSION='sutra-reviewed-interval/v1'
MAX_BYTES=262144
QUAL='Exact rational conservative interval enclosure over the admitted formulas and explicitly declared inclusive hypothetical input ranges. Repeated DAG identity permits narrow algebraic refinements only. Overlapping enclosures do not prove a reversal; shared dependency may overestimate uncertainty. A possible zero divisor is unresolved. No confidence interval, probability, calibration, empirical support, or professional authority.'
YES='HOLDS_FOR_ALL_DECLARED_VALUES'
NO='REFUTED_FOR_ALL_DECLARED_VALUES'
MAYBE='NOT_RESOLVED_BY_INTERVAL_ENCLOSURE'
def wire_range(r):return dict(lower=f'{r[0].numerator}/{r[0].denominator}',upper=f'{r[1].numerator}/{r[1].denominator}')
def checked(xs):
    if any(x.numerator.bit_length()>512 or x.denominator.bit_length()>512 for x in xs):raise ArithmeticError('INTERVAL_ARITHMETIC_LIMIT')
    return (min(xs),max(xs))
def derive(op,a,b,same):
    if op=='div' and b[0]<=0<=b[1]:raise ArithmeticError('INTERVAL_ZERO_POSSIBLE')
    if same and op=='sub':return (Fraction(0),Fraction(0))
    if same and op=='div':return (Fraction(1),Fraction(1))
    if op=='add':return checked([a[0]+b[0],a[1]+b[1]])
    if op=='sub':return checked([a[0]-b[1],a[1]-b[0]])
    if op=='mul' and same:return checked([a[0]**2,a[1]**2]+([Fraction(0)] if a[0]<=0<=a[1] else []))
    if op=='mul':return checked([x*y for x in a for y in b])
    if op=='div':return checked([x/y for x in a for y in b])
    raise ValueError('op')
def compare(op,a,b,same):
    if same:return YES if op in ('eq','le','ge') else NO
    lo,hi=a;bl,bh=b
    yes,no={
       'gt':(lo>bh,hi<=bl),'ge':(lo>=bh,hi<bl),'lt':(hi<bl,lo>=bh),'le':(hi<=bl,lo>bh),
       'eq':(lo==hi==bl==bh,lo>bh or hi<bl)
    }[op]
    return YES if yes else NO if no else MAYBE
def calculate(version_text,version_pin,plan_text,plan_pin):
    require(pin(plan_pin) and rawhash(plan_text)==plan_pin)
    replay=reconstruct(version_text,version_pin);v=check_wire(version_text,6);p=check_wire(plan_text,6)
    _,bindings,_=host(v['contractText'],v['contractPin'])
    require(keys(p,('version','versionDigest','ranges')) and type(p['version']) is int and p['version']==1 and p['versionDigest']==version_pin and isinstance(p['ranges'],list) and 1<=len(p['ranges'])<=8)
    intervals={};points={i:Fraction(b['value']) for i,b in bindings.items()}
    for r in p['ranges']:
        require(keys(r,('bindingId','lower','upper')) and r['bindingId'] in points and r['bindingId'] not in intervals)
        lo,hi=(Fraction(rational(r[k])) for k in ('lower','upper'));require(lo<=points[r['bindingId']]<=hi);intervals[r['bindingId']]=(lo,hi)
    require(any(c['admission']=='ADMITTED' for c in replay['candidates']))
    proposals={p['id']:p['proposalText'] for p in check_wire(v['batchText'],5)['proposals']};candidates=[]
    for c in replay['candidates']:
        i=c['id'];base=c['obligations']['computation']
        if base not in ('CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED'):
            candidates.append(dict(id=i,baseline=base,status='BASELINE_UNRESOLVED_NOT_EVALUATED',nodes=[],usedRanges=[]));continue
        compiled=audit(v['contractText'],v['contractPin'],proposals[i])['result'];nodes={n['id']:n for n in compiled['nodes']};memo={};rows=[];used=set()
        def visit(id):
            if id in memo:return memo[id]
            n=nodes[id];value=None;status='ENCLOSED';reason=None
            if n['kind']=='input':
                b=n['bindingId'];value=intervals.get(b,(points[b],points[b]))
                if b in intervals:used.add(b)
            else:
                a,b=(visit(d)[0] for d in n['args'])
                if a is None or b is None:status='UNRESOLVED_INTERVAL';reason='DEPENDENCY_UNRESOLVED'
                elif n['kind']=='constraint':status=compare(n['op'],a,b,n['args'][0]==n['args'][1])
                else:
                    try:value=derive(n['op'],a,b,n['args'][0]==n['args'][1])
                    except ArithmeticError as e:status='UNRESOLVED_INTERVAL';reason=str(e)
            memo[id]=(value,status);rows.append(dict(id=id,kind=n['kind'],operator=n.get('op'),bounds=wire_range(value) if value is not None else None,status=status,reason=reason));return memo[id]
        _,status=visit(compiled['target']['id'])
        require(not(status==YES and base=='CONDITIONALLY_REFUTED' or status==NO and base=='CONDITIONALLY_SATISFIED'))
        candidates.append(dict(id=i,baseline=base,status=status,nodes=rows,usedRanges=sorted(used)))
    return dict(version=VERSION,versionDigest=version_pin,planDigest=plan_pin,ranges=[dict(bindingId=i,**wire_range(r)) for i,r in sorted(intervals.items())],candidates=candidates,decisionAuthority='NONE',qualification=QUAL)
def verify(data,expected,version_pin,plan_pin):
    if not all(pin(p) for p in (expected,version_pin,plan_pin)):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        b=check_wire(data.decode('utf-8',errors='strict'),40)
        require(keys(b,('versionText','versionDigest','planText','planDigest','result')) and b['versionDigest']==version_pin and b['planDigest']==plan_pin)
        r=calculate(b['versionText'],version_pin,b['planText'],plan_pin);require(canonical(r)==canonical(b['result']))
        return dict(status='VERIFIED',profile=VERSION,result=r,qualification='Independent exact conservative interval replay. No statistical confidence, empirical calibration or decision authority.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
