"""All relation phrases, equality and sign directions; Unicode and bounded ambiguity."""
import json,sys
from verify_conflict import require
from verify_reviewed_question import verify,calculate
from verify_living_version import ERRORS
def main():
    data=json.load(sys.stdin);require(len(data['cases'])==43 and len(data['refused'])==4)
    states=set()
    for c in data['cases']:
        r=verify(c['bundleText'].encode('utf-8'),c['snapshotPin'],c['contractPin'],c['planPin']);require(r['status']=='VERIFIED')
        states.update(x['conditionalState'] for x in r['result']['candidates'])
    require(states=={'CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED','BLOCKED_TYPE'})
    require(len(json.loads(data['cases'][-2]['bundleText'])['result']['candidates'])==8)
    for c in data['refused']:
        try:calculate(c['ct'],c['cp'],c['pt'],c['pp'])
        except ERRORS:continue
        raise AssertionError('Unsupported or over-budget question admitted')
    print('Independent question parity: 43 accepted (13 phrases x 3 directions, Unicode, eight alternatives and same binding); 4 refused.')
if __name__=='__main__':main()
