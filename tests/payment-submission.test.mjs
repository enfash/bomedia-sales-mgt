import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localSchema } from '../src/services/local/schema.ts';
import { localRepository } from '../src/services/local/repository.ts';
import { submitPaymentDurably, submitPaymentAndRefresh } from '../src/features/payments/submission.ts';
const adapter = db => ({ runAsync: async(sql,...p)=>db.prepare(sql).run(...p), getFirstAsync: async(sql,...p)=>db.prepare(sql).get(...p)??null, getAllAsync: async(sql,...p)=>db.prepare(sql).all(...p) });
const payload = {kind:'payment',version:1,scope:'customer',customerId:'customer',saleId:null,amountKobo:'100001',method:'cash',deviceId:'device',occurredAt:'2026-09-07T12:00:00Z'};
const receipt = {paymentId:'one-payment',amountKobo:'100001',allocatedKobo:'80000',unappliedKobo:'20001'};
test('payment receipt with unapplied money: lost response after server commit survives reopening and confirms the same operation',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bomedia-retry-'));const path=join(dir,'db');let db=new DatabaseSync(path);db.exec(localSchema);
 const server=new Map();let writes=0;let requests=0;
 const send=async(id,body)=>{requests++;if(!server.has(id)){server.set(id,receipt);writes++;throw new Error('Response lost after commit');}return server.get(id);};
 try{
  await assert.rejects(submitPaymentDurably(localRepository(adapter(db),'staff-a'),'stable-id',payload,send));
  db.close();db=new DatabaseSync(path);const repo=localRepository(adapter(db),'staff-a');
  assert.equal((await repo.payments()).length,1);
  const pending=await repo.pending();assert.equal(pending.length,1);
  const result=await submitPaymentDurably(repo,pending[0].operation_id.replace(/^payment:/,''),JSON.parse(pending[0].payload),send);
  assert.deepEqual(result,receipt);assert.equal(writes,1);assert.equal(requests,2);assert.equal((await repo.pending()).length,0);
  await submitPaymentDurably(repo,'stable-id',payload,send);assert.equal(requests,2);
  await assert.rejects(submitPaymentDurably(repo,'stable-id',{...payload,amountKobo:'200000'},send));assert.equal(requests,2);
  assert.equal(await localRepository(adapter(db),'staff-b').operation('payment:stable-id'),null);
  assert.equal((await repo.payments())[0].status,'confirmed');
  assert.deepEqual(await localRepository(adapter(db),'staff-b').payments(),[]);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
test('payment network is never called if local persistence fails',async()=>{
 let called=false;
 await assert.rejects(submitPaymentDurably({enqueue:async()=>{throw new Error('Disk full');}},'id',payload,async()=>{called=true;return receipt;}));
 assert.equal(called,false);
});

test('history read failure after acknowledgement keeps payment confirmed', async()=>{
 const db=new DatabaseSync(':memory:');db.exec(localSchema);
 try {
  const repo=localRepository(adapter(db),'staff-a');
  const unavailableHistory={...repo,payments:async()=>{throw new Error('History unavailable');}};
  let writes=0;
  const send=async()=>{writes++;return receipt;};
  const result=await submitPaymentAndRefresh(unavailableHistory,'confirmed-id',payload,send);
  assert.deepEqual(result,{receipt,operations:null});
  assert.equal((await repo.operation('payment:confirmed-id')).status,'confirmed');
  await submitPaymentAndRefresh(unavailableHistory,'confirmed-id',payload,send);
  assert.equal(writes,1);
 } finally {db.close();}
});
