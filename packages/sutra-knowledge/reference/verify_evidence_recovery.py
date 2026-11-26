"""Independent exact immediate-revision recovery verification; no JS/model."""
from copy import deepcopy
from hashlib import sha256
from verify import canonical,keys
from verify_conflict import rawhash,require
from verify_reviewed_compiler import pin,ident,text
from verify_living_version import reconstruct,compare,check_wire,indexed,ERRORS
from verify_evidence_revision import verify as verify_prior
VERSION='sutra-evidence-recovery/v1'
MAX_BYTES=262144
QUAL='Proposed recovery from one exactly replayed preceding atomic revision. Every recovered input has an explicit exact numeric selection and its prior declared type; old semantic links and quotations are not restored. Original lineage remains declared, not authenticated. No automatic source correspondence, empirical or semantic truth, arbitrary ancestry recovery, or external authority.'

def reconstruct_recovery(bundle,ancestor_pin,revision_pin,parent_pin,recovery_pin):
    require(keys(bundle,('version','ancestorDigest','revisionPlanDigest','parentDigest','recoveryPlanDigest','restoredSourceIds','recoveredBindingIds','stillMissingBindingIds','changes','impact','decisionAuthority','qualification','priorTransactionText','priorTransactionDigest','recoveryPlanText','childVersion','childDigest')))
    require(bundle['version']==VERSION and bundle['ancestorDigest']==ancestor_pin and bundle['revisionPlanDigest']==revision_pin and bundle['parentDigest']==parent_pin and bundle['recoveryPlanDigest']==recovery_pin and bundle['decisionAuthority']=='NONE' and bundle['qualification']==QUAL)
    prior_text=bundle['priorTransactionText']
    prior=verify_prior(prior_text.encode('utf-8'),bundle['priorTransactionDigest'],ancestor_pin,revision_pin)
    require(prior['status']=='VERIFIED' and prior['result']['childDigest']==parent_pin)
    prior_result=prior['result'];prior_bundle=check_wire(prior_text,40)
    ancestor_text,parent_text=prior_bundle['parentVersion'],prior_bundle['childVersion']
    parent=reconstruct(parent_text,parent_pin)
    child_text,child_pin=bundle['childVersion'],bundle['childDigest']
    child=reconstruct(child_text,child_pin)
    require(child['previousDigest']==parent_pin)
    plan=check_wire(bundle['recoveryPlanText'],10)
    require(rawhash(bundle['recoveryPlanText'])==recovery_pin and keys(plan,('version','parentDigest','revisionPlanDigest','restorations')) and type(plan['version']) is int and plan['version']==1 and plan['parentDigest']==parent_pin and plan['revisionPlanDigest']==revision_pin and isinstance(plan['restorations'],list) and 1<=len(plan['restorations'])<=8)
    a,v,n=(check_wire(t,6) for t in (ancestor_text,parent_text,child_text))
    old,contract,next_contract=(check_wire(x['contractText'],9) for x in (a,v,n))
    old_sources=indexed(old['sources']);old_bindings=indexed(old['bindings'])
    sources=indexed(contract['sources']);bindings=indexed(contract['bindings'])
    lost=set(prior_result['missingBindingIds']);prior_sources={s['sourceId']:s for s in prior_result['sourceChanges']}
    operations={};restored={};recovered={}
    for op in plan['restorations']:
        require(isinstance(op,dict) and op.get('kind') in ('restore_source','reselect_missing'))
        kind=op['kind']
        require(keys(op,('kind','sourceId','sourceText','sourceDigest','rebindings') if kind=='restore_source' else ('kind','sourceId','sourceDigest','rebindings')))
        sid=op['sourceId'];require(ident(sid) and sid in old_sources and sid in prior_sources and sid not in operations and pin(op['sourceDigest']) and isinstance(op['rebindings'],list) and 1<=len(op['rebindings'])<=64)
        if kind=='restore_source':
            require(sid not in sources and prior_sources[sid]['kind']=='withdraw' and text(op['sourceText'],16384) and rawhash(op['sourceText'])==op['sourceDigest'])
            restored[sid]=dict(old_sources[sid],text=op['sourceText'],digest=op['sourceDigest'])
        else:
            require(sid in sources and prior_sources[sid]['kind']=='replace' and sources[sid]['digest']==op['sourceDigest'])
        operations[sid]=op
        for r in op['rebindings']:
            require(keys(r,('bindingId','span')) and keys(r['span'],('sourceId','start','end','quote')))
            bid=r['bindingId'];require(ident(bid) and bid in old_bindings and bid in lost and bid not in bindings and bid not in recovered and old_bindings[bid]['span']['sourceId']==sid and r['span']['sourceId']==sid)
            recovered[bid]=dict(id=bid,span=r['span'],type=old_bindings[bid]['type'])
    expected_contract=dict(contract,sources=contract['sources']+[restored[s['id']] for s in old['sources'] if s['id'] in restored],bindings=contract['bindings']+[recovered[b['id']] for b in old['bindings'] if b['id'] in recovered])
    require(canonical(expected_contract)==canonical(next_contract))
    require(bundle['restoredSourceIds']==sorted(restored) and bundle['recoveredBindingIds']==sorted(recovered) and bundle['stillMissingBindingIds']==sorted(lost-set(recovered)))
    old_batch,new_batch=(check_wire(x['batchText'],5) for x in (v,n))
    old_ann,new_ann=(check_wire(x['annotationText'],12) for x in (v,n))
    require(canonical(new_ann)==canonical(dict(old_ann,contractDigest=n['contractPin'],batchDigest=rawhash(n['batchText']))))
    require(keys(new_batch,('version','contractDigest','proposals')) and new_batch['version']==old_batch['version'] and new_batch['contractDigest']==n['contractPin'])
    require([x['id'] for x in old_batch['proposals']]==[x['id'] for x in new_batch['proposals']])
    parents=indexed(parent['candidates']);children=indexed(child['candidates']);prior_changes=indexed(prior_result['changes']);changes=[]
    for entry,out in zip(old_batch['proposals'],new_batch['proposals']):
        i=entry['id'];before=parents[i];after=children[i];accepted=before['admission']=='ADMITTED';require(before['admission']==after['admission'])
        recovered_inputs=[]
        if accepted:
            program=deepcopy(check_wire(entry['proposalText'],9));program['contractDigest']=n['contractPin']
            expected={x['nodeId']:x for x in prior_changes[i]['changedInputs'] if x['state']=='MISSING' and x['bindingId'] in recovered}
            for j,node in enumerate(program['nodes']):
                x=expected.pop(node['id'],None)
                if x is None:continue
                bid=x['bindingId'];require(node['kind']=='unknown' and canonical(node['type'])==canonical(recovered[bid]['type']))
                recovered_inputs.append(dict(nodeId=node['id'],bindingId=bid,sourceId=x['sourceId']))
                program['nodes'][j]=dict(id=node['id'],kind='input',bindingId=bid)
            require(not expected and canonical(check_wire(out['proposalText'],9))==canonical(program))
        else:require(out['proposalText']==entry['proposalText'])
        missing=set(before['computation']['missing'] if accepted else [])
        target=sorted({x['nodeId'] for x in recovered_inputs if x['nodeId'] in missing})
        old_state=before['obligations']['computation'];new_state=after['obligations']['computation']
        require(target or old_state==new_state)
        classification='REFUSED_PARENT_QUARANTINED' if not accepted else 'TARGET_INPUT_RECOVERED' if target else 'NONTARGET_INPUT_RECOVERED' if recovered_inputs else 'NO_RECOVERY_DEPENDENCY'
        changes.append(dict(id=i,before=old_state,recoveredInputs=recovered_inputs,targetRecoveredNodes=target,after=new_state,classification=classification))
    require(canonical(changes)==canonical(bundle['changes']))
    impact=compare(parent_text,parent_pin,child_text,child_pin);claimed=deepcopy(bundle['impact'])
    refused={r['id'] for r in impact['missing'] if r['reason']=='REFUSED'}
    for row in claimed['missing']:
        if row['id'] in refused:
            require(isinstance(row['reason'],str) and len(row['reason'])<=128);row['reason']='REFUSED'
    require(canonical(impact)==canonical(claimed))
    return dict(version=VERSION,ancestorDigest=ancestor_pin,revisionPlanDigest=revision_pin,parentDigest=parent_pin,recoveryPlanDigest=recovery_pin,childDigest=child_pin,restoredSourceIds=sorted(restored),recoveredBindingIds=sorted(recovered),stillMissingBindingIds=sorted(lost-set(recovered)),changes=changes,impact=impact,decisionAuthority='NONE')

def verify(data,expected,ancestor_pin,revision_pin,parent_pin,recovery_pin,child_pin=None):
    if child_pin is not None and not pin(child_pin):return dict(status='REFUSED',reason='CHILD_PIN_REQUIRED')
    if not all(pin(p) for p in (expected,ancestor_pin,revision_pin,parent_pin,recovery_pin)):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        bundle=check_wire(data.decode('utf-8',errors='strict'),40)
        result=reconstruct_recovery(bundle,ancestor_pin,revision_pin,parent_pin,recovery_pin)
        if child_pin is not None and result['childDigest']!=child_pin:return dict(status='REFUSED',reason='CHILD_PIN_MISMATCH')
        return dict(status='VERIFIED',profile=VERSION,result=result,qualification='Independent structural recovery and conditional arithmetic replay only; no source truth, semantic validity, freshness, or external authority.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
