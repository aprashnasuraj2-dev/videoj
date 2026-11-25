#!/usr/bin/env python3
"""Independent numeric fixture construction and replay of the public-filing example."""
import json
import sys
from pathlib import Path
from copy import deepcopy
from verify_conflict import bounded_load, require, rawhash
from verify_pinned_investigation import verify
from verify_coverage_grid import compact
def fixture():
    dim=[0,0,0];scope='microsoft_cashflow_fy25_fy26_usd_million';worlds=[];sources=[];offers=[]
    def inp(i,v,basis):return dict(id=i,kind='input',value=str(v),dimension=dim,basis=basis)
    for ocf in (136162,182935):
        for ppe in (64551,115948):
            nodes=[inp('ocf25',136162,'FY2025 operating cash flow, USD million'),inp('ppe25',64551,'FY2025 cash PPE additions magnitude, USD million'),inp('ocf26',ocf,'FY2026 operating cash flow candidate, USD million'),inp('ppe26',ppe,'FY2026 cash PPE additions magnitude candidate, USD million'),dict(id='proxy25',kind='derive',op='sub',args=['ocf25','ppe25']),dict(id='proxy26',kind='derive',op='sub',args=['ocf26','ppe26']),dict(id='target',kind='constraint',op='ge',args=['proxy26','proxy25'])]
            worlds.append(dict(id=f'ocf_{ocf}_ppe_{ppe}',graphText=compact(dict(schemaVersion=1,nodes=nodes)),constraintId='target'))
    for i,version,fields in [('fy25_filing','sec_000095017025100235',dict(ocf25=136162,ppe25=64551)),('fy26_filing','sec_000119312526323660',dict(ocf25=136162,ppe25=64551,ocf26=182935,ppe26=115948))]:
        t=compact(dict(version=1,sourceId=i,sourceVersion=version,scope=scope,values={n:dict(value=str(v)+'/1',dimension=dim) for n,v in fields.items()}))
        sources.append(dict(id=i,version=version,digest=rawhash(t),lineage='microsoft_issuer'))
        for n in fields:offers.append(dict(id='read_'+i+'_'+n,nodeId=n,sourceId=i,cost=1,dimension=dim))
    return compact(dict(version=1,decisionId='cashflow_proxy_nondecreasing',scope=scope,costUnit='illustrative_field_read',worlds=worlds,sources=sources,offers=offers))
def main():
    args=sys.argv[1:];require(len(args)==4);pin=rawhash(fixture())
    require(136162-64551==71611 and 182935-115948==66987 and 66987-71611==-4624)
    for path,state,count,roots,reads in zip(args,('UNDERDETERMINED','UNDERDETERMINED','REFUTED','UNDERDETERMINED'),(4,2,1,4),(0,1,1,0),(0,3,6,0)):
        with Path(path).open(encoding='utf-8') as f:b=bounded_load(f.read(1048577),1048576,40)
        require(verify(b,pin));r=b['result'];require(r['state']==state and len(r['report']['survivingWorlds'])==count and len(r['rootSummary'])==roots and len(r['report']['activeEvidence'])==reads)
        require(r['report']['truthStatus']=='unverified')
        if state=='REFUTED':require(r['report']['survivingWorlds']==['ocf_182935_ppe_115948'] and len(r['rootSummary'][0]['sourceIds'])==2)
        mutants=[]
        for key,value in (('state','FORGED'),('rootSummary',[{'root':'invented'}]),('eventDigest','sha256:'+'0'*64)):
            bad=deepcopy(b);bad['result'][key]=value;mutants.append(bad)
        for key,value in (('survivingWorlds',['invented']),('truthStatus','verified_empirical_truth'),('activeEvidence',[{}])):
            bad=deepcopy(b);bad['result']['report'][key]=value;mutants.append(bad)
        for key in ('caseText','eventText'):
            bad=deepcopy(b);bad[key]+=' ';mutants.append(bad)
        for bad in mutants:require(not verify(bad,pin))
        print('ACCEPTED',Path(path).name,state,'REJECTED',len(mutants),'mutants')
if __name__=='__main__':main()
