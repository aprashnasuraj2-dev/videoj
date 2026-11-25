"""Independent controlled reconstruction of admitted steps, not semantic equivalence."""
from hashlib import sha256
from verify import canonical,keys
from verify_conflict import require
from verify_reviewed_compiler import audit,pin,compact
from verify_living_version import reconstruct,check_wire,FACETS,ERRORS
VERSION='sutra-controlled-roundtrip/v1'
MAX_BYTES=262144
OPERATORS={'add':'plus','sub':'minus','mul':'multiplied by','div':'divided by','eq':'equals','lt':'is less than','le':'is at most','gt':'is greater than','ge':'is at least'}
QUAL='Controlled language describes admitted instructions, not the intended meaning or truth of the original question. Unselected bytes and unspecified facets are review prompts, not automatic semantic omissions. Structural differences do not establish semantic inequivalence. Supplied candidates only.'
def steps(c):
    nodes={n['id']:n for n in c['nodes']};bindings={b['id']:b for b in c['bindings']};seen=set();rows=[]
    # Explicit postorder traversal of target dependency edges, never execution of text.
    stack=[(c['target']['id'],False)]
    while stack:
        i,expanded=stack.pop()
        if i in seen:continue
        n=nodes[i]
        if not expanded:
            stack.append((i,True))
            stack.extend((a,False) for a in reversed(n.get('args',[])))
            continue
        seen.add(i);kind=n['kind'];source=None
        if kind=='input':
            b=bindings[n['bindingId']]
            statement=i+' is the reviewed numeric token '+compact(b['span']['quote'])+' ('+b['type']['unit']+'; '+b['type']['kind']+'; declared scope '+b['type']['scope']+').'
            source=dict(bindingId=b['id'],span=b['span'],exactValue=b['value'],declaredType=b['type'])
        elif kind=='unknown':statement=i+' requires an unavailable input. Declared reason: '+compact(n['reason'])+'.'
        elif kind=='derive':statement=i+' is '+n['args'][0]+' '+OPERATORS[n['op']]+' '+n['args'][1]+'.'
        else:statement='Test whether '+n['args'][0]+' '+OPERATORS[n['op']]+' '+n['args'][1]+'.'
        rows.append(dict(id=i,kind=kind,operator=n.get('op'),arguments=n.get('args',[]),statement=statement,source=source,status=n['status'],outcome=n['receipt']['outcome'] if n['receipt'] else None,missing=n['missing'],typeBlockers=n['typeBlockers']))
    return dict(targetId=c['target']['id'],targetStatus=c['target']['status'],steps=rows,excludedNodeIds=[n['id'] for n in c['nodes'] if n['id'] not in seen])
def calculate(vtext,vpin):
    replay=reconstruct(vtext,vpin);v=check_wire(vtext,6);b=check_wire(v['batchText'],5);props={p['id']:p['proposalText'] for p in b['proposals']}
    q=replay['originalQuestion'];raw=q['text'].encode('utf-8');candidates=[]
    for c in replay['candidates']:
        span=c['questionSpan']
        selection=dict(selected=span['quote'],unselectedPrefix=raw[:span['start']].decode('utf-8'),unselectedSuffix=raw[span['end']:].decode('utf-8'),coverage=c['questionCoverage']) if span else None
        computation=steps(audit(v['contractText'],v['contractPin'],props[c['id']])['result']) if c['admission']=='ADMITTED' else None
        qualifiers=[dict(facet=k,**c['facets'][k]) for k in FACETS]
        review=dict(unselectedQuestionText=c['questionCoverage']=='PARTIAL_QUESTION_SPAN',unspecifiedFacets=[x['facet'] for x in qualifiers if x['status']=='UNSPECIFIED'],unsupportedFacets=[x['facet'] for x in qualifiers if x['status']=='UNSUPPORTED_DECLARATION'],meaning='UNVERIFIED',entailment='UNVERIFIED',method='UNVERIFIED')
        candidates.append(dict(id=c['id'],proposedMeaning=c['meaning'],admission=c['admission'],questionSelection=selection,computation=computation,qualifiers=qualifiers,review=review))
    def shape(c):
        return [dict(id=s['id'],kind=s['kind'],operator=s['operator'],arguments=s['arguments'],binding=s['source']['bindingId'] if s['source'] else None) for s in c['computation']['steps']] if c['computation'] else None
    differences=[]
    for i,a in enumerate(candidates):
        for b in candidates[i+1:]:
            facets=[k for k,x,y in zip(FACETS,a['qualifiers'],b['qualifiers']) if x!=y]
            differences.append(dict(left=a['id'],right=b['id'],declaredQualifierDifferences=facets,selectedQuestionDiffers=a['questionSelection']!=b['questionSelection'],instructionStructureDiffers=shape(a)!=shape(b),interpretationEquivalence='NOT_ESTABLISHED'))
    return dict(version=VERSION,versionDigest=vpin,originalQuestion=q,candidates=candidates,differences=differences,triage=replay['triage'],decisionAuthority='NONE',qualification=QUAL)
def verify(data,expected,vpin):
    if not all(pin(p) for p in (expected,vpin)):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        b=check_wire(data.decode('utf-8',errors='strict'),40);require(keys(b,('versionText','versionDigest','result')) and b['versionDigest']==vpin)
        r=calculate(b['versionText'],vpin);require(canonical(r)==canonical(b['result']))
        return dict(status='VERIFIED',profile=VERSION,result=r,qualification='Independent target reconstruction and source-linked declarations only. Intended meaning, source truth and authority are unverified.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
