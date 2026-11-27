#!/usr/bin/env python3
"""Independent restricted living investigation replay. No model, network or JS.
Refusal classification is independent; producer-specific refusal reason is not
reconstructed. User-declared meaning is never certified.
"""
from hashlib import sha256
from verify import canonical,keys
from verify_capsule import wire
from verify_conflict import rawhash,require
from verify_reviewed_compiler import audit,host,pin,text,ident
from verify_reviewed_contrast import describe,decisive
VERSION='sutra-investigation-version/v1'
MAX_BYTES=262144
FACETS=('entity','definition','time','population','geography','condition','measurement','baseline','quantifier','negation','modality','causality','method')
OBLIGATIONS=('intent','evidenceSelection','extraction','entityResolution','scope','relationshipSelection','methodValidity','computation','communication')
GRAPH_QUAL='Declared ancestry is not evidence independence; contextual links do not prove entailment. Edges cover admitted target dependencies and supplied facet links, not every real-world dependency.'
IMPACT_QUAL='Survival means only matching conditional outcomes; source, meaning, method and applicability remain unverified. Source withdrawal does not establish falsity. Dependency impact is scoped to admitted target and supplied context; no incremental speedup or global completeness claimed.'
ERRORS=(ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError,StopIteration)
def check_wire(t,depth):
    require(isinstance(t,str) and 1<=len(t.encode('utf-8'))<=MAX_BYTES)
    return wire(t,depth)
def indexed(items):
    require(isinstance(items,list))
    out={}
    for item in items:
        require(isinstance(item,dict) and ident(item.get('id')) and item['id'] not in out);out[item['id']]=item
    return out
def graph(c,rows):
    nodes=[];edges={}
    def node(id,kind,identity):nodes.append(dict(id=id,kind=kind,identity=identity))
    def edge(dependent,dependency,relation,authority):
        e=dict(dependent=dependent,dependency=dependency,relation=relation,authority=authority);edges[canonical(e)]=e
    node('source:question','question',c['question']['digest'])
    for root in sorted({s['lineage'] for s in c['sources']}):node('lineage:'+root,'declared_lineage',root)
    for s in c['sources']:
        node('source:'+s['id'],'evidence',s['digest']);edge('source:'+s['id'],'lineage:'+s['lineage'],'declared_ancestry','HOST_DECLARATION')
    for b in c['bindings']:
        node('binding:'+b['id'],'reviewed_quantity',b['span']['quote']);edge('binding:'+b['id'],'source:'+b['span']['sourceId'],'exact_source_span','COMPILER_ADMISSION')
    for row in rows:
        i='candidate:'+row['id'];comp=row['computation']
        node(i,'candidate_interpretation',comp['proposalDigest'] if comp else 'REFUSED');edge(i,'source:question','interprets','PROPOSAL')
        if comp is None:continue
        for b in comp['bindingIds']:edge(i,'binding:'+b,'target_depends_on','COMPILER_ADMISSION')
        for k in FACETS:
            for r in row['facets'][k]['references']:
                if r['span'] is not None:edge(i,'binding:'+r['id'] if r['kind']=='binding' else 'source:'+r['span']['sourceId'],'facet_'+k,'PROPOSED_CONTEXT')
    return dict(nodes=sorted(nodes,key=lambda n:n['id']),edges=[edges[k] for k in sorted(edges)],qualification=GRAPH_QUAL)
def reconstruct(version_text,expected):
    require(pin(expected) and rawhash(version_text)==expected)
    v=check_wire(version_text,6)
    require(keys(v,('version','previousDigest','contractText','contractPin','batchText','annotationText','annotationPin')) and v['version']==VERSION and (v['previousDigest'] is None or pin(v['previousDigest'])) and v['previousDigest']!=expected and pin(v['contractPin']) and pin(v['annotationPin']))
    ct,p,bt,at,ap=(v[k] for k in ('contractText','contractPin','batchText','annotationText','annotationPin'))
    require(rawhash(at)==ap);c=check_wire(ct,9);docs,bindings,_=host(ct,p);b=check_wire(bt,5);a=check_wire(at,12);bp=rawhash(bt)
    require(keys(b,('version','contractDigest','proposals')) and type(b['version']) is int and b['version']==1 and b['contractDigest']==p and isinstance(b['proposals'],list) and 2<=len(b['proposals'])<=8)
    props=indexed(b['proposals'])
    require(all(keys(x,('id','proposalText')) and isinstance(x['proposalText'],str) and 1<=len(x['proposalText'].encode('utf-16-le'))//2<=65536 for x in props.values()))
    require(keys(a,('version','contractDigest','batchDigest','candidates')) and type(a['version']) is int and a['version']==1 and a['contractDigest']==p and a['batchDigest']==bp)
    anns=indexed(a['candidates']);require(set(anns)==set(props))
    def exact_span(s):return {k:v for k,v in s.items() if k!='origin'}
    rows=[]
    for i in sorted(props):
        annotation=anns[i]
        require(keys(annotation,('id','meaning','facets')) and text(annotation['meaning'],2048) and keys(annotation['facets'],FACETS))
        try:
            # The independent compiler is authoritative only for its scoped replay.
            result=audit(ct,p,props[i]['proposalText'])['result']
        except ERRORS:result=None
        comp=describe(result) if result is not None else None
        claims={x['id']:x for x in result['claims']} if result else {}
        used=set(comp['bindingIds']) if comp else set()
        facets={}
        for k in FACETS:
            f=annotation['facets'][k]
            if f is None:
                facets[k]=dict(status='UNSPECIFIED',statement=None,references=[]);continue
            require(keys(f,('statement','references')) and text(f['statement'],1024) and isinstance(f['references'],list) and len(f['references'])<=8)
            refs=[];seen=set()
            for r in f['references']:
                require(keys(r,('kind','id')) and r['kind'] in ('binding','claim') and ident(r['id']) and (r['kind'],r['id']) not in seen);seen.add((r['kind'],r['id']))
                if result is None:refs.append(dict(r,status='PROPOSAL_REFUSED',span=None));continue
                if r['kind']=='binding':
                    require(r['id'] in bindings);binding=bindings[r['id']]
                    refs.append(dict(r,status='TARGET_BINDING' if r['id'] in used else 'CONTEXT_ONLY_BINDING',span=exact_span(binding['span']),declaredType=binding['type']))
                else:
                    require(r['id'] in claims);claim=claims[r['id']]
                    refs.append(dict(r,status='EXACT_QUOTE_ONLY',span=exact_span(claim['span'])) if claim['kind']=='quoted_assertion' else dict(r,status='PROPOSED_NOT_SOURCE_BOUND',span=None))
            facets[k]=dict(status='SOURCE_LINKED_DECLARATION' if any(r['span'] is not None for r in refs) else 'UNSUPPORTED_DECLARATION',statement=f['statement'],references=refs)
        q=exact_span(result['question']) if result else None
        obligations={k:'UNRESOLVED' for k in OBLIGATIONS}
        obligations['extraction']='EXACT_ADMITTED_SPANS_ONLY' if result else 'UNRESOLVED'
        obligations['computation']=comp['status'] if comp else 'REFUSED'
        coverage='REFUSED' if q is None else 'FULL_QUESTION_SPAN' if q['start']==0 and q['end']==len(c['question']['text'].encode('utf-8')) else 'PARTIAL_QUESTION_SPAN'
        rows.append(dict(id=i,meaning=annotation['meaning'],meaningStatus='PROPOSED_UNVERIFIED',facets=facets,obligations=obligations,questionSpan=q,questionCoverage=coverage,admission='ADMITTED' if result else 'REFUSED',computation=comp))
    states=[x['obligations']['computation'] for x in rows]
    groups=dict(satisfied=[r['id'] for r in rows if r['obligations']['computation']=='CONDITIONALLY_SATISFIED'],refuted=[r['id'] for r in rows if r['obligations']['computation']=='CONDITIONALLY_REFUTED'],unresolved=[r['id'] for r in rows if r['admission']=='ADMITTED' and not decisive(r['obligations']['computation'])],refused=[r['id'] for r in rows if r['admission']=='REFUSED'])
    triage='DIVERGENT_CONDITIONAL_OUTCOMES' if groups['satisfied'] and groups['refuted'] else 'INCOMPLETE_CANDIDATE_EVALUATION' if any(not decisive(s) for s in states) else 'AGREEMENT_ON_SUPPLIED_CONDITIONAL_OUTCOMES'
    return dict(version=VERSION,digest=expected,previousDigest=v['previousDigest'],originalQuestion=c['question'],candidates=rows,triage=triage,groups=groups,graph=graph(c,rows),contractDigest=p,batchDigest=bp,annotationDigest=ap,decisionAuthority='NONE')
def verify(data,expected):
    if not pin(expected):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        result=reconstruct(data.decode('utf-8',errors='strict'),expected)
        return dict(status='VERIFIED',profile=VERSION,result=result,qualification='Independently replayed restricted conditional computations, declared source links and graph. Producer-specific refusal reasons are not reconstructed. Meaning, method, authenticity, freshness and empirical truth are unverified.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
def diff(before,after,project=lambda x:x):
    a=indexed(before);b=indexed(after);out=[]
    for i in sorted(set(a)|set(b)):
        if i not in a:change='ADDED'
        elif i not in b:change='WITHDRAWN'
        elif project(a[i])!=project(b[i]):change='CHANGED'
        else:continue
        out.append(dict(id=i,change=change))
    return out
def descendants(graph,roots):
    # Independent fixed-point scan, not producer's queue-based reverse index.
    affected=set(roots)
    while True:
        more={e['dependent'] for e in graph['edges'] if e['dependency'] in affected}
        if more<=affected:return affected
        affected|=more
def compare(before_text,before_pin,after_text,after_pin):
    before=reconstruct(before_text,before_pin);after=reconstruct(after_text,after_pin)
    require(before_pin!=after_pin and after['previousDigest']==before_pin)
    v1=check_wire(before_text,6);v2=check_wire(after_text,6)
    c1=check_wire(v1['contractText'],9);c2=check_wire(v2['contractText'],9)
    p1=indexed(check_wire(v1['batchText'],5)['proposals']);p2=indexed(check_wire(v2['batchText'],5)['proposals'])
    a1=indexed(check_wire(v1['annotationText'],12)['candidates']);a2=indexed(check_wire(v2['annotationText'],12)['candidates'])
    question=c1['question']['digest']!=c2['question']['digest']
    source=diff(c1['sources'],c2['sources'],lambda s:(s['digest'],s['lineage'],s.get('provenance')))
    binding=diff(c1['bindings'],c2['bindings'])
    roots=['source:'+s['id'] for s in source]+['binding:'+b['id'] for b in binding]+(['source:question'] if question else [])
    impacted=descendants(before['graph'],roots)|descendants(after['graph'],roots)
    old=indexed(before['candidates']);new=indexed(after['candidates']);rows=[]
    def projection(p):
        x=check_wire(p['proposalText'],9);return {k:v for k,v in x.items() if k!='contractDigest'}
    for i in sorted(set(old)|set(new)):
        l=old.get(i);r=new.get(i)
        ls=l['obligations']['computation'] if l else 'ABSENT';rs=r['obligations']['computation'] if r else 'ABSENT'
        affected='candidate:'+i in impacted
        ann=l is None or r is None or a1[i]!=a2[i]
        if l is None or r is None or l['admission']!='ADMITTED' or r['admission']!='ADMITTED':
            prop=p1.get(i,{}).get('proposalText')!=p2.get(i,{}).get('proposalText')
        else:prop=projection(p1[i])!=projection(p2[i])
        if l is None:outcome='NEW_CANDIDATE'
        elif r is None:outcome='CANDIDATE_WITHDRAWN'
        elif decisive(ls) and not decisive(rs):outcome='PREVIOUS_CONDITIONAL_RESULT_UNRESOLVED'
        elif not decisive(ls) and decisive(rs):outcome='NEW_CONDITIONAL_RESULT'
        elif decisive(ls) and decisive(rs):outcome='CONDITIONAL_RESULT_REVERSED' if ls!=rs else 'CONDITIONAL_RESULT_SURVIVES'
        else:outcome='STILL_UNRESOLVED'
        rows.append(dict(id=i,before=ls,after=rs,outcome=outcome,dependencyAffected=affected,annotationChanged=ann,proposalChanged=prop,reviewRequired=question or affected or ann or prop or not decisive(rs)))
    missing=[]
    for r in after['candidates']:
        comp=r['computation']
        if comp is None or not decisive(comp['status']):missing.append(dict(id=r['id'],reason=comp['status'] if comp else 'REFUSED',missing=comp['missing'] if comp else [],typeBlockers=comp['typeBlockers'] if comp else []))
    return dict(version='sutra-investigation-impact/v1',beforeDigest=before_pin,afterDigest=after_pin,questionChanged=question,sourceChanges=source,bindingChanges=binding,affectedDependencyNodes=sorted(impacted),candidates=rows,triage=dict(before=before['triage'],after=after['triage'],newDivergence=before['triage']!='DIVERGENT_CONDITIONAL_OUTCOMES' and after['triage']=='DIVERGENT_CONDITIONAL_OUTCOMES'),missing=missing,nextReview=[r['id'] for r in rows if r['reviewRequired']],decisionAuthority='NONE',recomputation='FULL_REPLAY_BOTH_VERSIONS',qualification=IMPACT_QUAL)
