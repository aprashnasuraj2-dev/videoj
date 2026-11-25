#!/usr/bin/env python3
"""Independent finite robust acquisition replay over declared synthetic grids."""
from hashlib import sha256
from verify import canonical,keys
from verify_conflict import rawhash,require
from verify_reviewed_compiler import pin,ident
from verify_living_version import check_wire,ERRORS
from verify_world_grid import calculate_grid
VERSION='sutra-robust-acquisition/v1'
MAX_BYTES=262144
STATES=('constraint_satisfied','constraint_refuted')
QUAL='Exact minimax of declared abstract terminal loss plus upper-bound acquisition/read costs under a worst-branch exposure cap. Overlapping possible readings and failed observations are adversarial, not probabilistic; no correlation constraints across actions, no physical feasibility, real cost, completeness, recommendation or execution authority. All programs and worlds are supplied synthetic cases.'
def amount(x):return type(x) is int and 0<=x<=1000000
def distinct(xs):return len(xs)==len(set(xs))
def calculate(version_text,version_pin,grid_text,grid_pin,policy_text,policy_pin):
    require(pin(policy_pin) and rawhash(policy_text)==policy_pin)
    grid=calculate_grid(version_text,version_pin,grid_text,grid_pin)
    p=check_wire(policy_text,10);contract=check_wire(check_wire(version_text,6)['contractText'],9)
    require(keys(p,('version','versionDigest','gridDigest','costUnit','exposureUnit','exposureBudget','sourceCosts','initiallyAcquired','decisions','actions')) and type(p['version']) is int and p['version']==1 and p['versionDigest']==version_pin and p['gridDigest']==grid_pin and ident(p['costUnit']) and ident(p['exposureUnit']) and amount(p['exposureBudget']))
    base=dict(version=VERSION,versionDigest=version_pin,gridDigest=grid_pin,policyDigest=policy_pin,coverage=grid['coverage'],decisionAuthority='NONE')
    if grid['coverage']['truncated'] or grid['coverage']['totalCandidateCells']>16 or any(r['state'] not in STATES for w in grid['worlds'] for r in w['rows']):
        return dict(base,status='UNRESOLVED_OR_EXCESSIVE_GRID',qualification='No plan: complete decisive grid required, with at most 16 candidate-world cells.')
    cells=[dict(id=w['id']+':'+r['id'],worldId=w['id'],candidateId=r['id'],state=r['state'],assignment=w['assignment']) for w in grid['worlds'] for r in w['rows']]
    source_ids={s['id'] for s in contract['sources']};bindings={b['id']:b['span']['sourceId'] for b in contract['bindings']};axes={a['bindingId']:a['values'] for a in grid['axes']}
    require(isinstance(p['sourceCosts'],list) and len(p['sourceCosts'])<=8 and all(keys(s,('id','costUpper')) and s['id'] in source_ids and amount(s['costUpper']) for s in p['sourceCosts']) and distinct([s['id'] for s in p['sourceCosts']]))
    costs={s['id']:s['costUpper'] for s in p['sourceCosts']}
    require(isinstance(p['initiallyAcquired'],list) and distinct(p['initiallyAcquired']) and all(s in costs for s in p['initiallyAcquired']))
    decisions=p['decisions']
    require(isinstance(decisions,list) and 2<=len(decisions)<=6 and all(keys(d,('id','loss')) and ident(d['id']) and keys(d['loss'],STATES) and all(amount(d['loss'][s]) for s in STATES) for d in decisions) and distinct([d['id'] for d in decisions]) and any(d['id']=='abstain' for d in decisions))
    require(isinstance(p['actions'],list) and len(p['actions'])<=6)
    actions={}
    for a in p['actions']:
        require(keys(a,('id','sourceId','bindingId','readCostUpper','exposure','outcomes')) and ident(a['id']) and a['id'] not in actions and a['sourceId'] in costs and bindings.get(a['bindingId'])==a['sourceId'] and a['bindingId'] in axes and amount(a['readCostUpper']) and amount(a['exposure']) and isinstance(a['outcomes'],list))
        values=axes[a['bindingId']]
        require(len(a['outcomes'])==len(values) and all(keys(o,('value','labels')) and o['value'] in values and isinstance(o['labels'],list) and 1<=len(o['labels'])<=4 and all(ident(l) for l in o['labels']) and distinct(o['labels']) for o in a['outcomes']) and distinct([o['value'] for o in a['outcomes']]))
        by_value={o['value']:o['labels'] for o in a['outcomes']};require(len({l for labels in by_value.values() for l in labels})<=6)
        actions[a['id']]=dict(a,labels={c['id']:by_value[next(x['value'] for x in c['assignment'] if x['bindingId']==a['bindingId'])] for c in cells})
    # Independent set-based recursion. No producer masks, cached report or
    # declared terminal verdict is trusted; terminal losses rebuilt per cell.
    memo={}
    cell_map={c['id']:c for c in cells}
    def ordered(active):return [c['id'] for c in cells if c['id'] in active]
    def stop(active):
        choices=[dict(id=d['id'],worstLoss=max(d['loss'][cell_map[i]['state']] for i in active)) for d in decisions]
        choices.sort(key=lambda d:(d['worstLoss'],d['id']!='abstain',d['id']))
        return dict(kind='stop',decision=choices[0]['id'],cells=ordered(active),worstObjective=choices[0]['worstLoss'],worstExposure=0,alternatives=choices)
    def visit(active,remaining,acquired,left):
        key=(active,remaining,acquired,left)
        if key in memo:return memo[key]
        require(len(memo)<12000)
        best=stop(active)
        for aid in sorted(remaining):
            a=actions[aid]
            if a['exposure']>left:continue
            labels=sorted({label for i in active for label in a['labels'][i]})
            partitions={l:frozenset(i for i in active if l in a['labels'][i]) for l in labels}
            if all(sub==active for sub in partitions.values()):continue
            source=a['sourceId'];acq=0 if source in acquired else costs[source]
            branches=[dict(outcome=l,next=visit(sub,remaining-{aid},acquired|{source},left-a['exposure'])) for l,sub in partitions.items()]
            candidate=dict(kind='observe',actionId=aid,sourceId=source,cells=ordered(active),acquisitionCostUpper=acq,readCostUpper=a['readCostUpper'],exposure=a['exposure'],worstObjective=acq+a['readCostUpper']+max(b['next']['worstObjective'] for b in branches),worstExposure=a['exposure']+max(b['next']['worstExposure'] for b in branches),branches=branches)
            if candidate['worstObjective']<best['worstObjective']:best=candidate
        memo[key]=best
        return best
    all_cells=frozenset(cell_map);no=stop(all_cells);plan=visit(all_cells,frozenset(actions),frozenset(p['initiallyAcquired']),p['exposureBudget'])
    lower=max(min(d['loss'][c['state']] for d in decisions) for c in cells)
    available=[dict(id=aid,outcomeCells=[dict(label=l,cells=[c['id'] for c in cells if l in a['labels'][c['id']]]) for l in sorted({l for ls in a['labels'].values() for l in ls})]) for aid,a in sorted(actions.items())]
    return dict(base,status='FINITE_DECLARED_POLICY',costUnit=p['costUnit'],exposureUnit=p['exposureUnit'],exposureBudget=p['exposureBudget'],cells=cells,availableActions=available,plan=plan,noObservation=no,perfectInformationLowerBound=lower,worstCaseImprovement=no['worstObjective']-plan['worstObjective'],statesEvaluated=len(memo),qualification=QUAL)
def verify(data,expected,version_pin,grid_pin,policy_pin):
    if not all(pin(p) for p in (expected,version_pin,grid_pin,policy_pin)):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        b=check_wire(data.decode('utf-8',errors='strict'),40)
        require(keys(b,('versionText','versionDigest','gridText','gridDigest','policyText','policyDigest','result')) and b['versionDigest']==version_pin and b['gridDigest']==grid_pin and b['policyDigest']==policy_pin)
        result=calculate(b['versionText'],version_pin,b['gridText'],grid_pin,b['policyText'],policy_pin)
        require(canonical(result)==canonical(b['result']))
        return dict(status='VERIFIED',profile=VERSION,result=result,qualification='Independent finite conditional and robust policy replay; no real costs, model completeness, empirical truth, action or disclosure authority.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
