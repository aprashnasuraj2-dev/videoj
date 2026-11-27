export type ExecutionOrigin = 'host-task' | 'deterministic' | 'authorized-provider' | 'local-scripted';
export type TaskStatus = 'queued' | 'executing' | 'validating' | 'completed' | 'failed' | 'blocked' | 'cancelled';
export type RunStatus = 'running' | 'completed' | 'partial' | 'cancelled' | 'timeout' | 'stale' | 'refused';
export interface TaskDescriptor { readonly id:string; readonly kind:string; readonly agentId:string; readonly dependsOn:readonly string[] }
type Base = { readonly schema:'sutra-execution-event/v1'; readonly runId:string; readonly version:string; readonly origin:ExecutionOrigin; readonly sequence:number };
export type ExecutionEvent = Base & (
 { readonly type:'run.open'; readonly payload:{readonly tasks:readonly TaskDescriptor[]} | {readonly agents:readonly string[]} } |
 { readonly type:'task.state'; readonly payload:{readonly taskId:string;readonly agentId:string;readonly kind:string;readonly status:Exclude<TaskStatus,'queued'>} } |
 { readonly type:'council.phase';readonly payload:{readonly agentId:string;readonly round:number;readonly phase:'request'|'response'|'transport-refused'|'proposal'|'abstained'|'rejected'} } |
 { readonly type:'run.close';readonly payload:{readonly status:Exclude<RunStatus,'running'>} }
);
export interface ExecutionSnapshot { readonly schema:'sutra-execution-event/v1';readonly runId:string;readonly version:string;readonly origin:ExecutionOrigin;readonly sequence:number;readonly status:RunStatus;readonly tasks:readonly (TaskDescriptor & {readonly status:TaskStatus})[];readonly agents:readonly ({readonly id:string;readonly status:string;readonly taskIds:readonly string[];readonly activeTaskIds:readonly string[];readonly completed:number}|{readonly id:string;readonly status:string;readonly round:number;readonly requests:number;readonly responses:number;readonly proposals:number})[] }
export function createExecutionEmitter(config:{runId:string;version:string;origin:ExecutionOrigin;publish:(e:ExecutionEvent)=>void}):{emit<T extends ExecutionEvent['type']>(type:T,payload:Extract<ExecutionEvent,{type:T}>['payload']):boolean};
export function createExecutionJournal(config?:{maxRuns?:number;maxEvents?:number}):{accept(e:unknown):boolean;subscribe(fn:(e:ExecutionEvent,s:ExecutionSnapshot)=>void):()=>void;snapshot(runId:string):ExecutionSnapshot|null;events(runId:string):readonly ExecutionEvent[];runs():readonly ExecutionSnapshot[]};
