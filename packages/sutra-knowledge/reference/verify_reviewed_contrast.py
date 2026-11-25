#!/usr/bin/env python3
"""Independent fixed scripted consensus replay; no generic refusal-order claim."""
import json,sys
from pathlib import Path
from copy import deepcopy
from verify import canonical,keys
from verify_conflict import bounded_load,rawhash,require
from verify_reviewed_compiler import audit,fixture,compact,ident
VERSION='sutra-reviewed-proposal-contrast/v1'
QUAL='Compares exact typed expression structure, reviewed input bindings and conditional arithmetic states. Equal structure is not semantic validity; distinct structure may be algebraically equivalent. Different targets are not a proven contradiction. Declared lineages and model labels are not independent evidence. No voting, adoption, causal conclusion or authority.'
def decisive(s):return s in ('CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED')
def describe(r):
    by={n['id']:n for n in r['nodes']};memo={}
    def sig(i):
        if i in memo:return memo[i]
        n=by[i];k=n['kind']
        if k=='input':shape=dict(kind=k,bindingId=n['bindingId'],type=n['type'])
        elif k=='unknown':shape=dict(kind=k,proposalDigest=r['proposalDigest'],id=i,type=n['type'])
        else:shape=dict(kind=k,op=n['op'],args=[sig(x) for x in n['args']],type=n['type'])
        memo[i]=rawhash(compact(shape));return memo[i]
    t=by[r['target']['id']];args=[sig(i) for i in t['args']];target=sig(t['id']);bindings=t['bindings'];used=[b for b in r['bindings'] if b['id'] in bindings]
    return dict(proposalDigest=r['proposalDigest'],status=r['target']['status'],targetSignature=target,operandSignatures=args,signatureNodes=len(memo),targetOperator=t['op'],selfComparison=args[0]==args[1],bindingIds=bindings,sourceIds=r['target']['sourceIds'],declaredLineages=r['target']['declaredLineages'],sourceDigests=sorted({b['span']['sourceDigest'] for b in used}),missing=r['target']['missing'],typeBlockers=r['target']['typeBlockers'],questionRelevance='UNVERIFIED',methodValidity='UNVERIFIED')
def pair(left,right):
    a=left['computation'];b=right['computation'];same=a['targetSignature']==b['targetSignature']
    require(not(same and decisive(a['status']) and decisive(b['status']) and a['status']!=b['status']))
    def relation(key):
        x=set(a[key]);y=set(b[key]);return dict(shared=sorted(x&y),onlyLeft=sorted(x-y),onlyRight=sorted(y-x))
    state='AT_LEAST_ONE_UNRESOLVED'
    if decisive(a['status']) and decisive(b['status']):state='SAME_CONDITIONAL_STATE' if a['status']==b['status'] else 'OPPOSITE_CONDITIONAL_STATES'
    return dict(left=left['id'],right=right['id'],expressionRelation='IDENTICAL_TYPED_STRUCTURE' if same else 'DIFFERENT_STRUCTURE_NOT_PROVEN_EQUIVALENT',stateRelation=state,bindingRelation=relation('bindingIds'),sourceRelation=relation('sourceIds'),sourceDigestRelation=relation('sourceDigests'),declaredLineageRelation=relation('declaredLineages'),semanticContradiction='NOT_ESTABLISHED',independentEvidence='NOT_ESTABLISHED')
def reconstruct(contract,p,batch):
    require(contract==fixture(False) and rawhash(contract)==p)
    b=bounded_load(batch,262144,5);require(keys(b,('version','contractDigest','proposals')) and b['version']==1 and b['contractDigest']==p and isinstance(b['proposals'],list) and len(b['proposals'])==8)
    require(len({x['id'] for x in b['proposals']})==8 and all(keys(x,('id','proposalText')) and ident(x['id']) and isinstance(x['proposalText'],str) and 0<len(x['proposalText'])<=65536 for x in b['proposals']))
    entries=[]
    for x in sorted(b['proposals'],key=lambda x:x['id']):
        try:r=audit(contract,p,x['proposalText'])['result']
        except (ValueError,TypeError,KeyError,AttributeError,UnicodeError,RecursionError):
            # Frozen challenge only: independently establish that this exact
            # extra numeric leaf violates the closed input-node schema.
            proposal=bounded_load(x['proposalText'],65536,9)
            require(x['id']=='fabricated_value' and any(n.get('kind')=='input' and 'value' in n for n in proposal['nodes']))
            entries.append(dict(id=x['id'],admission='REFUSED',reason='COMPILER_NODE',computation=None));continue
        entries.append(dict(id=x['id'],admission='ADMITTED',reason=None,computation=describe(r)))
    accepted=[e for e in entries if e['admission']=='ADMITTED']
    pairs=[pair(a,b) for i,a in enumerate(accepted) for b in accepted[i+1:]]
    def groups(field):
        m={}
        for e in accepted:m.setdefault(e['computation'][field],[]).append(e['id'])
        return [dict(digest=d,ids=ids) for d,ids in sorted(m.items())]
    tg=groups('targetSignature');pg=groups('proposalDigest')
    counts=dict(admitted=len(accepted),refused=len(entries)-len(accepted),satisfied=sum(e['computation']['status']=='CONDITIONALLY_SATISFIED' for e in accepted),refuted=sum(e['computation']['status']=='CONDITIONALLY_REFUTED' for e in accepted),unresolved=sum(not decisive(e['computation']['status']) for e in accepted),distinctTypedStructures=len(tg),distinctProposalBytes=len(pg),selfComparisons=sum(e['computation']['selfComparison'] for e in accepted))
    return dict(version=VERSION,contractDigest=p,batchDigest=rawhash(batch),entries=entries,pairs=pairs,counts=counts,targetGroups=tg,duplicateProposalGroups=[g for g in pg if len(g['ids'])>1],duplicateSourceBytes=[],decisionAuthority='NONE',qualification=QUAL)
def verify(b,p):
    try:return keys(b,('version','contractText','batchText','result')) and b['version']==VERSION and canonical(b['result'])==canonical(reconstruct(b['contractText'],p,b['batchText']))
    except (ValueError,TypeError,KeyError,AttributeError,UnicodeError,RecursionError):return False
def main():
    require(len(sys.argv)==2)
    with Path(sys.argv[1]).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
    p=rawhash(fixture(False));require(verify(b,p));r=b['result']
    require(r['counts']==dict(admitted=7,refused=1,satisfied=6,refuted=1,unresolved=0,distinctTypedStructures=3,distinctProposalBytes=3,selfComparisons=5) and len(r['pairs'])==21 and len(r['duplicateProposalGroups'][0]['ids'])==5)
    mutants=[]
    for k,v in [('counts',{}),('targetGroups',[]),('duplicateProposalGroups',[]),('decisionAuthority','MAJORITY'),('qualification','truth established'),('batchDigest','forged')]:
        m=deepcopy(b);m['result'][k]=v;mutants.append(m)
    for k,v in [('selfComparison',False),('targetSignature','forged'),('signatureNodes',999),('questionRelevance','ESTABLISHED'),('sourceDigests',[])]:
        m=deepcopy(b);i=next(i for i,e in enumerate(m['result']['entries']) if e['id']=='scripted_copy_1');m['result']['entries'][i]['computation'][k]=v;mutants.append(m)
    for k,v in [('semanticContradiction','PROVEN'),('independentEvidence','PROVEN'),('expressionRelation','FORGED')]:
        m=deepcopy(b);m['result']['pairs'][0][k]=v;mutants.append(m)
    for k in ('contractText','batchText'):
        m=deepcopy(b);m[k]+=' ';mutants.append(m)
    for m in mutants:require(not verify(m,p))
    print('ACCEPTED 8 scripted proposals / 21 admitted pairs; REJECTED',len(mutants),'mutants')
if __name__=='__main__':main()
