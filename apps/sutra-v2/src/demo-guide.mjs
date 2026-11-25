// Presentation-only routing for a guided tour through actual admitted events.
// It never creates a result, authority, observation or capsule itself.
const signatures=['read:read_a','read:read_control','withdraw_lineage:sample_one','restore_lineage:sample_one','read:read_a','add_copies:9','read:read_b','withdraw_lineage:sample_one','read:read_c'];
const sign=e=>e.type==='read'?e.type+':'+e.observationId:e.type==='add_copies'?e.type+':'+e.artifacts?.length:e.type+':'+e.lineage;
const step=(n,action,title,detail)=>({mode:'guided',step:n,total:12,action,title,detail});
const explore=()=>({mode:'explore',step:null,total:12,action:'start',title:'Reset guided challenge',detail:'You changed the guided route. Your current investigation is intact. Reset only if you want to replay the original demonstration.'});
export function guidedAction(events,result,capsule={}){
 if(!result)return step(1,'start','Start local investigation','Load the declared model and two synthetic measurements. No AI or external contact.');
 const got=events.map(sign);
 if(got.length>signatures.length||got.some((s,i)=>s!==signatures[i]))return explore();
 const state=result.claims?.target?.state;
 switch(got.length){
 case 2:
  if(state==='SUPPORTED')return step(2,'withdraw','Attack this conclusion','Withdraw the original report. Watch the conclusion lose support while the separate control survives.');
  break;
 case 3:
  if(state==='UNDERDETERMINED')return step(3,'restore','Restore the original report','Restore availability and reread the exact report before a different attack.');
  break;
 case 5:
  if(state==='SUPPORTED')return step(4,'copies','Add nine copied reports','Nine apparent confirmations share the original declared lineage. Compare source count with declared roots.');
  break;
 case 6:
  if(state==='SUPPORTED'&&result.groups?.sample_one?.length===10)return step(5,'disagree','Introduce a disagreeing measurement','A separately declared root contradicts the ten artifacts from the original lineage.');
  break;
 case 7:
  if(state==='CONFLICTED')return step(6,'withdraw','Test withdrawal of the disputed lineage','This is a hypothetical attack, not a judgment about which measurement is true. Check what remains.');
  break;
 case 8:
  if(state==='UNDERDETERMINED'&&result.nextObservation?.id==='read_c')return step(7,'plan-observe','Read the decisive observation','Execute the locally selected fixture measurement and recompute the conclusion.');
  break;
 case 9:
  if(state!=='REFUTED')break;
  if(capsule.historyDigest!==result.historyDigest||!capsule.hasBytes||!capsule.hasPin)return step(8,'capsule-export','Export Proof Capsule','Save the exact case, events, lineage, result and limitations as portable bytes.');
  if(!capsule.pinRequested)return step(9,'capsule-pin-export','Export the trusted digest separately','Keep the digest through a trusted channel. A file and a digest from the same untrusted sender do not authenticate that sender.');
  if(capsule.tampered)return step(12,'capsule-restore','Restore exact bytes','The tampered snapshot must remain refused. Restore the original and verify again.');
  if(!capsule.verified)return step(10,'capsule-verify','Verify the snapshot','Check the separately retained digest and replay the exact synthetic case locally.');
  if(capsule.challenge!=='restored')return step(11,'capsule-tamper','Attack the Proof Capsule','Change exactly one byte and check against the unchanged expected digest.');
  return {mode:'complete',step:12,total:12,action:null,title:'Challenge complete',detail:'Conclusion refuted; exact replay verified; one-byte tamper refused; original restored. External truth, signer identity and freshness are not established.'};
 default:break;
 }
 return explore();
}
