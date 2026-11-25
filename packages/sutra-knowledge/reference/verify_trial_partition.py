#!/usr/bin/env python3
"""Independent frozen RECOVERY fixture replay, with Fraction and exact graph reconstruction."""
import json,sys
from pathlib import Path
from fractions import Fraction
from copy import deepcopy
from verify import canonical,recompute
from verify_conflict import rawhash,require,bounded_load
VERSION='sutra-trial-partition/v1'
METRIC='age_adjusted_rate_ratio'
QUAL='Descriptive observed event proportions and source-reported adjusted interval positions only. No adjusted model reconstruction, significance test, causal effect, equivalence, individual applicability, current guideline or treatment advice. Declared partitions and source lineage are not independently validated. Normalized extract pins are not original document authentication.'
def compact(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def fixture(version):
    def row(i,te,tn,ce,cn,p,l,u):return dict(id=i,treatedEvents=te,treatedTotal=tn,controlEvents=ce,controlTotal=cn,adjusted=dict(metric=METRIC,point=p,lower=l,upper=u,confidencePct=95))
    return dict(version=1,studyId='recovery_nct04381936',sourceVersion=version,sourceLocator='NEJM 384:693-704 (2021), Fig 3; DOI 10.1056/NEJMoa2021436' if version=='final' else 'NEJM preliminary report (2020), Fig 3; PMC7383595',population='Hospitalized COVID-19 trial participants',endpoint='Death within 28 days after randomization',intervention='Randomized dexamethasone assignment',comparator='Randomized usual care assignment',partition='Respiratory support at randomization',aggregate=row('aggregate',482,2104,1110,4321,83,75,93),strata=[row('invasive_ventilation',95,324,283,683,64,51,81),row('oxygen_only',298,1279,682,2604,82,72,94),row('no_respiratory_support',89,501,145,1034,119,92 if version=='final' else 91,155)])
def fraction(v):return f'{v.numerator}/{v.denominator}'
def row_audit(c,r):
    basis=c['studyId']+' '+c['sourceVersion']+' '+r['id']
    def inp(i,v,meaning):return dict(id=i,kind='input',value=str(v),dimension=[0,0,0],basis=basis+' '+meaning)
    def node(i,kind,op,a,b):return dict(id=i,kind=kind,op=op,args=[a,b])
    a=r['adjusted'];nodes=[inp('te',r['treatedEvents'],'treated events'),inp('tn',r['treatedTotal'],'treated participants'),inp('ce',r['controlEvents'],'control events'),inp('cn',r['controlTotal'],'control participants'),inp('adjusted_lower',str(a['lower'])+'/100','reported adjusted lower bound'),inp('adjusted_point',str(a['point'])+'/100','reported adjusted point estimate'),inp('adjusted_upper',str(a['upper'])+'/100','reported adjusted upper bound'),inp('one',1,'ratio null')]
    for i,op,x,y in [('treated_risk','div','te','tn'),('control_risk','div','ce','cn'),('risk_difference','sub','treated_risk','control_risk'),('crude_risk_ratio','div','treated_risk','control_risk')]:nodes.append(node(i,'derive',op,x,y))
    for i,op,x,y in [('strictly_lower','lt','treated_risk','control_risk'),('strictly_higher','gt','treated_risk','control_risk'),('upper_below_null','lt','adjusted_upper','one'),('lower_above_null','gt','adjusted_lower','one')]:nodes.append(node(i,'constraint',op,x,y))
    graph=compact(dict(schemaVersion=1,nodes=nodes));report=json.loads(recompute(graph))
    t=Fraction(r['treatedEvents'],r['treatedTotal']);u=Fraction(r['controlEvents'],r['controlTotal'])
    return dict(id=r['id'],counts={k:r[k] for k in ('treatedEvents','treatedTotal','controlEvents','controlTotal')},observedDirection='LOWER' if t<u else 'HIGHER' if t>u else 'EQUAL',treatedRisk=fraction(t),controlRisk=fraction(u),riskDifference=fraction(t-u),crudeRiskRatio=fraction(t/u) if u else None,crudeRiskRatioStatus='computed' if u else 'indeterminate',reportedAdjusted=dict(metric=METRIC,point=fraction(Fraction(a['point'],100)),lower=fraction(Fraction(a['lower'],100)),upper=fraction(Fraction(a['upper'],100)),confidencePct=95,intervalPosition='BELOW_NULL' if a['upper']<100 else 'ABOVE_NULL' if a['lower']>100 else 'INCLUDES_NULL'),graphText=graph,report=report)
def expected_partition(mode):
    c=fixture('final');source=compact(c);rows=[row_audit(c,c['aggregate'])]
    conservation=None
    if mode=='partition':
        rows.extend(row_audit(c,r) for r in c['strata'])
        conservation={k:dict(aggregate=c['aggregate'][k],sum=sum(r[k] for r in c['strata'])) for k in ('treatedEvents','treatedTotal','controlEvents','controlTotal')}
        require(all(x['aggregate']==x['sum'] for x in conservation.values()))
    counters=[r['id'] for r in rows[1:] if r['observedDirection']!='LOWER']
    result=dict(version=VERSION,sourceDigest=rawhash(source),**{k:c[k] for k in ('studyId','sourceVersion','sourceLocator','population','endpoint','intervention','comparator','partition')},mode=mode,rows=rows,conservation=conservation,universalObservedLower='NOT_TESTED' if mode=='aggregate' else 'REFUTED_IN_DECLARED_PARTITION' if counters else 'SUPPORTED_IN_DECLARED_PARTITION',descriptiveCounterexamples=counters,reportedIntervalsNotBelowNull=[r['id'] for r in rows[1:] if r['reportedAdjusted']['intervalPosition']!='BELOW_NULL'],universalCausalBenefit='NOT_ESTABLISHED',qualification=QUAL)
    return dict(version=VERSION,kind='partition',sourceText=source,result=result)
def expected_comparison():
    a=compact(fixture('preliminary'));b=compact(fixture('final'))
    return dict(version=VERSION,kind='comparison',beforeText=a,afterText=b,result=dict(studyId='recovery_nct04381936',beforeDigest=rawhash(a),afterDigest=rawhash(b),beforeVersion='preliminary',afterVersion='final',declaredStudyRoots=1,changes=[dict(id='no_respiratory_support',field='reportedAdjusted.lower',before='91/100',after='23/25')],independentReplication='NOT_ESTABLISHED',beforeUniversal='REFUTED_IN_DECLARED_PARTITION',afterUniversal='REFUTED_IN_DECLARED_PARTITION',qualification=QUAL))
def main():
    require(len(sys.argv)==4)
    for name,expected in zip(sys.argv[1:],(expected_partition('aggregate'),expected_partition('partition'),expected_comparison())):
        with Path(name).open(encoding='utf-8') as f:got=bounded_load(f.read(1048577),1048576,40)
        def verify(x):return canonical(x)==canonical(expected)
        require(verify(got));mutants=[]
        for k in ['qualification',*(['universalObservedLower','universalCausalBenefit','sourceDigest','reportedIntervalsNotBelowNull','conservation'] if got['kind']=='partition' else ['declaredStudyRoots','changes','independentReplication','beforeDigest'])]:
            bad=deepcopy(got);bad['result'][k]='FORGED';mutants.append(bad)
        if got['kind']=='partition':
            for k in ['observedDirection','riskDifference','crudeRiskRatio','reportedAdjusted','report','graphText']:
                bad=deepcopy(got);bad['result']['rows'][0][k]='FORGED';mutants.append(bad)
            bad=deepcopy(got);bad['sourceText']+=' ';mutants.append(bad)
        else:
            bad=deepcopy(got);bad['beforeText']+=' ';mutants.append(bad)
            bad=deepcopy(got);bad['afterText']+=' ';mutants.append(bad)
        for bad in mutants:require(not verify(bad))
        print('ACCEPTED',Path(name).name,'REJECTED',len(mutants),'mutants')
if __name__=='__main__':main()
