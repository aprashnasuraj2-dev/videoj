#!/usr/bin/env python3
"""Independent closed reviewed compiler replay; no model, network, or semantic truth authority."""
import json,re,sys,unicodedata
from pathlib import Path
from fractions import Fraction
from copy import deepcopy
from verify import canonical,keys,recompute
from verify_conflict import bounded_load,require,rawhash
VERSION='sutra-reviewed-claim-compiler/v1'
QUAL='Exact source spans and host-pinned bindings only. Quotation integrity is not source truth or semantic entailment. Quantity types and comparability scope are declared by the host, not established by the compiler. Proposed formulas and target relevance are unverified. No evidence independence, causal inference, professional advice or external action is established.'
WHITESPACE=" \t\n\r\v\f\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
def compact(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def ident(x):return isinstance(x,str) and re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]{0,63}',x) is not None
def pin(x):return isinstance(x,str) and re.fullmatch(r'sha256:[a-f0-9]{64}',x) is not None
def text(x,n):return isinstance(x,str) and 0<len(x.encode('utf-16-le'))//2<=n and bool(x.strip(WHITESPACE))
def bounded_int(x):return type(x) is int and x>=0
def typ(x):
    require(keys(x,('kind','unit','scope','dimension')) and all(ident(x[k]) for k in ('kind','unit','scope')) and isinstance(x['dimension'],list) and len(x['dimension'])==3 and all(type(v) is int and -16<=v<=16 for v in x['dimension']))
    require((x['unit']=='one' and x['dimension']==[0,0,0]) if x['kind']=='ratio' else x['unit']!='one')
    return {k:x[k] for k in ('kind','unit','scope','dimension')}
def exact(lexeme,t):
    if re.fullmatch(r'-?(?:0|[1-9][0-9]{0,23})/[1-9][0-9]{0,23}',lexeme):v=Fraction(lexeme)
    else:
        m=re.fullmatch(r'(-?)(0|[1-9][0-9]{0,23})(?:\.([0-9]{1,12}))?(%)?',lexeme);require(m is not None)
        require(not m[4] or t['kind']=='ratio')
        v=Fraction(lexeme.rstrip('%'))/(100 if m[4] else 1)
    require(v!=0 or not lexeme.startswith('-'))
    return f'{v.numerator}/{v.denominator}'
def span(s,docs,numeric=False):
    require(keys(s,('sourceId','start','end','quote')) and s['sourceId'] in docs and bounded_int(s['start']) and bounded_int(s['end']) and 0<s['end']-s['start']<=4096 and text(s['quote'],2048))
    raw,digest,lineage,origin=docs[s['sourceId']]
    require(s['end']<=len(raw));found=raw[s['start']:s['end']].decode('utf-8');require(found==s['quote'])
    if numeric:
        before=raw[:s['start']].decode('utf-8')[-1:];after=raw[s['end']:].decode('utf-8')[:1]
        def continuation(c):return bool(c) and (unicodedata.category(c)[0] in ('L','N') or c in '.,/%+-')
        require(not continuation(before) and not continuation(after))
    return dict(sourceId=s['sourceId'],start=s['start'],end=s['end'],quote=found,sourceDigest=digest,declaredLineage=lineage,origin=origin)
def host(contract,p):
    require(pin(p) and rawhash(contract)==p and 1<=len(contract.encode('utf-8'))<=262144)
    c=bounded_load(contract,262144,9)
    require(keys(c,('version','question','sources','bindings')) and type(c['version']) is int and c['version']==1 and keys(c['question'],('text','digest')) and text(c['question']['text'],8192) and pin(c['question']['digest']) and isinstance(c['sources'],list) and len(c['sources'])<=8 and isinstance(c['bindings'],list) and len(c['bindings'])<=64)
    docs={}
    def add(i,t,d,l,o):
        require(i not in docs and rawhash(t)==d);docs[i]=(t.encode('utf-8'),d,l,o)
    add('question',c['question']['text'],c['question']['digest'],'user_question','user_statement')
    for s in c['sources']:
        require(keys(s,('id','text','digest','lineage')) and ident(s['id']) and s['id']!='question' and ident(s['lineage']) and text(s['text'],16384) and pin(s['digest']))
        add(s['id'],s['text'],s['digest'],s['lineage'],'source_assertion')
    bindings={};locations=set()
    for b in c['bindings']:
        require(keys(b,('id','span','type')) and ident(b['id']) and b['id'] not in bindings)
        t=typ(b['type']);s=span(b['span'],docs,True);loc=(s['sourceId'],s['start'],s['end']);require(loc not in locations);locations.add(loc)
        bindings[b['id']]=dict(id=b['id'],span=s,type=t,value=exact(s['quote'],t))
    digests={}
    for i,(_,d,l,_) in docs.items():
        if i!='question':digests.setdefault(d,[]).append(dict(id=i,lineage=l))
    duplicates=[dict(digest=d,sources=sorted(v,key=lambda x:x['id'])) for d,v in sorted(digests.items()) if len(v)>1]
    return docs,bindings,duplicates
def proposal(wire,pin_value,docs,bindings):
    p=bounded_load(wire,65536,9)
    require(keys(p,('version','contractDigest','questionSpan','claims','nodes','targetId')) and type(p['version']) is int and p['version']==1 and p['contractDigest']==pin_value and isinstance(p['claims'],list) and len(p['claims'])<=32 and isinstance(p['nodes'],list) and 1<=len(p['nodes'])<=64 and ident(p['targetId']))
    q=span(p['questionSpan'],docs);require(q['sourceId']=='question');claims=[];seen=set()
    for c in p['claims']:
        require(isinstance(c,dict) and ident(c.get('id')) and c['id'] not in seen);seen.add(c['id'])
        if c.get('kind')=='quoted_assertion' and keys(c,('id','kind','span')):claims.append(dict(id=c['id'],kind=c['kind'],span=span(c['span'],docs),status='EXACT_QUOTE_ONLY'))
        else:
            require(c.get('kind') in ('hypothesis','assumption') and keys(c,('id','kind','text')) and text(c['text'],2048));claims.append(dict(id=c['id'],kind=c['kind'],text=c['text'],status='PROPOSED_UNVERIFIED'))
    nodes={}
    for n in p['nodes']:
        require(isinstance(n,dict) and ident(n.get('id')) and n['id'] not in nodes);k=n.get('kind')
        if k=='input':require(keys(n,('id','kind','bindingId')) and n['bindingId'] in bindings)
        elif k=='unknown':
            require(keys(n,('id','kind','type','reason')) and text(n['reason'],512));n=dict(n,type=typ(n['type']))
        else:
            require(k in ('derive','constraint') and keys(n,('id','kind','op','args')) and isinstance(n['args'],list) and len(n['args'])==2 and all(ident(x) for x in n['args']) and n['op'] in (('add','sub','mul','div') if k=='derive' else ('eq','lt','le','gt','ge')))
        nodes[n['id']]=n
    require(p['targetId'] in nodes and nodes[p['targetId']]['kind']=='constraint')
    for n in nodes.values():require(all(d in nodes and nodes[d]['kind']!='constraint' for d in n.get('args',[])))
    # Independent repeated ready-set scan instead of the JS Kahn adjacency queue.
    ordered=[];done=set();depth={}
    while len(done)<len(nodes):
        ready=[i for i,n in nodes.items() if i not in done and set(n.get('args',[]))<=done];require(bool(ready));i=min(ready);n=nodes[i]
        depth[i]=1+max((depth[d] for d in n.get('args',[])),default=0);require(depth[i]<=24)
        ordered.append(n);done.add(i)
    return q,claims,ordered,p['targetId']
def result_type(kind,op,a,b):
    if a is None or b is None:return None
    if kind=='constraint' or op in ('add','sub'):return a if a==b else None
    if a['scope']!=b['scope']:return None
    if op=='mul':return b if a['kind']=='ratio' else a if b['kind']=='ratio' else None
    if op=='div':
        if a==b:return dict(kind='ratio',unit='one',scope=a['scope'],dimension=[0,0,0])
        return a if b['kind']=='ratio' else None
    return None
def audit(contract,p,wire):
    docs,bindings,duplicates=host(contract,p);question,claims,ordered,target=proposal(wire,p,docs,bindings);compiled={};executable=[]
    for n in ordered:
        i=n['id'];k=n['kind']
        if k=='input':
            b=bindings[n['bindingId']];row=dict(id=i,kind=k,type=b['type'],status='READY',bindingId=b['id'],missing=[],typeBlockers=[],bindings=[b['id']])
            executable.append(dict(id=i,kind='input',value=b['value'],dimension=b['type']['dimension'],basis='compiler '+p+' '+b['id']))
        elif k=='unknown':row=dict(id=i,kind=k,type=n['type'],status='MISSING_INPUT',reason=n['reason'],missing=[i],typeBlockers=[],bindings=[])
        else:
            d=[compiled[x] for x in n['args']];t=result_type(k,n['op'],d[0]['type'],d[1]['type'])
            missing=sorted({x for dep in d for x in dep['missing']});blockers=sorted({x for dep in d for x in dep['typeBlockers']})
            if t is None and not blockers:blockers=[i]
            status='BLOCKED_TYPE' if blockers else 'BLOCKED_MISSING_INPUT' if missing else 'READY'
            row=dict(id=i,kind=k,op=n['op'],args=n['args'],type=None if k=='constraint' else t,status=status,missing=missing,typeBlockers=blockers,bindings=sorted({x for dep in d for x in dep['bindings']}))
            if status=='READY':executable.append(dict(id=i,kind=k,op=n['op'],args=n['args']))
        compiled[i]=row
    graph=compact(dict(schemaVersion=1,nodes=executable)) if executable else None
    report=json.loads(recompute(graph)) if graph else None;receipts={r['id']:r for r in report['receipts']} if report else {}
    rows=[dict(compiled[i],receipt=receipts.get(i)) for i in sorted(compiled)]
    t=next(r for r in rows if r['id']==target);status=t['status']
    if status=='READY':status={'constraint_satisfied':'CONDITIONALLY_SATISFIED','constraint_refuted':'CONDITIONALLY_REFUTED'}.get(t['receipt']['outcome']['status'],'UNRESOLVED_COMPUTATION')
    used=[bindings[i] for i in t['bindings']]
    result=dict(version=VERSION,contractDigest=p,proposalDigest=rawhash(wire),question=question,claims=claims,bindings=[bindings[i] for i in sorted(bindings)],nodes=rows,graphText=graph,report=report,target=dict(id=target,status=status,missing=t['missing'],typeBlockers=t['typeBlockers'],sourceIds=sorted({b['span']['sourceId'] for b in used}),declaredLineages=sorted({b['span']['declaredLineage'] for b in used}),questionRelevance='UNVERIFIED',methodValidity='UNVERIFIED'),duplicateSourceBytes=duplicates,qualification=QUAL)
    return dict(version=VERSION,contractText=contract,proposalText=wire,result=result)
def verify(bundle,p):
    try:
        require(keys(bundle,('version','contractText','proposalText','result')) and bundle['version']==VERSION)
        return canonical(bundle)==canonical(audit(bundle['contractText'],p,bundle['proposalText']))
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,UnicodeError,RecursionError,StopIteration):return False
def fixture(missing):
    q='Did operating cash minus cash property and equipment additions increase?'
    s='FY2025 OCF = 136162; FY2025 PPE = 64551; FY2026 OCF = 182935;'+('' if missing else ' FY2026 PPE = 115948;')
    t=dict(kind='currency_amount',unit='USD_million',scope='microsoft_consolidated_comparison',dimension=[0,0,0])
    def binding(i,v):
        start=len(s[:s.index(v)].encode('utf-8'));return dict(id=i,span=dict(sourceId='normalized_filing',start=start,end=start+len(v),quote=v),type=t)
    fields=[('ocf25','136162'),('ppe25','64551'),('ocf26','182935')]+([] if missing else [('ppe26','115948')])
    return compact(dict(version=1,question=dict(text=q,digest=rawhash(q)),sources=[dict(id='normalized_filing',text=s,digest=rawhash(s),lineage='microsoft_issuer')],bindings=[binding(i,v) for i,v in fields]))
def main():
    args=sys.argv[1:];require(len(args)==2)
    for path,missing in zip(args,(True,False)):
        with Path(path).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
        p=rawhash(fixture(missing));require(verify(b,p));r=b['result'];require(r['target']['status']==('BLOCKED_MISSING_INPUT' if missing else 'CONDITIONALLY_REFUTED'))
        require(r['target']['questionRelevance']==r['target']['methodValidity']=='UNVERIFIED')
        mutants=[]
        for k,v in [('contractDigest','forged'),('proposalDigest','forged'),('qualification','fact verified'),('bindings',[]),('nodes',[]),('report',None)]:
            x=deepcopy(b);x['result'][k]=v;mutants.append(x)
        for k,v in [('status','VERIFIED'),('questionRelevance','ESTABLISHED'),('methodValidity','ESTABLISHED'),('declaredLineages',['invented'])]:
            x=deepcopy(b);x['result']['target'][k]=v;mutants.append(x)
        for k in ('contractText','proposalText'):
            x=deepcopy(b);x[k]+=' ';mutants.append(x)
        x=deepcopy(b);proposal=json.loads(x['proposalText']);proposal['nodes'][0]['value']='999';x['proposalText']=compact(proposal);mutants.append(x)
        for x in mutants:require(not verify(x,p))
        print('ACCEPTED',Path(path).name,r['target']['status'],'REJECTED',len(mutants),'mutants')
if __name__=='__main__':main()
