// Reconstruct a read-only prefix through the existing validated journal.
// Never calls the runtime scheduler, transport, provider, peer, storage or model.
import {createExecutionJournal} from '../../../../packages/sutra-runtime/execution-events.js';
import {emptyGraph,projectTaskRun} from './projection.js';
export function replayJournalPrefix(events,sequence){
 if(!Array.isArray(events)||!events.length||events.length>2048||!Number.isSafeInteger(sequence)||sequence<0||sequence>events.length)throw Error('REPLAY_RANGE');
 const first=events[0],runId=first?.runId;
 if(first?.type!=='run.open'||first.sequence!==1||typeof runId!=='string')throw Error('REPLAY_MANIFEST');
 if(sequence===0)return Object.freeze({...emptyGraph(),id:'replay/'+runId,runId,version:first.version,label:'Recorded replay · before admission',qualification:'Historical event prefix only. No execution, contact or consent is restored.'});
 const journal=createExecutionJournal({maxRuns:1,maxEvents:2048});
 for(let i=0;i<sequence;i++){
  const e=events[i];
  if(e?.runId!==runId||e.version!==first.version||e.origin!==first.origin||e.sequence!==i+1||!journal.accept(e))throw Error('REPLAY_EVENT_REFUSED');
 }
 const graph=projectTaskRun(journal.snapshot(runId),journal.events(runId));
 if(!graph)throw Error('REPLAY_PROJECTION');
 return Object.freeze({...graph,label:'Recorded replay · '+graph.label,qualification:'Historical event prefix '+sequence+' / '+events.length+'. No execution, contact or consent is restored. '+graph.qualification});
}
