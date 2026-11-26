import test from 'node:test';
import assert from 'node:assert/strict';
import {abortableOperation,OperationAbortError} from '../abortable-operation.js';

test('runtime cancellation resolves ordinary provider work without inference package coupling',async()=>{
  assert.equal(await abortableOperation(Promise.resolve('ok')), 'ok');
  const controller=new AbortController();
  assert.equal(await abortableOperation(Promise.resolve(7),controller.signal),7);
});

test('runtime cancellation rejects pending work and ignores a late provider settlement',async()=>{
  const controller=new AbortController();
  let resolveProvider;
  const provider=new Promise(resolve=>{resolveProvider=resolve;});
  const pending=abortableOperation(provider,controller.signal);
  controller.abort();
  await assert.rejects(pending,error=>error instanceof OperationAbortError&&error.code==='ABORTED');
  resolveProvider('late');
  await new Promise(resolve=>setTimeout(resolve,0));
});

test('already-aborted signals fail closed without leaking a later provider rejection',async()=>{
  const controller=new AbortController();controller.abort();
  let rejectProvider;
  const provider=new Promise((_,reject)=>{rejectProvider=reject;});
  await assert.rejects(abortableOperation(provider,controller.signal),error=>error instanceof OperationAbortError&&error.code==='ABORTED');
  rejectProvider(new Error('late provider detail'));
  await new Promise(resolve=>setTimeout(resolve,0));
});
