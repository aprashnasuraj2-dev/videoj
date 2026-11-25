#!/usr/bin/env python3
"""Independent frozen RECOVERY fixture replay, with Fraction and exact graph reconstruction."""
import json,sys,re
from pathlib import Path
from fractions import Fraction
from copy import deepcopy
from verify import canonical,recompute,keys
from verify_conflict import rawhash,require,bounded_load
VERSION='sutra-trial-partition/v2'
METRIC='age_adjusted_rate_ratio'
QUAL='Descriptive observed event proportions and source-reported adjusted interval positions only. No adjusted model reconstruction, significance test, causal effect, equivalence, individual applicability, current guideline or treatment advice. Declared partitions and source lineage are not independently validated. Normalized extract pins are not original document authentication.'
def compact(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def fixture(version):
    def row(i,te,tn,ce,cn,p,l,u):return dict(id=i,treatedEvents=te,treatedTotal=tn,controlEvents=ce,controlTotal=cn,adjusted=dict(metric=METRIC,point=p,lower=l,upper=u,confidencePct=95))
    return dict(version=1,studyId='recovery_nct04381936',sourceVersion=version,sourceLocator='NEJM 384:693-704 (2021), Fig 3; DOI 10.1056/NEJMoa2021436' if version=='final' else 'NEJM preliminary report (2020), Fig 3; PMC7383595',population='Hospitalized COVID-19 trial participants',endpoint='Death within 28 days after randomization',intervention='Randomized dexamethasone assignment',comparator='Randomized usual care assignment',partition='Respiratory support at randomization',aggregate=row('aggregate',482,2104,1110,4321,83,75,93),strata=[row('invasive_ventilation',95,324,283,683,64,51,81),row('oxygen_only',298,1279,682,2604,82,72,94),row('no_respiratory_support',89,501,145,1034,119,92 if version=='final' else 91,155)])
def fraction(v):return f'{v.numerator}/{v.denominator}'
def row_audit(pin,r):
    basis='trial '+pin+' '+r['id']
    def inp(i,v,meaning):return dict(id=i,kind='input',value=str(v),dimension=[0,0,0],basis=basis)
    def node(i,kind,op,a,b):return dict(id=i,kind=kind,op=op,args=[a,b])
    a=r['adjusted'];nodes=[inp('te',r['treatedEvents'],'treated events'),inp('tn',r['treatedTotal'],'treated participants'),inp('ce',r['controlEvents'],'control events'),inp('cn',r['controlTotal'],'control participants'),inp('adjusted_lower',str(a['lower'])+'/100','reported adjusted lower bound'),inp('adjusted_point',str(a['point'])+'/100','reported adjusted point estimate'),inp('adjusted_upper',str(a['upper'])+'/100','reported adjusted upper bound'),inp('one',1,'ratio null')]
    for i,op,x,y in [('treated_risk','div','te','tn'),('control_risk','div','ce','cn'),('risk_difference','sub','treated_risk','control_risk'),('crude_risk_ratio','div','treated_risk','control_risk')]:nodes.append(node(i,'derive',op,x,y))
    for i,op,x,y in [('strictly_lower','lt','treated_risk','control_risk'),('strictly_higher','gt','treated_risk','control_risk'),('upper_below_null','lt','adjusted_upper','one'),('lower_above_null','gt','adjusted_lower','one')]:nodes.append(node(i,'constraint',op,x,y))
    graph=compact(dict(schemaVersion=1,nodes=nodes));report=json.loads(recompute(graph))
    t=Fraction(r['treatedEvents'],r['treatedTotal']);u=Fraction(r['controlEvents'],r['controlTotal'])
    return dict(id=r['id'],counts={k:r[k] for k in ('treatedEvents','treatedTotal','controlEvents','controlTotal')},observedDirection='LOWER' if t<u else 'HIGHER' if t>u else 'EQUAL',treatedRisk=fraction(t),controlRisk=fraction(u),riskDifference=fraction(t-u),crudeRiskRatio=fraction(t/u) if u else None,crudeRiskRatioStatus='computed' if u else 'indeterminate',reportedAdjusted=dict(metric=METRIC,point=fraction(Fraction(a['point'],100)),lower=fraction(Fraction(a['lower'],100)),upper=fraction(Fraction(a['upper'],100)),confidencePct=95,intervalPosition='BELOW_NULL' if a['upper']<100 else 'ABOVE_NULL' if a['lower']>100 else 'INCLUDES_NULL'),graphText=graph,report=report)
def admit(source):
    require(isinstance(source,str) and 1<=len(source.encode('utf-8'))<=262144)
    c=bounded_load(source,65536,8)
    def ident(x):return isinstance(x,str) and re.fullmatch(r'[a-z][a-z0-9_]{0,63}',x) is not None
    def label(x):return isinstance(x,str) and 1<=len(x.encode('utf-16-le'))//2<=160 and not any(ord(ch)<32 or ord(ch)==127 for ch in x)
    def integer(x):return type(x) is int and 0<=x<=10**9
    require(keys(c,('version','studyId','sourceVersion','sourceLocator','population','endpoint','intervention','comparator','partition','aggregate','strata')) and type(c['version']) is int and c['version']==1 and ident(c['studyId']) and ident(c['sourceVersion']))
    require(all(label(c[k]) for k in ('sourceLocator','population','endpoint','intervention','comparator','partition')) and isinstance(c['strata'],list) and 2<=len(c['strata'])<=8)
    rows=[c['aggregate'],*c['strata']]
    for r in rows:
        require(keys(r,('id','treatedEvents','treatedTotal','controlEvents','controlTotal','adjusted')) and ident(r['id']) and all(integer(r[k]) for k in ('treatedEvents','treatedTotal','controlEvents','controlTotal')) and 0<r['treatedTotal'] and 0<r['controlTotal'] and r['treatedEvents']<=r['treatedTotal'] and r['controlEvents']<=r['controlTotal'])
        a=r['adjusted'];require(keys(a,('metric','point','lower','upper','confidencePct')) and a['metric']==METRIC and type(a['confidencePct']) is int and a['confidencePct']==95 and all(integer(a[k]) for k in ('point','lower','upper')) and 0<a['lower']<=a['point']<=a['upper'])
    require(c['aggregate']['id']=='aggregate' and len({r['id'] for r in rows})==len(rows))
    return c
def reconstruct_partition(source,pin,mode):
    require(mode in ('aggregate','partition') and rawhash(source)==pin)
    c=admit(source);rows=[row_audit(pin,c['aggregate'])];conservation=None
    if mode=='partition':
        conservation={k:dict(aggregate=c['aggregate'][k],sum=sum(r[k] for r in c['strata'])) for k in ('treatedEvents','treatedTotal','controlEvents','controlTotal')}
        require(all(x['aggregate']==x['sum'] for x in conservation.values()))
        rows.extend(row_audit(pin,r) for r in c['strata'])
    counters=[r['id'] for r in rows[1:] if r['observedDirection']!='LOWER']
    result=dict(version=VERSION,sourceDigest=pin,**{k:c[k] for k in ('studyId','sourceVersion','sourceLocator','population','endpoint','intervention','comparator','partition')},mode=mode,rows=rows,conservation=conservation,universalObservedLower='NOT_TESTED' if mode=='aggregate' else 'REFUTED_IN_DECLARED_PARTITION' if counters else 'SUPPORTED_IN_DECLARED_PARTITION',descriptiveCounterexamples=None if mode=='aggregate' else counters,reportedIntervalsNotBelowNull=None if mode=='aggregate' else [r['id'] for r in rows[1:] if r['reportedAdjusted']['intervalPosition']!='BELOW_NULL'],universalCausalBenefit='NOT_ESTABLISHED',qualification=QUAL)
    return dict(version=VERSION,kind='partition',sourceText=source,result=result)
def reconstruct_comparison(a,ap,b,bp):
    before=reconstruct_partition(a,ap,'partition')['result'];after=reconstruct_partition(b,bp,'partition')['result']
    require(all(before[k]==after[k] for k in ('studyId','population','endpoint','intervention','comparator','partition')) and before['sourceVersion']!=after['sourceVersion'] and ap!=bp)
    bm={r['id']:r for r in before['rows']};am={r['id']:r for r in after['rows']};require(bm.keys()==am.keys());changes=[]
    for i in sorted(bm):
        for group,fields in [('counts',('treatedEvents','treatedTotal','controlEvents','controlTotal')),('reportedAdjusted',('point','lower','upper','intervalPosition'))]:
            for field in fields:
                x,y=bm[i][group][field],am[i][group][field]
                if x!=y:changes.append(dict(id=i,field=group+'.'+field,before=x,after=y))
    return dict(version=VERSION,kind='comparison',beforeText=a,afterText=b,result=dict(studyId=before['studyId'],beforeDigest=ap,afterDigest=bp,beforeVersion=before['sourceVersion'],afterVersion=after['sourceVersion'],declaredStudyRoots=1,changes=changes,independentReplication='NOT_ESTABLISHED',beforeUniversal=before['universalObservedLower'],afterUniversal=after['universalObservedLower'],qualification=QUAL))
def expected_partition(mode):
    source=compact(fixture('final'));return reconstruct_partition(source,rawhash(source),mode)
def expected_comparison():
    a=compact(fixture('preliminary'));b=compact(fixture('final'));return reconstruct_comparison(a,rawhash(a),b,rawhash(b))
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
