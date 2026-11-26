"""Independent review replay over independent finite-question compiler.

Same-project independent Python implementation, not independent human judgment.
No import or subprocess invocation of the JavaScript producer.
"""
import json
import sys
from hashlib import sha256
from verify import canonical, keys
from verify_conflict import require, rawhash
from verify_reviewed_compiler import pin
from verify_living_version import ERRORS, check_wire
from verify_reviewed_question import calculate

VERSION = 'sutra-question-mapping-review/v1'
QUAL = 'All supplied alternatives and conditional results retained; missing judgments unresolved. Human declaration neither certifies meaning nor source truth; no automatic adoption.'
JUDGMENTS = ('plausible', 'excluded', 'unresolved')

def reconstruct(ct, cp, pt, pp, rt, rp):
    require(pin(rp) and rawhash(rt) == rp and len(rt.encode('utf-16-le')) // 2 <= 4096)
    review = check_wire(rt, 4)
    require(keys(review, ('version', 'contractPin', 'planPin', 'choices')) and
            type(review['version']) is int and review['version'] == 1 and
            review['contractPin'] == cp and review['planPin'] == pp and
            isinstance(review['choices'], list) and len(review['choices']) <= 8)
    compiled = calculate(ct, cp, pt, pp)
    candidates = {c['id']: c for c in compiled['candidates']}
    choices = {}
    for row in review['choices']:
        require(keys(row, ('id', 'judgment')) and isinstance(row['id'], str) and
                row['id'] in candidates and row['id'] not in choices and row['judgment'] in JUDGMENTS)
        choices[row['id']] = row['judgment']
    rows = []
    for c in compiled['candidates']:
        row = {k: c[k] for k in ('id', 'meaning', 'expression', 'conditionalState')}
        row['judgment'] = choices.get(c['id'], 'unresolved')
        rows.append(row)
    plausible = sum(r['judgment'] == 'plausible' for r in rows)
    unresolved = any(r['judgment'] == 'unresolved' for r in rows)
    status = ('REVIEW_INCOMPLETE' if unresolved else 'ONE_DECLARED_PLAUSIBLE' if plausible == 1
              else 'MULTIPLE_DECLARED_PLAUSIBLE' if plausible else 'NO_DECLARED_PLAUSIBLE')
    return dict(version=1, contractPin=cp, planPin=pp, reviewPin=rp, rows=rows, status=status,
                semanticInterpretation='UNVERIFIED', decisionAuthority='NONE', qualification=QUAL)

def verify(data, expected, cp, pp, rp):
    if not all(pin(p) for p in (expected, cp, pp, rp)):
        return dict(status='REFUSED', reason='PIN_REQUIRED')
    if not isinstance(data, bytes) or not 1 <= len(data) <= 262144:
        return dict(status='REFUSED', reason='SIZE_OR_TYPE')
    if 'sha256:' + sha256(data).hexdigest() != expected:
        return dict(status='REFUSED', reason='PIN_MISMATCH')
    try:
        x = check_wire(data.decode('utf-8', errors='strict'), 12)
        require(keys(x, ('version', 'contractText', 'contractPin', 'planText', 'planPin', 'reviewText', 'reviewPin', 'result')) and
                x['version'] == VERSION and x['contractPin'] == cp and x['planPin'] == pp and x['reviewPin'] == rp)
        result = reconstruct(x['contractText'], cp, x['planText'], pp, x['reviewText'], rp)
        require(canonical(result) == canonical(x['result']))
        return dict(status='VERIFIED', result=result,
                    qualification='Independent finite mapping and judgment replay only. No source truth or meaning authority.')
    except ERRORS:
        return dict(status='REFUSED', reason='REPLAY_REFUSED')

def main():
    cases = json.load(sys.stdin)
    require(isinstance(cases, list) and 1 <= len(cases) <= 32)
    results = []
    for c in cases:
        r = verify(c['snapshotText'].encode('utf-8'), c['snapshotPin'],
                   c['expectedContractPin'], c['expectedPlanPin'], c['expectedReviewPin'])
        require(type(c['expected']) is bool and (r['status'] == 'VERIFIED') == c['expected'])
        results.append(dict(id=c['id'], accepted=r['status'] == 'VERIFIED'))
    print(json.dumps(dict(implementation='independent-python-mapping-review', cases=results)))

if __name__ == '__main__':
    main()
