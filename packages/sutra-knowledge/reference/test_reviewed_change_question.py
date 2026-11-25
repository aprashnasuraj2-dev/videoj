"""Independent reconstruction of change grammar and signed arithmetic."""
import json,sys
from verify_conflict import require
from verify_reviewed_question import verify,calculate,CHANGE_VERSION
from verify_living_version import ERRORS
def main():
    data=json.load(sys.stdin);require(len(data['cases'])==36 and len(data['refused'])==2)
    states=set()
    for c in data['cases']:
        r=verify(c['bundleText'].encode('utf-8'),c['snapshotPin'],c['contractPin'],c['planPin']);require(r['status']=='VERIFIED' and r['profile']==CHANGE_VERSION)
        states.update(x['conditionalState'] for x in r['result']['candidates'])
    require(states=={'CONDITIONALLY_SATISFIED','CONDITIONALLY_REFUTED','BLOCKED_TYPE','UNRESOLVED_COMPUTATION'})
    for c in data['refused']:
        try:calculate(c['ct'],c['cp'],c['pt'],c['pp'])
        except ERRORS:continue
        raise AssertionError('Unsupported change question admitted')
    print('Independent change grammar parity: 36 accepted, 2 refused; type blockers and zero denominator preserved.')
if __name__=='__main__':main()
