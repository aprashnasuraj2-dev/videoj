#!/usr/bin/env python3
"""Build a reproducible ledger of six distinct frozen development evaluations.
No pooled accuracy, external truth, release claim, or expert-annotation claim.
Run only after the individual executors/oracles have completed successfully.
"""
import hashlib,json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
ARTIFACT=Path(sys.argv[1]) if len(sys.argv)>1 else Path.cwd()
SPECS={
 'semantic':('semantic-development-v1.json','609ad48d3d18c2ff620abeae7a3b52747aae78c1',40),
 'assumption':('assumption-development-v1.json','eb6ff6197919faf0d7ef61bc6600e8e5043b47aa',40),
 'revision':('revision-development-v1.json','d199bddb0bcc9023eb0c3cf77697e3cd3c278786',40),
 'ancestry':('ancestry-development-cases.json','0af4985a8c32eaef7a9073f5033b4d875f1bd774',30),
 'acquisition':('acquisition-development-cases.json','a5bd96c1667c9b980bbdfa34e1fb814baf692be0',30),
 'replay':('replay-development-cases.json','e27ca033a7d7bc7d248ffb1e2b509465adb87e5d',20)}
def require(ok,msg):
    if not ok:raise ValueError(msg)
def gitblob(raw):return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
def digest(raw):return 'sha256:'+hashlib.sha256(raw).hexdigest()
def load(path):
    raw=path.read_bytes()
    return json.loads(raw),digest(raw)
def ids(rows):return [r['id'] for r in rows]
def check_ids(rows,cases):
    expected=ids(cases);actual=ids(rows)
    require(len(set(expected))==len(expected) and len(set(actual))==len(actual) and set(expected)==set(actual),'case identity mismatch')
def main():
    groups=[]
    for name,(manifest,blob,count) in SPECS.items():
        raw=(ROOT/manifest).read_bytes();require(gitblob(raw)==blob,name+' manifest mismatch')
        cases=json.loads(raw)['cases'];require(len(cases)==count,name+' count mismatch')
        base={'group':name,'specifiedCases':count,'manifest':manifest,'gitBlob':blob,'manifestSha256':digest(raw),'artifacts':{}}
        def report(filename):
            r,d=load(ARTIFACT/filename);base['artifacts'][filename]=d;return r
        if name=='assumption':
            r=report('sutra-assumption-development.json')
            check_ids(r['rows'],cases);require(r['cases']==r['exactCasesCorrect']==count and all(x['exactMatch'] for x in r['rows']),name+' mismatch')
            require(r['frozenDigest']==digest(raw),'assumption report manifest mismatch')
            base.update(matchedCases=count,verificationScope='Frozen developer expectations and matched review selectors; not a separate full-corpus external oracle',metrics=r['metrics'])
        elif name=='revision':
            r=report('sutra-revision-development.json');o=report('sutra-revision-development-independent.json')
            check_ids(r['rows'],cases);require(r['cases']==r['exactCasesCorrect']==count and all(x['exactMatch'] for x in r['rows']),name+' mismatch')
            require(r['frozenGitBlob']==blob and r['frozenSha256']==hashlib.sha256(raw).hexdigest(),'revision report manifest mismatch')
            require(o['profile']=='revision-development-independent/v1' and r['accepted']==o['accepted']==32 and r['refused']==8 and o['repinnedTamperRefused']==64,'revision replay mismatch')
            base.update(matchedCases=count,verificationScope='32 accepted artifacts independently reconstructed; eight refusals in JS; 64 separate repinned mutations',metrics={k:r[k] for k in ('accepted','refused','staleCarryForwardWrong','staleUnsupportedDecisive','fullReselection','sourceLocalReselection','sutraReselection')},independentRepinnedTamperRefused=o['repinnedTamperRefused'])
        else:
            r=report('sutra-v2-'+name+'-development.json');o=report('sutra-v2-'+name+'-independent.json')
            check_ids(r['results'] if name in ('ancestry','acquisition') else r['rows'],cases)
            require(r['frozenBlob']==blob and o['matched']==count,name+' oracle mismatch')
            if name!='ancestry':require(o['frozenBlob']==blob,name+' oracle manifest mismatch')
            if name in ('acquisition','replay'):check_ids(o['rows'],cases)
            if name=='semantic':
                base.update(verificationScope='Independent Fraction arithmetic and vote oracle; intended formula labels remain developer-authored',metrics={k:o[k] for k in ('distinctSignatureCases','newWitnessCases','candidateInstances','matchedEvaluations','metrics')})
            elif name=='ancestry':
                base.update(verificationScope='Independent graph/component/cut oracle on declared ancestry; no empirical independence',metrics=o['counts'])
            elif name=='acquisition':
                base.update(verificationScope='Independent exhaustive finite minimax oracle under declared loss and exposure',metrics={k:o[k] for k in ('totals','strictImprovementCases')})
            else:
                require(o['adversaryCount']==16 and o['intentionalContractDifferences']==2 and o['falseAccepts']['strict']==o['falseAccepts']['structural']==0,'replay adversary mismatch')
                base.update(verificationScope='Independent structural replay with separately retained child pin versus strict producer-byte reopening',metrics={k:o[k] for k in ('adversaryCount','falseAccepts','intentionalContractDifferences')})
            base['matchedCases']=count
        groups.append(base)
    require(sum(g['specifiedCases'] for g in groups)==sum(g['matchedCases'] for g in groups)==200,'coverage mismatch')
    revision=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
    event_path=os.environ.get('GITHUB_EVENT_PATH');event=json.loads(Path(event_path).read_bytes()) if event_path and Path(event_path).is_file() else {}
    pr=event.get('pull_request') or {}
    print(json.dumps({'profile':'sutra-frozen-development-ledger/v1','checkoutRevision':revision,'pullRequestHead':(pr.get('head') or {}).get('sha'),'workflowRunId':os.environ.get('GITHUB_RUN_ID'),'groups':groups,'specifiedCases':200,'matchedDevelopmentCases':200,'independentExpertAnnotatedCases':0,'heldOutCases':0,'decisionAuthority':'NONE','qualification':'Coverage of six heterogeneous synthetic developer-specified groups, not pooled accuracy or 200 independent scenarios. Revision has two wrappers over 20 patterns. Results do not establish semantic intent, real evidence authenticity, physical feasibility, measured human effort, competitive superiority, or release readiness.'},indent=2))
if __name__=='__main__':main()
