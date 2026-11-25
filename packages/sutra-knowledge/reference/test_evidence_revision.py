#!/usr/bin/env python3
"""Independent synthetic atomic transaction parity and tamper controls."""
import json,sys
from copy import deepcopy
from verify_conflict import rawhash,require
from verify_evidence_revision import verify
def wire(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def check(data,pin,parent,plan):
    r=verify(data,pin,parent,plan);require(r['status']=='VERIFIED')
    obj=json.loads(data)
    def refused(x,pp=parent,pl=plan):
        s=wire(x);require(verify(s.encode('utf-8'),rawhash(s),pp,pl)['status']=='REFUSED')
    for k,v in [('decisionAuthority','VERIFIED'),('changes',[]),('sourceChanges',[]),('invalidatedBindingIds',['invented']),('reselectedBindingIds',['invented']),('missingBindingIds',['invented']),('qualification','truth'),('childDigest',parent)]:
        m=deepcopy(obj);m[k]=v;refused(m)
    for edit in (lambda p:p['operations'].append(p['operations'][0]),lambda p:p['operations'][0].update(previousDigest='sha256:'+'0'*64),lambda p:p['operations'][0].update(sourceId='question')):
        m=deepcopy(obj);p=json.loads(m['planText']);edit(p);m['planText']=wire(p);m['planDigest']=rawhash(m['planText']);refused(m,pl=m['planDigest'])
    # Independently repinned program change, with all nested binding digests updated.
    m=deepcopy(obj);v=json.loads(m['childVersion']);b=json.loads(v['batchText']);a=json.loads(v['annotationText'])
    for entry in b['proposals']:
        p=json.loads(entry['proposalText'])
        if 'nodes' not in p:continue
        next(n for n in p['nodes'] if n['id']==p['targetId'])['op']='eq';entry['proposalText']=wire(p);break
    v['batchText']=wire(b);a['batchDigest']=rawhash(v['batchText']);v['annotationText']=wire(a);v['annotationPin']=rawhash(v['annotationText'])
    m['childVersion']=wire(v);m['childDigest']=rawhash(m['childVersion']);refused(m)
    # Actual numeric reselection must match the independent plan, not merely a valid child.
    p=json.loads(obj['planText'])
    for op in p['operations']:
        if op.get('rebindings'):
            m=deepcopy(obj);q=json.loads(m['planText']);target=next(o for o in q['operations'] if o.get('rebindings'))
            target['rebindings'][0]['span']['quote']='999';m['planText']=wire(q);m['planDigest']=rawhash(m['planText']);refused(m,pl=m['planDigest']);break
    for args in [(data+b' ',pin,parent,plan),(data,pin,'sha256:'+'0'*64,plan),(data,pin,parent,'sha256:'+'0'*64),(data,'sha256:'+'0'*64,parent,plan)]:require(verify(*args)['status']=='REFUSED')
    return r
def main():
    cases=json.load(sys.stdin);require(len(cases)==4);classes=set()
    for c in cases:
        r=check(c['bundleText'].encode('utf-8'),c['snapshotPin'],c['parentDigest'],c['planDigest'])
        classes.update(x['classification'] for x in r['result']['changes'])
    require(classes=={'TARGET_INPUT_MISSING','TARGET_INPUT_RESELECTED','CONTEXT_OR_NONTARGET_REVISED','REFUSED_PARENT_QUARANTINED','NO_SCOPED_SOURCE_DEPENDENCY'})
    print('4 independent atomic transaction cases, all five classifications, nested repinning and stale/forged plan controls refused.')
if __name__=='__main__':main()
