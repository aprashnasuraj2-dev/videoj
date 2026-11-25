"""Independent finite stress-test subset optimization; fresh Python grid replay."""
from itertools import combinations
from hashlib import sha256
from verify import canonical,keys
from verify_conflict import rawhash,require
from verify_reviewed_compiler import host,pin
from verify_living_version import reconstruct,check_wire,ERRORS
from verify_world_grid import calculate_grid,BASE,DECISIVE
VERSION='sutra-semantic-probe-suite/v1'
MAX_BYTES=262144
QUAL='Selects an exact bounded review subset of already evaluated synthetic worlds. Structural duplicate programs do not multiply pair coverage; declared meanings remain distinct. Witness minimality is scoped to evaluated proper subsets of that assignment. Unsearched or unresolved worlds remain explicit. No reduction in grid evaluation work, equivalence, physical feasibility, semantic validity, source truth, or decision authority established.'
def calculate_suite(version_text,version_pin,plan_text,plan_pin):
    require(pin(plan_pin) and rawhash(plan_text)==plan_pin)
    p=check_wire(plan_text,6)
    require(keys(p,('version','versionDigest','gridPlanText','gridPlanDigest','maxReviewWorlds')) and type(p['version']) is int and p['version']==1 and p['versionDigest']==version_pin and type(p['maxReviewWorlds']) is int and 1<=p['maxReviewWorlds']<=16)
    v=reconstruct(version_text,version_pin);raw=check_wire(version_text,6)
    grid=calculate_grid(version_text,version_pin,p['gridPlanText'],p['gridPlanDigest'])
    groups=[];by_signature={};excluded=[]
    for c in v['candidates']:
        state=c['obligations']['computation'];base=BASE.get(state)
        if base is None:excluded.append(dict(id=c['id'],state=state));continue
        sig=c['computation']['targetSignature']
        if sig not in by_signature:
            g=dict(id=c['id'],signature=sig,baseline=base,members=[]);groups.append(g);by_signature[sig]=g
        g=by_signature[sig];require(g['baseline']==base);g['members'].append(dict(id=c['id'],meaning=c['meaning']))
    _,bindings,_=host(raw['contractText'],raw['contractPin'])
    original={i:b['value'] for i,b in bindings.items()} if groups else {}
    worlds=[];by_assignment={}
    def key(assignment):return tuple((a['bindingId'],a['value']) for a in assignment)
    for w in grid['worlds']:
        states={r['id']:r['state'] for r in w['rows']};group_states={}
        for g in groups:
            vals={states[m['id']] for m in g['members']};require(len(vals)==1);group_states[g['id']]=vals.pop()
        out=dict(id=w['id'],assignment=w['assignment'],groupStates=group_states,changedBindings=[a['bindingId'] for a in w['assignment'] if a['value']!=original.get(a['bindingId'])])
        worlds.append(out);by_assignment[key(out['assignment'])]=out
    pairs=[];already=[]
    for a,b in combinations(groups,2):
        if a['baseline']!=b['baseline']:already.append(dict(left=a['id'],right=b['id']))
        else:pairs.append(dict(left=a['id'],right=b['id'],witnessWorldIds=[],unresolvedWorldIds=[],witnesses=[]))
    def states(w,p):return w['groupStates'][p['left']],w['groupStates'][p['right']]
    def differs(w,p):
        l,r=states(w,p);return l in DECISIVE and r in DECISIVE and l!=r
    for pair in pairs:
        for w in worlds:
            l,r=states(w,pair)
            if l not in DECISIVE or r not in DECISIVE:pair['unresolvedWorldIds'].append(w['id']);continue
            if not differs(w,pair):continue
            pair['witnessWorldIds'].append(w['id']);changed=w['changedBindings'];require(bool(changed))
            missing=[];unresolved=[];smaller=[]
            # Independent enumerate all proper subsets, then use the specified
            # bit-order only for output ordering, not the optimization.
            subsets=[]
            for n in range(1,len(changed)):
                for sub in combinations(changed,n):subsets.append((sum(1<<changed.index(i) for i in sub),sub))
            for _,sub in sorted(subsets):
                assignment=[dict(bindingId=a['bindingId'],value=a['value'] if a['bindingId'] in sub else original[a['bindingId']]) for a in w['assignment']]
                earlier=by_assignment.get(key(assignment))
                if earlier is None:missing.append(list(sub));continue
                x,y=states(earlier,pair)
                if x not in DECISIVE or y not in DECISIVE:unresolved.append(earlier['id'])
                elif differs(earlier,pair):smaller.append(earlier['id'])
            minimality='NONMINIMAL_TESTED_WITNESS' if smaller else 'MINIMALITY_NOT_ESTABLISHED' if missing or unresolved else 'MINIMAL_WITHIN_DECLARED_TESTED_SUBSETS'
            pair['witnesses'].append(dict(worldId=w['id'],changedBindings=changed,minimality=minimality,untestedProperSubsets=missing,unresolvedProperWorldIds=unresolved,smallerWitnessWorldIds=smaller))
        pair['status']='WITNESS_FOUND' if pair['witnessWorldIds'] else 'UNRESOLVED_IN_EVALUATED_WORLDS' if pair['unresolvedWorldIds'] else 'NO_WITNESS_EVALUATED_PREFIX_ONLY' if grid['coverage']['truncated'] else 'NO_WITNESS_DECLARED_GRID_ONLY'
    cover={w['id']:{i for i,pair in enumerate(pairs) if w['id'] in pair['witnessWorldIds']} for w in worlds}
    possible=set().union(*cover.values());best_key=(0,0,0,());best=();best_covered=set()
    # Independent combination search using Python sets, not JS bitmask DP.
    for n in range(1,min(p['maxReviewWorlds'],len(worlds))+1):
        for subset in combinations(worlds,n):
            ids=tuple(w['id'] for w in subset);covered=set().union(*(cover[i] for i in ids))
            objective=(-len(covered),n,sum(len(w['changedBindings']) for w in subset),ids)
            if objective<best_key:best_key=objective;best=subset;best_covered=covered
    selected=[dict(id=w['id'],assignment=w['assignment'],changedBindings=w['changedBindings'],covers=[dict(left=pairs[i]['left'],right=pairs[i]['right']) for i in sorted(cover[w['id']])]) for w in best]
    uncovered=[dict(left=pairs[i]['left'],right=pairs[i]['right']) for i in sorted(possible-best_covered)]
    return dict(version=VERSION,versionDigest=version_pin,planDigest=plan_pin,gridPlanDigest=p['gridPlanDigest'],budget=p['maxReviewWorlds'],gridCoverage=grid['coverage'],structuralGroups=groups,excluded=excluded,alreadyDivergent=already,pairs=pairs,selectedWorlds=selected,uncoveredDistinguishablePairs=uncovered,
        counts=dict(candidateCount=len(v['candidates']),structuralGroups=len(groups),eligiblePairs=len(pairs),distinguishablePairs=len(possible),selectedWorlds=len(best),coveredPairs=len(best_covered),totalChangedBindings=best_key[2]),
        optimization='EXACT_SUBSET_MAX_PAIR_COVERAGE_THEN_MIN_WORLDS_THEN_MIN_CHANGED_BINDINGS_THEN_WORLD_ID',decisionAuthority='NONE',qualification=QUAL)
def verify(data,expected,version_pin,plan_pin):
    if not all(pin(p) for p in (expected,version_pin,plan_pin)):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        b=check_wire(data.decode('utf-8',errors='strict'),40)
        require(keys(b,('version','versionText','versionDigest','planText','planDigest','result')) and b['version']==VERSION and b['versionDigest']==version_pin and b['planDigest']==plan_pin)
        r=calculate_suite(b['versionText'],version_pin,b['planText'],plan_pin);require(canonical(r)==canonical(b['result']))
        return dict(status='VERIFIED',profile=VERSION,result=r,qualification='Independent fresh finite-grid and subset optimization replay only; no semantic, empirical, feasibility, cache or external authority.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
