// Browser module-owned observation channel. It does not grant execution or accept DOM events.
import {createExecutionJournal,createExecutionEmitter} from '../../../packages/sutra-runtime/execution-events.js';
import {createCouncilEmitter} from './council-activity.js';
const journal=createExecutionJournal();
export const executionFeed=Object.freeze({subscribe:journal.subscribe,snapshot:journal.snapshot,events:journal.events,runs:journal.runs});
export const publishTaskExecution=e=>journal.accept(e);
export function createStudioExecution(runNumber,version,isCancelled,agentIds){
 const runId='studio_'+runNumber;
 const emitter=createExecutionEmitter({runId,version,origin:'local-scripted',publish:journal.accept});
 return createCouncilEmitter(runNumber,e=>{
  if(e.phase==='started')emitter.emit('run.open',{agents:e.agentIds});
  else if(['completed','refused','cancelled'].includes(e.phase))emitter.emit('run.close',{status:e.phase});
  else emitter.emit('council.phase',{agentId:e.agent,round:e.round,phase:e.phase});
 },isCancelled,agentIds);
}
