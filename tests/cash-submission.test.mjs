import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localSchema } from '../src/services/local/schema.ts';
import { localRepository } from '../src/services/local/repository.ts';
import { submitCashDurably } from '../src/features/cash/submission.ts';
const adapter = db => ({ runAsync: async(sql,...p)=>db.prepare(sql).run(...p), getFirstAsync: async(sql,...p)=>db.prepare(sql).get(...p)??null, getAllAsync: async(sql,...p)=>db.prepare(sql).all(...p) });
const payload = {kind:'cash',version:1,action:'expense',reason:'Supplies',amountKobo:'100001',method:'cash',deviceId:'device',occurredAt:'2026-09-07T12:00:00Z'};
const receipt = {entryId:'one-outflow',action:'expense',amountKobo:'100001',method:'cash'};
test('cash entry: lost response after server commit survives reopening and confirms the same operation',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bomedia-retry-'));const path=join(dir,'db');let db=new DatabaseSync(path);db.exec(localSchema);
 const server=new Map();let writes=0;let requests=0;
 const send=async(id,body)=>{requests++;if(!server.has(id)){server.set(id,receipt);writes++;throw new Error('Response lost after commit');}return server.get(id);};
 try{
  await assert.rejects(submitCashDurably(localRepository(adapter(db),'staff-a'),'stable-id',payload,send));
  db.close();db=new DatabaseSync(path);const repo=localRepository(adapter(db),'staff-a');
  assert.equal((await repo.cashEntries()).length,1);
  const pending=await repo.pending();assert.equal(pending.length,1);
  const result=await submitCashDurably(repo,pending[0].operation_id.replace(/^cash:/,''),JSON.parse(pending[0].payload),send);
  assert.deepEqual(result,receipt);assert.equal(writes,1);assert.equal(requests,2);assert.equal((await repo.pending()).length,0);
  await submitCashDurably(repo,'stable-id',payload,send);assert.equal(requests,2);
  await assert.rejects(submitCashDurably(repo,'stable-id',{...payload,amountKobo:'200000'},send));assert.equal(requests,2);
  assert.equal(await localRepository(adapter(db),'staff-b').operation('cash:stable-id'),null);
  assert.equal((await repo.cashEntries())[0].status,'confirmed');
  assert.deepEqual(await localRepository(adapter(db),'staff-b').cashEntries(),[]);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
test('cash network is never called if local persistence fails',async()=>{
 let called=false;
 await assert.rejects(submitCashDurably({enqueue:async()=>{throw new Error('Disk full');}},'id',payload,async()=>{called=true;return receipt;}));
 assert.equal(called,false);
});


import { validateCashEntry } from '../src/features/cash/submission.ts';
import { decimalNaira, formatNaira } from '../src/features/sales/domain/money.ts';
test('cash validation requires explicit outflow method/reason and preserves exact kobo',()=>{
 assert.equal(validateCashEntry('opening','0','cash',''),'0');
 assert.equal(validateCashEntry('expense','100.01','transfer','Supplies'),'10001');
 assert.equal(validateCashEntry('closing_count','0','cash',''),'0');
 assert.equal(validateCashEntry('closing_count','3195.00','cash',''),'319500');
 assert.throws(()=>validateCashEntry('closing_count','100','pos',''));
 assert.throws(()=>validateCashEntry('closing_count','-1','cash',''));
 for (const args of [[null,'100','cash','why'],['expense','100',null,'why'],['expense','0','cash','why'],['withdrawal','100','cash',''],['opening','100','pos',''],['expense','1.001','cash','why']]) assert.throws(()=>validateCashEntry(...args));
});
test('negative drawer amounts retain their sign including amounts below one naira',()=>{
 assert.equal(decimalNaira('-1'),'-0.01');assert.equal(decimalNaira('-100'),'-1.00');
 assert.equal(formatNaira('-123456'),'₦-1,234.56');assert.equal(decimalNaira('0'),'0.00');
});

import { savedCashRejection } from '../src/features/cash/submission.ts';
test('server rejection survives lost response and local reopening without another write',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'cash-resolution-')); const path=join(dir,'db');let db=new DatabaseSync(path);db.exec(localSchema);
 const rejection={status:'rejected',operationId:'rejected-id',message:'Opening already recorded',resolvedAt:'2026-09-08T12:00:00Z'};
 let calls=0;
 try {
  const send=async()=>{calls++;if(calls===1)throw new Error('Response lost');return rejection;};
  await assert.rejects(submitCashDurably(localRepository(adapter(db),'a'),'rejected-id',payload,send));
  db.close();db=new DatabaseSync(path);const repo=localRepository(adapter(db),'a');
  assert.equal((await repo.pending()).length,1);
  assert.deepEqual(await submitCashDurably(repo,'rejected-id',payload,send),rejection);
  assert.deepEqual(savedCashRejection(await repo.operation('cash:rejected-id')),rejection);
  assert.equal((await repo.pending()).length,0);
  assert.deepEqual(await submitCashDurably(repo,'rejected-id',payload,send),rejection);assert.equal(calls,2);
  assert.equal(await localRepository(adapter(db),'b').operation('cash:rejected-id'),null);
  await assert.rejects(submitCashDurably(repo,'rejected-id',{...payload,amountKobo:'2'},send));
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
test('unmatched rejection and failed rejection persistence keep cash entry pending',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(localSchema);const repo=localRepository(adapter(db),'a');
 try{
  const rejection={status:'rejected',operationId:'id',message:'Not recorded',resolvedAt:'now'};
  await assert.rejects(submitCashDurably(repo,'id',payload,async()=>({...rejection,operationId:'wrong'})));
  await assert.rejects(submitCashDurably({...repo,rejectCash:async()=>{throw new Error('Disk full');}},'id',payload,async()=>rejection));
  assert.equal((await repo.operation('cash:id')).status,'pending');
  await assert.rejects(repo.rejectCash('payment:id',JSON.stringify(rejection)));
 }finally{db.close();}
});
