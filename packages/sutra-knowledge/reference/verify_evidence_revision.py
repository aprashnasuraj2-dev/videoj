"""Independent atomic evidence transaction verification; closed, no JS or model."""
from copy import deepcopy
from hashlib import sha256
from verify import canonical,keys
from verify_conflict import rawhash,require
from verify_reviewed_compiler import pin,ident,text
from verify_reviewed_contrast import decisive
from verify_living_version import reconstruct,compare,check_wire,indexed,FACETS,ERRORS
VERSION='sutra-evidence-revision-transaction/v1'
MAX_BYTES=262144
QUAL='Proposed atomic child only. Changed source selections require explicit exact replacement spans; unselected inputs become typed unknowns. Changed-source quotations and semantic links are removed even when numeric inputs are reselected. Refused parents remain quarantined. No automatic correspondence, source truth, semantic validity, or external authority.'
def reconstruct_transaction(bundle,parent_pin,plan_pin):
    require(keys(bundle,('version','parentDigest','planDigest','sourceChanges','invalidatedBindingIds','reselectedBindingIds','missingBindingIds','changes','impact','decisionAuthority','qualification','parentVersion','planText','childVersion','childDigest')))
    require(bundle['version']==VERSION and bundle['parentDigest']==parent_pin and bundle['planDigest']==plan_pin and bundle['decisionAuthority']=='NONE' and bundle['qualification']==QUAL)
    plan=check_wire(bundle['planText'],10)
    require(rawhash(bundle['planText'])==plan_pin and keys(plan,('version','parentDigest','operations')) and type(plan['version']) is int and plan['version']==1 and plan['parentDigest']==parent_pin and isinstance(plan['operations'],list) and 1<=len(plan['operations'])<=8)
    old_text,new_text,child_pin=(bundle[k] for k in ('parentVersion','childVersion','childDigest'))
    old_report=reconstruct(old_text,parent_pin);new_report=reconstruct(new_text,child_pin)
    require(new_report['previousDigest']==parent_pin)
    old=check_wire(old_text,6);new=check_wire(new_text,6)
    c1=check_wire(old['contractText'],9);c2=check_wire(new['contractText'],9)
    sources=indexed(c1['sources']);bindings=indexed(c1['bindings']);operations={};reselected={};source_changes=[]
    for op in plan['operations']:
        require(isinstance(op,dict) and op.get('kind') in ('withdraw','replace'))
        kind=op['kind'];require(keys(op,('kind','sourceId','previousDigest') if kind=='withdraw' else ('kind','sourceId','previousDigest','replacementText','replacementDigest','rebindings')))
        sid=op['sourceId'];require(ident(sid) and sid in sources and sid not in operations and sources[sid]['digest']==op['previousDigest'])
        operations[sid]=op
        if kind=='replace':
            t=op['replacementText']
            require(text(t,16384) and t!=sources[sid]['text'] and pin(op['replacementDigest']) and rawhash(t)==op['replacementDigest'] and isinstance(op['rebindings'],list) and len(op['rebindings'])<=64)
            for r in op['rebindings']:
                require(keys(r,('bindingId','span')) and keys(r['span'],('sourceId','start','end','quote')))
                bid=r['bindingId'];require(ident(bid) and bid in bindings and bid not in reselected and bindings[bid]['span']['sourceId']==sid and r['span']['sourceId']==sid)
                reselected[bid]=dict(id=bid,span=r['span'],type=bindings[bid]['type'])
        source_changes.append(dict(sourceId=sid,kind=kind,previousDigest=op['previousDigest'],replacementDigest=op.get('replacementDigest')))
    affected={b['id']:b for b in c1['bindings'] if b['span']['sourceId'] in operations}
    lost=set(affected)-set(reselected)
    expected_sources=[]
    for s in c1['sources']:
        op=operations.get(s['id'])
        if op is None:expected_sources.append(s)
        elif op['kind']=='replace':expected_sources.append(dict(id=s['id'],text=op['replacementText'],digest=op['replacementDigest'],lineage=s['lineage']))
    expected_bindings=[reselected.get(b['id'],b) for b in c1['bindings'] if b['id'] not in lost]
    require(canonical(c2)==canonical(dict(c1,sources=expected_sources,bindings=expected_bindings)))
    require(canonical(source_changes)==canonical(bundle['sourceChanges']) and bundle['invalidatedBindingIds']==sorted(affected) and bundle['reselectedBindingIds']==sorted(reselected) and bundle['missingBindingIds']==sorted(lost))
    b1=check_wire(old['batchText'],5);b2=check_wire(new['batchText'],5)
    a1=check_wire(old['annotationText'],12);a2=check_wire(new['annotationText'],12)
    ids=[p['id'] for p in b1['proposals']]
    require(ids==[p['id'] for p in b2['proposals']]==[a['id'] for a in a2['candidates']])
    old_candidates=indexed(old_report['candidates']);new_candidates=indexed(new_report['candidates'])
    old_annotations=indexed(a1['candidates']);new_annotations=indexed(a2['candidates']);changes=[]
    for p,q in zip(b1['proposals'],b2['proposals']):
        i=p['id'];before=old_candidates[i];after=new_candidates[i];accepted=before['admission']=='ADMITTED'
        require(before['admission']==after['admission'])
        digest=rawhash(p['proposalText']);inputs=[];claims=[];links=[]
        if not accepted:expected=dict(version=1,quarantinedProposalDigest=digest)
        else:
            expected=deepcopy(check_wire(p['proposalText'],9));expected['contractDigest']=new['contractPin']
            for j,n in enumerate(expected['nodes']):
                if n['kind']=='input' and n['bindingId'] in affected:
                    bid=n['bindingId'];b=affected[bid];sid=b['span']['sourceId'];missing=bid in lost
                    inputs.append(dict(nodeId=n['id'],bindingId=bid,sourceId=sid,state='MISSING' if missing else 'EXPLICITLY_RESELECTED'))
                    if missing:expected['nodes'][j]=dict(id=n['id'],kind='unknown',type=b['type'],reason='Source '+sid+' revised; reviewed binding '+bid+' unavailable.')
            kept=[]
            for claim in expected['claims']:
                if claim['kind']=='quoted_assertion' and claim['span']['sourceId'] in operations:claims.append(claim['id'])
                else:kept.append(claim)
            expected['claims']=kept
        require(canonical(check_wire(q['proposalText'],9))==canonical(expected))
        annotation=deepcopy(old_annotations[i])
        for facet in FACETS:
            f=annotation['facets'][facet]
            if f is None:continue
            keep=[]
            for r in f['references']:
                drop=not accepted or (r['id'] in affected if r['kind']=='binding' else r['id'] in claims)
                if drop:links.append(dict(facet=facet,kind=r['kind'],id=r['id']))
                else:keep.append(r)
            f['references']=keep
        require(canonical(annotation)==canonical(new_annotations[i]))
        target=set(before['computation']['bindingIds'])&set(affected) if accepted else set()
        missing=sorted(target&lost);rebound=sorted(target&set(reselected))
        prior=before['obligations']['computation'];state=after['obligations']['computation']
        require((not missing or not decisive(state)) and (missing or rebound or prior==state))
        classification='REFUSED_PARENT_QUARANTINED' if not accepted else 'TARGET_INPUT_MISSING' if missing else 'TARGET_INPUT_RESELECTED' if rebound else 'CONTEXT_OR_NONTARGET_REVISED' if inputs or claims or links else 'NO_SCOPED_SOURCE_DEPENDENCY'
        changes.append(dict(id=i,parentAdmission=before['admission'],parentProposalDigest=digest,targetMissing=missing,targetReselected=rebound,changedInputs=inputs,removedClaims=claims,removedReferences=links,before=prior,after=state,classification=classification))
    require(canonical(changes)==canonical(bundle['changes']))
    impact=compare(old_text,parent_pin,new_text,child_pin);claimed=deepcopy(bundle['impact'])
    refused={r['id'] for r in impact['missing'] if r['reason']=='REFUSED'}
    for row in claimed['missing']:
        if row['id'] in refused:
            require(isinstance(row['reason'],str) and len(row['reason'])<=128);row['reason']='REFUSED'
    require(canonical(impact)==canonical(claimed))
    return dict(version=VERSION,parentDigest=parent_pin,planDigest=plan_pin,childDigest=child_pin,sourceChanges=source_changes,invalidatedBindingIds=sorted(affected),reselectedBindingIds=sorted(reselected),missingBindingIds=sorted(lost),changes=changes,impact=impact,decisionAuthority='NONE')
def verify(data,expected,parent_pin,plan_pin,child_pin=None):
    if child_pin is not None and not pin(child_pin):return dict(status='REFUSED',reason='CHILD_PIN_REQUIRED')
    if not all(pin(p) for p in (expected,parent_pin,plan_pin)):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        bundle=check_wire(data.decode('utf-8',errors='strict'),40)
        result=reconstruct_transaction(bundle,parent_pin,plan_pin)
        if child_pin is not None and result['childDigest']!=child_pin:return dict(status='REFUSED',reason='CHILD_PIN_MISMATCH')
        return dict(status='VERIFIED',profile=VERSION,result=result,qualification='Independent structural transformation and conditional arithmetic replay only; no source truth, semantic validity, freshness, or external authority.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
