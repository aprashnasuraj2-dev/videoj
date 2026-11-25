#!/usr/bin/env python3
"""Independent finite synthetic grid replay. Fresh Fraction/hashlib computation.
Does not certify the producer's cache, actual evidence, semantic intent or feasibility.
"""
import json,re
from itertools import product,islice
from math import prod
from copy import deepcopy
from fractions import Fraction
from hashlib import sha256
from verify import canonical,keys,recompute
from verify_conflict import rawhash,require,bounded_load
from verify_reviewed_compiler import audit,host,pin,compact
from verify_living_version import reconstruct,check_wire,ERRORS
VERSION='sutra-semantic-world-grid/v1'
MAX_BYTES=1048576
QUAL='A finite Cartesian grid of declared synthetic quantity values crossed with supplied semantic programs. The evaluated prefix is order-dependent. Unknown or refused baseline programs remain visible but are not evaluated. Interactions are scoped to evaluated single-change comparisons, not proof of causality or physical feasibility. No empirical probability, complete meaning coverage, source revision or authority.'
RATIONAL=re.compile(r'-?(?:0|[1-9][0-9]{0,47})/[1-9][0-9]{0,47}',re.ASCII)
DECISIVE={'constraint_satisfied','constraint_refuted'}
BASE={'CONDITIONALLY_SATISFIED':'constraint_satisfied','CONDITIONALLY_REFUTED':'constraint_refuted'}
def rational(s):
    require(isinstance(s,str) and RATIONAL.fullmatch(s) and not s.startswith('-0'))
    f=Fraction(s);return f'{f.numerator}/{f.denominator}'
def calculate_grid(version_text,version_pin,plan_text,plan_pin):
    require(pin(plan_pin) and rawhash(plan_text)==plan_pin)
    version=reconstruct(version_text,version_pin);v=check_wire(version_text,6)
    p=check_wire(plan_text,6)
    require(keys(p,('version','versionDigest','axes','maxAssignments')) and type(p['version']) is int and p['version']==1 and p['versionDigest']==version_pin and type(p['maxAssignments']) is int and 1<=p['maxAssignments']<=16 and isinstance(p['axes'],list) and 1<=len(p['axes'])<=4)
    _,bindings,_=host(v['contractText'],v['contractPin'])
    axes=[];seen=set()
    for a in p['axes']:
        require(keys(a,('bindingId','values')) and isinstance(a['bindingId'],str) and a['bindingId'] in bindings and a['bindingId'] not in seen and isinstance(a['values'],list) and 2<=len(a['values'])<=4)
        seen.add(a['bindingId']);values=[rational(s) for s in a['values']]
        require(len(set(values))==len(values));axes.append(dict(bindingId=a['bindingId'],values=values))
    axes.sort(key=lambda a:a['bindingId'])
    total=prod(len(a['values']) for a in axes)
    proposals={x['id']:x['proposalText'] for x in check_wire(v['batchText'],5)['proposals']}
    baseline={};graphs={}
    for c in version['candidates']:
        state=c['obligations']['computation'];i=c['id'];baseline[i]=BASE.get(state,state)
        if state not in BASE:continue
        a=audit(v['contractText'],v['contractPin'],proposals[i])['result']
        graph=json.loads(a['graphText']);input_bindings={n['id']:n['bindingId'] for n in a['nodes'] if n['kind']=='input'}
        for n in graph['nodes']:
            if n['kind']=='input':n['basis']='synthetic counterfactual '+input_bindings[n['id']]
        initial=json.loads(recompute(compact(graph)));require(next(r for r in initial['receipts'] if r['id']==a['target']['id'])['outcome']['status']==baseline[i])
        graphs[i]=(graph,input_bindings,a['target']['id'])
    worlds=[]
    for j,values in enumerate(islice(product(*(a['values'] for a in axes)),p['maxAssignments']),1):
        assignment=[dict(bindingId=a['bindingId'],value=value) for a,value in zip(axes,values)];replacements={r['bindingId']:r['value'] for r in assignment};rows=[]
        for i,state in baseline.items():
            if i not in graphs:
                rows.append(dict(id=i,state=state,reportDigest=None,execution='BASELINE_UNRESOLVED_NOT_EVALUATED'));continue
            graph,input_bindings,target=graphs[i];g=deepcopy(graph)
            for n in g['nodes']:
                if n['kind']=='input' and input_bindings[n['id']] in replacements:n['value']=replacements[input_bindings[n['id']]]
            report=json.loads(recompute(compact(g)));out=next(r for r in report['receipts'] if r['id']==target)['outcome']['status']
            # This is the producer's scoped label. Fresh replay verifies the
            # result, not whether its in-process cache was really used.
            rows.append(dict(id=i,state=out,reportDigest=report['graphDigest'],execution='FRESH_MATCHED_CACHED'))
        by={r['id']:r['state'] for r in rows};witnesses=[]
        for k,left in enumerate(graphs):
            for right in list(graphs)[k+1:]:
                if baseline[left]==baseline[right] and by[left] in DECISIVE and by[right] in DECISIVE and by[left]!=by[right]:
                    witnesses.append(dict(left=left,right=right,leftState=by[left],rightState=by[right]))
        worlds.append(dict(id=f'world_{j:02d}',assignment=assignment,rows=rows,witnesses=witnesses))
    candidates=[]
    for i,state in baseline.items():
        values=sorted({r['state'] for w in worlds for r in w['rows'] if r['id']==i})
        if i not in graphs:status='BASELINE_UNRESOLVED_NOT_EVALUATED'
        elif DECISIVE<=set(values):status='VARIES_IN_EVALUATED_GRID'
        elif any(x not in DECISIVE for x in values):status='UNRESOLVED_IN_EVALUATED_GRID'
        elif len(worlds)<total:status='SAME_IN_EVALUATED_PREFIX_ONLY'
        else:status='SAME_IN_DECLARED_GRID_ONLY'
        candidates.append(dict(id=i,baseline=state,states=values,status=status))
    original={i:b['value'] for i,b in bindings.items()}
    interactions=[]
    # Independent lookup over exact assignments, not the producer's search.
    by_assignment={tuple(a['value'] for a in w['assignment']):w for w in worlds}
    axis_ids=[a['bindingId'] for a in axes]
    for w in worlds:
        values=[a['value'] for a in w['assignment']]
        changed=[i for i,b in enumerate(axis_ids) if values[i]!=original[b]]
        if len(changed)<2:continue
        singles=[]
        for i in changed:
            key=tuple(values[j] if j==i else original[b] for j,b in enumerate(axis_ids))
            singles.append(by_assignment.get(key))
        if any(s is None for s in singles):continue
        for witness in w['witnesses']:
            if all((lambda m:m[witness['left']] in DECISIVE and m[witness['left']]==m[witness['right']])({r['id']:r['state'] for r in s['rows']}) for s in singles):
                interactions.append(dict(worldId=w['id'],left=witness['left'],right=witness['right'],changedBindings=[axis_ids[i] for i in changed],singleWorldIds=[s['id'] for s in singles]))
    return dict(version=VERSION,versionDigest=version_pin,planDigest=plan_pin,axes=axes,
      semanticAxis=dict(candidateIds=list(baseline),status='SUPPLIED_CANDIDATE_PROGRAMS_ONLY'),
      coverage=dict(totalAssignments=total,evaluatedAssignments=len(worlds),truncated=len(worlds)<total,totalCandidateCells=total*len(baseline),evaluatedGridCells=len(worlds)*len(baseline),executedCells=len(worlds)*len(graphs)),
      candidates=candidates,worlds=worlds,interactionWitnesses=interactions,decisionAuthority='NONE',qualification=QUAL)
def verify(data,expected,version_pin,plan_pin):
    if not all(pin(p) for p in (expected,version_pin,plan_pin)):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        b=bounded_load(data.decode('utf-8',errors='strict'),MAX_BYTES,40)
        require(keys(b,('versionText','versionDigest','planText','planDigest','result')) and b['versionDigest']==version_pin and b['planDigest']==plan_pin)
        r=calculate_grid(b['versionText'],version_pin,b['planText'],plan_pin);require(canonical(r)==canonical(b['result']))
        return dict(status='VERIFIED',profile=VERSION,result=r,qualification='Independent fresh finite-grid replay. The producer cache label is not a cache-use proof. No semantic, empirical, physical-feasibility or external authority.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
