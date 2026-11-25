#!/usr/bin/env python3
"""Independent browser batch and restricted order predicates; exact fixture only."""
import json,sys,operator
from copy import deepcopy
from pathlib import Path
from verify import canonical,keys
from verify_conflict import bounded_load,rawhash,require
from verify_reviewed_compiler import audit
from verify_reviewed_contrast import describe,pair,VERSION as CONTRAST_VERSION,QUAL as CONTRAST_QUAL
from verify_reviewed_workspace import fixture
VERSION='sutra-reviewed-order-contrast/v1'
QUAL='Conditional total-order logic only for structurally identical typed operands, with reversed orientation normalized. Assumes defined comparable exact scalar quantities; not semantic equivalence, source truth, model independence or a vote. Unaligned expressions remain unclassified. Observed truth-state compatibility is separate from the symbolic relation.'
OPS=dict(lt=operator.lt,le=operator.le,eq=operator.eq,ge=operator.ge,gt=operator.gt)
SIGNS=[('LT',-1,0),('EQ',0,0),('GT',1,0)]
def order(a,b):
    u,v=a['operandSignatures'],b['operandSignatures'];direct=u==v
    if not direct and u!=v[::-1]:return dict(status='UNALIGNED_OPERANDS')
    if a['typeBlockers'] or b['typeBlockers']:return dict(status='BLOCKED_TYPE')
    cases=[x for x in SIGNS if x[0]=='EQ'] if u[0]==u[1] else SIGNS
    rows=[(s,OPS[a['targetOperator']](x,y),OPS[b['targetOperator']](x,y) if direct else OPS[b['targetOperator']](y,x)) for s,x,y in cases]
    l=[s for s,a,b in rows if a];r=[s for s,a,b in rows if b];both=[s for s,a,b in rows if a and b];neither=[s for s,a,b in rows if not a and not b]
    li=all(not a or b for _,a,b in rows);ri=all(not b or a for _,a,b in rows)
    rel='EQUIVALENT' if li and ri else 'COMPLEMENT' if all(a!=b for _,a,b in rows) else 'MUTUALLY_EXCLUSIVE_NONEXHAUSTIVE' if not both else 'LEFT_IMPLIES_RIGHT' if li else 'RIGHT_IMPLIES_LEFT' if ri else 'OVERLAP'
    states={'CONDITIONALLY_SATISFIED':True,'CONDITIONALLY_REFUTED':False};observed=None
    if a['status'] in states and b['status'] in states:
        observed=[s for s,x,y in rows if x==states[a['status']] and y==states[b['status']]];require(bool(observed))
    return dict(status='CLASSIFIED',orientation='DIRECT' if direct else 'REVERSED',domain=[s for s,_,_ in rows],leftTrueOrders=l,rightTrueOrders=r,overlap=both,uncovered=neither,leftImpliesRight=li,rightImpliesLeft=ri,relation=rel,compatibleObservedOrders=observed)
def reconstruct(b):
    require(keys(b,('version','contrast','orderRelations','decisionAuthority','qualification')) and b['version']==VERSION)
    c=b['contrast'];ct=fixture();pin=rawhash(ct)
    require(keys(c,('version','contractText','batchText','result')) and c['version']==CONTRAST_VERSION and c['contractText']==ct)
    bt=c['batchText'];batch=bounded_load(bt,262144,5)
    require(keys(batch,('version','contractDigest','proposals')) and batch['version']==1 and batch['contractDigest']==pin and len(batch['proposals'])==5)
    entries=[]
    first=bounded_load(batch['proposals'][0]['proposalText'],65536,12)
    require(first['nodes']==[dict(id='left_value',kind='input',bindingId='a'),dict(id='right_value',kind='input',bindingId='b'),dict(id='target',kind='constraint',op='gt',args=['left_value','right_value'])])
    for i,(e,(op,rev,hostile)) in enumerate(zip(batch['proposals'],[('gt',False,False),('lt',True,False),('le',False,False),('lt',False,False),('gt',False,True)]),1):
        require(keys(e,('id','proposalText')) and e['id']=='proposal_'+str(i))
        p=deepcopy(first);p['nodes'][-1]['op']=op
        if rev:p['nodes'][-1]['args'].reverse()
        if hostile:p['nodes'][0]['value']='999'
        require(bounded_load(e['proposalText'],65536,12)==p)
        if hostile:
            rejected=False
            try:audit(ct,pin,e['proposalText'])
            except (ValueError,TypeError,KeyError,AttributeError,UnicodeError,RecursionError):rejected=True
            require(rejected);entries.append(dict(id=e['id'],admission='REFUSED',reason='COMPILER_NODE',computation=None))
        else:entries.append(dict(id=e['id'],admission='ADMITTED',reason=None,computation=describe(audit(ct,pin,e['proposalText'])['result'])))
    accepted=entries[:4];pairs=[pair(a,b) for i,a in enumerate(accepted) for b in accepted[i+1:]]
    def groups(key):
        d={}
        for e in accepted:d.setdefault(e['computation'][key],[]).append(e['id'])
        return [dict(digest=k,ids=v) for k,v in sorted(d.items())]
    tg=groups('targetSignature');pg=groups('proposalDigest')
    states=[e['computation']['status'] for e in accepted]
    counts=dict(admitted=4,refused=1,satisfied=states.count('CONDITIONALLY_SATISFIED'),refuted=states.count('CONDITIONALLY_REFUTED'),unresolved=sum(s not in ('CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED') for s in states),distinctTypedStructures=len(tg),distinctProposalBytes=len(pg),selfComparisons=sum(e['computation']['selfComparison'] for e in accepted))
    r=dict(version=CONTRAST_VERSION,contractDigest=pin,batchDigest=rawhash(bt),entries=entries,pairs=pairs,counts=counts,targetGroups=tg,duplicateProposalGroups=[g for g in pg if len(g['ids'])>1],duplicateSourceBytes=[],decisionAuthority='NONE',qualification=CONTRAST_QUAL)
    relations=[dict(left=a['id'],right=b['id'],**order(a['computation'],b['computation'])) for i,a in enumerate(accepted) for b in accepted[i+1:]]
    return dict(version=VERSION,contrast=dict(version=CONTRAST_VERSION,contractText=ct,batchText=bt,result=r),orderRelations=relations,decisionAuthority='NONE',qualification=QUAL)
def main():
    require(len(sys.argv)==2)
    with Path(sys.argv[1]).open(encoding='utf-8') as fp:b=bounded_load(fp.read(1048577),1048576,40)
    exp=reconstruct(b)
    def verify(x):
        try:return canonical(x)==canonical(reconstruct(x))
        except (ValueError,TypeError,KeyError,AttributeError,UnicodeError,RecursionError):return False
    require(canonical(b)==canonical(exp));require(len(exp['orderRelations'])==6)
    mutants=[]
    for k,v in [('decisionAuthority','MAJORITY'),('qualification','truth established'),('orderRelations',[])]:
        m=deepcopy(b);m[k]=v;mutants.append(m)
    for k,v in [('relation','FORGED'),('orientation','FORGED'),('domain',[]),('uncovered',['GT']),('overlap',[]),('leftImpliesRight',False),('compatibleObservedOrders',['LT'])]:
        m=deepcopy(b);m['orderRelations'][0][k]=v;mutants.append(m)
    for k,v in [('counts',{}),('entries',[]),('batchDigest','forged')]:
        m=deepcopy(b);m['contrast']['result'][k]=v;mutants.append(m)
    m=deepcopy(b);m['contrast']['contractText']+=' ';mutants.append(m)
    m=deepcopy(b);m['contrast']['batchText']+=' ';mutants.append(m)
    for m in mutants:
        require(canonical(m)!=canonical(b)) # negative controls must actually mutate the artifact
        require(not verify(m))
    print('ACCEPTED actual caller-staged 5 proposals, 6 independently reconstructed order relations; REJECTED',len(mutants),'mutants')
if __name__=='__main__':main()
