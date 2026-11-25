"""Replay actual browser mapping bytes and reject forged recomputed snapshots."""
import json,sys,subprocess
from copy import deepcopy
from pathlib import Path
from verify_conflict import rawhash,require
from verify_reviewed_question import verify,CHANGE_VERSION
def main():
    root=Path(sys.argv[1]);archive=Path(sys.argv[2]).resolve();path=root/'reviewed-question.json';data=path.read_bytes()
    pins=[(root/f'reviewed-question{s}.sha256').read_text().strip() for s in ('','-contract','-plan')]
    r=verify(data,*pins);require(r['status']=='VERIFIED')
    result=r['result'];require(result['relation']['operator']=='>=' and result['relation']['span']['quote']=='not less than' and {x['conditionalState'] for x in result['candidates']}=={'CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED'})
    run=subprocess.run([sys.executable,'-I','-S',str(archive),str(path.resolve()),'--question','--pin',pins[0],'--contract-pin',pins[1],'--plan-pin',pins[2]],capture_output=True,text=True,check=True);require(json.loads(run.stdout)==r)
    original=json.loads(data);mutants=[]
    def mutate(fn):
        m=deepcopy(original);fn(m);require(m!=original);mutants.append(m)
    mutate(lambda m:m['result']['relation'].__setitem__('operator','>'))
    mutate(lambda m:m['result']['candidates'].pop())
    mutate(lambda m:m['result']['candidates'][0].__setitem__('conditionalState','CONDITIONALLY_REFUTED'))
    mutate(lambda m:m['result']['candidates'][0]['facets']['negation'].__setitem__('references',[]))
    mutate(lambda m:m['result'].__setitem__('decisionAuthority','VERIFIED'))
    mutate(lambda m:m['result']['proposals'][0].__setitem__('proposalText',m['result']['proposals'][0]['proposalText'].replace('"ge"','"gt"')))
    mutate(lambda m:m.__setitem__('planText',m['planText']+' '))
    mutate(lambda m:m.__setitem__('contractText',m['contractText']+' '))
    for m in mutants:
        s=json.dumps(m,ensure_ascii=False,separators=(',',':'));require(verify(s.encode(),rawhash(s),pins[1],pins[2])['status']=='REFUSED')
    require(verify(data+b' ',*pins)['status']=='REFUSED')
    for i in (1,2):
        p=pins.copy();p[i]='sha256:'+'0'*64;require(verify(data,*p)['status']=='REFUSED')
    path=root/'reviewed-change-question.json';data=path.read_bytes()
    pins=[(root/f'reviewed-change-question{s}.sha256').read_text().strip() for s in ('','-contract','-plan')]
    r=verify(data,*pins);require(r['status']=='VERIFIED' and r['profile']==CHANGE_VERSION)
    result=r['result'];require(len(result['candidates'])==4 and {x['conditionalState'] for x in result['candidates']}=={'CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED','BLOCKED_TYPE'})
    require(result['change']['modes']==['SIGNED_DIFFERENCE','SIGNED_RELATIVE_CHANGE'])
    run=subprocess.run([sys.executable,'-I','-S',str(archive),str(path.resolve()),'--question','--pin',pins[0],'--contract-pin',pins[1],'--plan-pin',pins[2]],capture_output=True,text=True,check=True);require(json.loads(run.stdout)==r)
    original=json.loads(data);mutants=[]
    mutate(lambda m:m['result']['change']['modes'].pop())
    mutate(lambda m:m['result']['candidates'][0].__setitem__('changeMode','SIGNED_RELATIVE_CHANGE'))
    mutate(lambda m:m['result']['baseline']['bindingIds'].append('new_rev'))
    mutate(lambda m:m['result']['candidates'][-1]['facets']['method'].__setitem__('statement','Verified growth'))
    mutate(lambda m:m['result']['proposals'][-1].__setitem__('proposalText',m['result']['proposals'][-1]['proposalText'].replace('"div"','"mul"')))
    for m in mutants:
        s=json.dumps(m,ensure_ascii=False,separators=(',',':'));require(verify(s.encode(),rawhash(s),pins[1],pins[2])['status']=='REFUSED')
    print('ACCEPTED actual direct and change browser mappings through independent offline grammar/compiler; REJECTED thirteen derived mutations and three pin controls.')
if __name__=='__main__':main()
