"""Replay exact declared-cohort exposure independently from pinned version bytes."""
from itertools import combinations
from hashlib import sha256
from verify import canonical,keys
from verify_conflict import rawhash,require
from verify_reviewed_compiler import pin
from verify_reviewed_contrast import decisive
from verify_living_version import reconstruct,check_wire,ERRORS
VERSION='sutra-structural-exposure/v1'
MAX_BYTES=262144
QUAL="Cohorts conservatively connect equal declared lineage or exact duplicate bytes, not verified common causes or independent roots. A cut touches a required input of each supplied decisive graph; it is not a proof that removing a source reverses truth, that a system physically fails, or that no substitute evidence exists. Context-only dependencies remain separate; unknown ancestry and unresolved candidates remain visible."
def reconstruct_exposure(version_text,version_pin):
    version=reconstruct(version_text,version_pin)
    contract=check_wire(check_wire(version_text,6)['contractText'],9)
    sources=sorted(contract['sources'],key=lambda s:s['id'])
    records={s['id']:s for s in sources}
    neighbors={s['id']:set() for s in sources};joins=[]
    for a,b in combinations(sources,2):
        reasons=[]
        if a['lineage']==b['lineage']:reasons.append('SAME_DECLARED_LINEAGE')
        if a['digest']==b['digest']:reasons.append('EXACT_DUPLICATE_BYTES')
        if reasons:
            i,j=a['id'],b['id'];neighbors[i].add(j);neighbors[j].add(i);joins.append(dict(left=i,right=j,reasons=reasons))
    remaining=set(records);cohorts=[];membership={}
    while remaining:
        start=min(remaining);seen={start};queue=[start]
        while queue:
            for nxt in neighbors[queue.pop()]-seen:seen.add(nxt);queue.append(nxt)
        remaining-=seen;cid='cohort_'+start;members=sorted(seen)
        membership.update({s:cid for s in members})
        cohorts.append(dict(id=cid,sourceIds=members,declaredLineages=sorted({records[s]['lineage'] for s in seen}),sourceDigests=sorted({records[s]['digest'] for s in seen}),independence='NOT_ESTABLISHED'))
    candidates=[]
    for row in version['candidates']:
        comp=row['computation'];target=comp['sourceIds'] if comp else []
        context={r['span']['sourceId'] for f in row['facets'].values() for r in f['references'] if r['span'] is not None}
        target_cohorts=sorted({membership[s] for s in target if s in membership})
        context_cohorts=sorted({membership[s] for s in context if s in membership}-set(target_cohorts))
        candidates.append(dict(id=row['id'],state=comp['status'] if comp else 'REFUSED',targetSignature=comp['targetSignature'] if comp else None,targetSourceIds=target,targetCohorts=target_cohorts,questionQuantityDependency='question' in target,contextOnlyCohorts=context_cohorts,ancestryCompleteness='UNKNOWN'))
    structures={}
    for a in candidates:
        if not decisive(a['state']):continue
        k=a['targetSignature']
        g=structures.setdefault(k,dict(id=a['id'],candidateIds=[],targetCohorts=a['targetCohorts'],state=a['state']))
        require(g['state']==a['state'] and g['targetCohorts']==a['targetCohorts']);g['candidateIds'].append(a['id'])
    targets=list(structures.values())
    for g in cohorts:
        affected=[t for t in targets if g['id'] in t['targetCohorts']]
        g.update(affectedTargetClasses=[t['id'] for t in affected],affectedCandidateIds=[i for t in affected for i in t['candidateIds']],affectedContextCandidateIds=[a['id'] for a in candidates if g['id'] in a['contextOnlyCohorts']])
    roots=[g['id'] for g in cohorts];cut_sets=[];minimum=None
    if targets and all(t['targetCohorts'] for t in targets):
        for n in range(1,len(roots)+1):
            cut_sets=[list(c) for c in combinations(roots,n) if all(set(c)&set(t['targetCohorts']) for t in targets)]
            if cut_sets:
                minimum=n
                # Wire order is ascending source-index bitmask, not enumeration order.
                cut_sets.sort(key=lambda c:sum(1<<roots.index(x) for x in c));break
    status='NO_DECISIVE_TARGETS' if not targets else 'NO_EXTERNAL_COHORT_CUT_COVERS_ALL_TARGETS' if minimum is None else 'MINIMUM_DECLARED_COHORT_CUT_FOUND'
    return dict(version=VERSION,versionDigest=version_pin,cohorts=cohorts,joins=joins,candidates=candidates,targetClasses=targets,cut=dict(status=status,minimumCohorts=minimum,sets=cut_sets,uncoverableTargets=[t['id'] for t in targets if not t['targetCohorts']]),counts=dict(sourceArtifacts=len(sources),declaredLineages=len({s['lineage'] for s in sources}),exactByteIdentities=len({s['digest'] for s in sources}),conservativeCohorts=len(cohorts),decisiveCandidateCount=sum(decisive(a['state']) for a in candidates),distinctDecisiveTargets=len(targets)),decisionAuthority='NONE',qualification=QUAL)
def verify(data,expected,version_pin):
    if not pin(expected) or not pin(version_pin):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        bundle=check_wire(data.decode('utf-8',errors='strict'),40)
        require(keys(bundle,('versionText','versionDigest','result')) and bundle['versionDigest']==version_pin)
        result=reconstruct_exposure(bundle['versionText'],version_pin)
        require(canonical(bundle['result'])==canonical(result))
        return dict(status='VERIFIED',profile=VERSION,result=result,qualification='Independently recomputed declared structural exposure only; no empirical independence or physical failure claim.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
