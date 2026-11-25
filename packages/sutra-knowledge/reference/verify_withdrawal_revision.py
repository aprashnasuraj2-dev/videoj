"""Independent structural source-withdrawal replay over exact pinned versions.
Never accept caller-supplied states as proof; independently replay both versions.
"""
from copy import deepcopy
from hashlib import sha256
from verify import canonical,keys
from verify_conflict import rawhash,require
from verify_reviewed_compiler import pin,ident
from verify_reviewed_contrast import decisive
from verify_living_version import reconstruct,compare,check_wire,indexed,FACETS,ERRORS
VERSION='sutra-withdrawal-revision/v1'
MAX_BYTES=262144
QUAL='Proposed child only. Exact admitted programs are rebound; missing inputs become typed unknowns, withdrawn quotations and links are removed, and refused parents stay refused. Meaning statements remain unverified. No evidence substitution, receipt transplantation, global dependency completeness or incremental speedup.'
def reconstruct_withdrawal(bundle,parent_pin,plan_pin):
    require(keys(bundle,('version','parentVersion','parentDigest','planText','planDigest','childVersion','childDigest','changes','impact','decisionAuthority','qualification')))
    require(bundle['version']==VERSION and bundle['parentDigest']==parent_pin and bundle['planDigest']==plan_pin and bundle['decisionAuthority']=='NONE' and bundle['qualification']==QUAL)
    plan=check_wire(bundle['planText'],5)
    require(rawhash(bundle['planText'])==plan_pin and keys(plan,('version','parentDigest','sourceId','sourcePin')) and type(plan['version']) is int and plan['version']==1 and plan['parentDigest']==parent_pin and ident(plan['sourceId']) and pin(plan['sourcePin']))
    source=plan['sourceId'];old_text=bundle['parentVersion'];new_text=bundle['childVersion'];child_pin=bundle['childDigest']
    old_report=reconstruct(old_text,parent_pin);new_report=reconstruct(new_text,child_pin)
    require(new_report['previousDigest']==parent_pin)
    old=check_wire(old_text,6);new=check_wire(new_text,6)
    c1=check_wire(old['contractText'],9);c2=check_wire(new['contractText'],9)
    sources=indexed(c1['sources']);require(source in sources and sources[source]['digest']==plan['sourcePin'])
    removed={b['id'] for b in c1['bindings'] if b['span']['sourceId']==source}
    types={b['id']:b['type'] for b in c1['bindings']}
    expected_contract=dict(c1,sources=[s for s in c1['sources'] if s['id']!=source],bindings=[b for b in c1['bindings'] if b['id'] not in removed])
    require(canonical(c2)==canonical(expected_contract))
    b1=check_wire(old['batchText'],5);b2=check_wire(new['batchText'],5)
    a1=check_wire(old['annotationText'],12);a2=check_wire(new['annotationText'],12)
    ids=[x['id'] for x in b1['proposals']]
    require(ids==[x['id'] for x in b2['proposals']]==[x['id'] for x in a2['candidates']])
    old_candidates=indexed(old_report['candidates']);new_candidates=indexed(new_report['candidates'])
    old_annotations=indexed(a1['candidates']);new_annotations=indexed(a2['candidates'])
    changes=[]
    for p,q in zip(b1['proposals'],b2['proposals']):
        i=p['id'];before=old_candidates[i];after=new_candidates[i];accepted=before['admission']=='ADMITTED'
        require(after['admission']==before['admission'])
        digest=rawhash(p['proposalText']);inputs=[];claims=[];links=[]
        if not accepted:
            expected_proposal=dict(version=1,quarantinedProposalDigest=digest)
        else:
            expected_proposal=deepcopy(check_wire(p['proposalText'],9))
            expected_proposal['contractDigest']=new['contractPin']
            # Direct per-node comparison, not execution of source or proposal text.
            for j,node in enumerate(expected_proposal['nodes']):
                if node['kind']=='input' and node['bindingId'] in removed:
                    binding=node['bindingId'];inputs.append(dict(nodeId=node['id'],bindingId=binding))
                    expected_proposal['nodes'][j]=dict(id=node['id'],kind='unknown',type=types[binding],reason='Source '+source+' withdrawn; reviewed binding '+binding+' unavailable.')
            retained=[]
            for claim in expected_proposal['claims']:
                if claim['kind']=='quoted_assertion' and claim['span']['sourceId']==source:claims.append(claim['id'])
                else:retained.append(claim)
            expected_proposal['claims']=retained
        require(canonical(check_wire(q['proposalText'],9))==canonical(expected_proposal))
        annotation=deepcopy(old_annotations[i]);facets=annotation['facets']
        for facet in FACETS:
            f=facets[facet]
            if f is None:continue
            kept=[]
            for r in f['references']:
                drop=not accepted or (r['id'] in removed if r['kind']=='binding' else r['id'] in claims)
                if drop:links.append(dict(facet=facet,kind=r['kind'],id=r['id']))
                else:kept.append(r)
            f['references']=kept
        require(canonical(annotation)==canonical(new_annotations[i]))
        target=sorted(set(before['computation']['bindingIds'])&removed) if accepted else []
        prior=before['obligations']['computation'];state=after['obligations']['computation']
        require((not target and prior==state) or (target and not decisive(state)))
        classification='REFUSED_PARENT_QUARANTINED' if not accepted else 'TARGET_EVIDENCE_WITHDRAWN' if target else 'CONTEXT_OR_NONTARGET_WITHDRAWN' if inputs or claims or links else 'NO_SCOPED_SOURCE_DEPENDENCY'
        changes.append(dict(id=i,parentAdmission=before['admission'],parentProposalDigest=digest,targetBindings=target,changedInputs=inputs,removedClaims=claims,removedReferences=links,classification=classification,before=prior,after=state))
    require(canonical(changes)==canonical(bundle['changes']))
    impact=compare(old_text,parent_pin,new_text,child_pin)
    claimed=deepcopy(bundle['impact'])
    # Producer-specific refusal codes are not independent proof.
    refused={r['id'] for r in impact['missing'] if r['reason']=='REFUSED'}
    for row in claimed['missing']:
        if row['id'] in refused:
            require(isinstance(row['reason'],str) and len(row['reason'])<=128);row['reason']='REFUSED'
    require(canonical(impact)==canonical(claimed))
    return dict(version=VERSION,parentDigest=parent_pin,childDigest=child_pin,planDigest=plan_pin,sourceId=source,changes=changes,impact=impact,decisionAuthority='NONE')
def verify(data,expected,parent_pin,plan_pin):
    if not all(pin(p) for p in (expected,parent_pin,plan_pin)):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        bundle=check_wire(data.decode('utf-8',errors='strict'),40)
        return dict(status='VERIFIED',profile=VERSION,result=reconstruct_withdrawal(bundle,parent_pin,plan_pin),qualification='Independent structural transformation and full conditional replay only; no source truth, meaning, freshness, external authority or incremental performance claim.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
