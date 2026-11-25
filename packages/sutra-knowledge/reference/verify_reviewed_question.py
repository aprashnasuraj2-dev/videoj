"""Independent finite question mapping; exact grammar, spans and conditional arithmetic."""
import re,unicodedata
from hashlib import sha256
from verify import canonical,keys
from verify_conflict import rawhash,require
from verify_reviewed_compiler import host,pin,audit,compact
from verify_living_version import FACETS,ERRORS,check_wire
VERSION='sutra-reviewed-question/v1'
MAX_BYTES=262144
GRAMMAR='IS_EXACT_LEFT_RELATION_EXACT_RIGHT_QUESTION_MARK'
QUAL='Closed English comparison grammar and exact caller-selected operand spans only. Binding correspondences are declarations, not inferred entity or semantic truth. All supplied alternatives are retained, including same-binding or type-blocked comparisons. Unsupported syntax and more than eight combinations are refused, not guessed. No unrestricted natural-language parsing, source retrieval, semantic completeness or external authority.'
PHRASES={'greater than':('>','gt'),'higher than':('>','gt'),'less than':('<','lt'),'lower than':('<','lt'),'at least':('>=','ge'),'at most':('<=','le'),'equal to':('==','eq'),'not greater than':('<=','le'),'not higher than':('<=','le'),'not less than':('>=','ge'),'not lower than':('>=','ge'),'no more than':('<=','le'),'no less than':('>=','ge')}
RESERVED=set('not no and or if unless because except than greater higher less lower equal least most more cause causes causal afterwards respectively'.split())
def span(raw,start,end):
    # UTF-16 indices are the browser selection contract. Decode both prefixes
    # strictly: a surrogate split must fail, not become replacement text.
    require(type(start) is int and type(end) is int and 0<=start<end<=len(raw)//2)
    prefix=raw[:2*start].decode('utf-16-le').encode('utf-8')
    quote=raw[2*start:2*end].decode('utf-16-le')
    return dict(sourceId='question',start=len(prefix),end=len(prefix)+len(quote.encode('utf-8')),quote=quote)
def operand(p,raw,bindings):
    require(keys(p,('start','end','bindingIds')) and isinstance(p['bindingIds'],list) and 1<=len(p['bindingIds'])<=8)
    ids=p['bindingIds'];require(all(isinstance(i,str) and i in bindings for i in ids) and len(set(ids))==len(ids))
    s=span(raw,p['start'],p['end']);words=re.split('[ _-]',s['quote'])
    require(p['end']-p['start']<=128 and all(w and all(unicodedata.category(c)[0] in 'LMN' for c in w) and w.translate(str.maketrans({'ſ':'s','K':'k'})).lower() not in RESERVED for w in words))
    return dict(span=s,bindingIds=sorted(ids))
def calculate(ct,cp,pt,pp):
    require(pin(pp) and rawhash(pt)==pp)
    _,bindings,_=host(ct,cp);c=check_wire(ct,9);p=check_wire(pt,6);q=c['question']['text'];raw=q.encode('utf-16-le');n=len(raw)//2
    require(keys(p,('version','contractDigest','left','right')) and type(p['version']) is int and p['version']==1 and p['contractDigest']==cp and n<=1000)
    l=operand(p['left'],raw,bindings);r=operand(p['right'],raw,bindings)
    ls,le=p['left']['start'],p['left']['end'];rs,re_=p['right']['start'],p['right']['end']
    require(ls==3 and q.startswith('Is ') and re_==n-1 and q.endswith('?') and le<rs)
    middle=raw[2*le:2*rs].decode('utf-16-le');require(middle.startswith(' ') and middle.endswith(' '))
    rel=middle[1:-1];require(rel in PHRASES)
    op,opcode=PHRASES[rel];relspan=span(raw,le+1,rs-1);total=len(l['bindingIds'])*len(r['bindingIds']);require(total<=8)
    candidates=[];proposals=[]
    for a in l['bindingIds']:
        for b in r['bindingIds']:
            i='question_'+str(len(candidates)+1);expression='['+a+']'+op+'['+b+']'
            nodes=[dict(id='input_1',kind='input',bindingId=a)]
            if a!=b:nodes.append(dict(id='input_2',kind='input',bindingId=b))
            nodes.append(dict(id='target',kind='constraint',op=opcode,args=['input_1','input_1' if a==b else 'input_2']))
            claims=[dict(id=k,kind='quoted_assertion',span=s) for k,s in [('left_alias',l['span']),('relation_phrase',relspan),('right_alias',r['span'])]]
            proposal=compact(dict(version=1,contractDigest=cp,questionSpan=span(raw,0,n),claims=claims,nodes=nodes,targetId='target'))
            computed=audit(ct,cp,proposal)['result']['target']['status']
            meaning=l['span']['quote']+' ('+a+') '+rel+' '+r['span']['quote']+' ('+b+')'
            refs=[dict(kind='binding',id=x) for x in dict.fromkeys([a,b])]
            facets=dict.fromkeys(FACETS)
            facets['definition']=dict(statement=meaning,references=refs)
            facets['measurement']=dict(statement='Caller-declared operand correspondence: '+a+' / '+b,references=refs)
            facets['quantifier']=dict(statement='Exact comparison phrase: '+rel,references=[dict(kind='claim',id='relation_phrase')])
            if rel.startswith(('not ','no ')):facets['negation']=dict(statement='Explicit inclusive negated relation: '+rel,references=[dict(kind='claim',id='relation_phrase')])
            candidates.append(dict(id=i,meaning=meaning,facets=facets,leftBinding=a,rightBinding=b,expression=expression,conditionalState=computed));proposals.append(dict(id=i,proposalText=proposal))
    return dict(version=VERSION,contractDigest=cp,planDigest=pp,originalQuestion=c['question'],grammar=GRAMMAR,left=l,relation=dict(span=relspan,operator=op),right=r,candidates=candidates,proposals=proposals,mode='SINGLE_UNTRUSTED_PROPOSAL' if total==1 else 'ALL_DECLARED_ALTERNATIVES',decisionAuthority='NONE',qualification=QUAL)
def verify(data,expected,cp,pp):
    if not all(pin(p) for p in (expected,cp,pp)):return dict(status='REFUSED',reason='PIN_REQUIRED')
    if not isinstance(data,bytes) or not 1<=len(data)<=MAX_BYTES:return dict(status='REFUSED',reason='SIZE_OR_TYPE')
    if 'sha256:'+sha256(data).hexdigest()!=expected:return dict(status='REFUSED',reason='PIN_MISMATCH')
    try:
        b=check_wire(data.decode('utf-8',errors='strict'),40);require(keys(b,('contractText','contractDigest','planText','planDigest','result')) and b['contractDigest']==cp and b['planDigest']==pp)
        result=calculate(b['contractText'],cp,b['planText'],pp);require(canonical(result)==canonical(b['result']))
        return dict(status='VERIFIED',profile=VERSION,result=result,qualification='Exact finite grammar and conditional candidate replay only; intended meaning, source truth and authority remain unverified.')
    except ERRORS:return dict(status='REFUSED',reason='REPLAY_REFUSED')
