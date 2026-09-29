import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localSchema } from '../src/services/local/schema.ts';
import { localRepository } from '../src/services/local/repository.ts';
import { submitDurably } from '../src/features/sales/submission.ts';
const adapter = db => ({ runAsync: async(sql,...p)=>db.prepare(sql).run(...p), getFirstAsync: async(sql,...p)=>db.prepare(sql).get(...p)??null, getAllAsync: async(sql,...p)=>db.prepare(sql).all(...p) });
const payload = {version:1,items:[{width:'13',height:'17'}],receivedKobo:'100000'};
const receipt = {saleId:'one-sale',invoiceNumber:'1'};
test('lost response after server commit survives reopening and confirms the same operation',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bomedia-retry-'));const path=join(dir,'db');let db=new DatabaseSync(path);db.exec(localSchema);
 const server=new Map();let writes=0;let requests=0;
 const send=async(id,body)=>{requests++;if(!server.has(id)){server.set(id,receipt);writes++;throw new Error('Response lost after commit');}return server.get(id);};
 try{
  await assert.rejects(submitDurably(localRepository(adapter(db),'staff-a'),'stable-id',payload,send));
  db.close();db=new DatabaseSync(path);const repo=localRepository(adapter(db),'staff-a');
  const pending=await repo.pending();assert.equal(pending.length,1);
  const result=await submitDurably(repo,pending[0].operation_id,JSON.parse(pending[0].payload),send);
  assert.deepEqual(result,receipt);assert.equal(writes,1);assert.equal(requests,2);assert.equal((await repo.pending()).length,0);
  await submitDurably(repo,'stable-id',payload,send);assert.equal(requests,2);
  await assert.rejects(submitDurably(repo,'stable-id',{...payload,receivedKobo:'200000'},send));assert.equal(requests,2);
  assert.equal(await localRepository(adapter(db),'staff-b').operation('stable-id'),null);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
test('network is never called if local persistence fails',async()=>{
 let called=false;
 await assert.rejects(submitDurably({enqueue:async()=>{throw new Error('Disk full');}},'id',payload,async()=>{called=true;return receipt;}));
 assert.equal(called,false);
});

test('next sale replaces only a confirmed draft, preserves receipt, and survives restart',async()=>{
 const { saveNextSaleDraft } = await import('../src/features/sales/submission.ts');
 const dir=mkdtempSync(join(tmpdir(),'bomedia-next-sale-'));const path=join(dir,'db');let db=new DatabaseSync(path);db.exec(localSchema);
 try {
  let repo=localRepository(adapter(db),'staff-a');
  const old={id:'old',payload};const blank={id:'next',payload:null,items:[],customer:{name:''},received:'0',method:null};
  await repo.saveDraft('current-sale',JSON.stringify(old));
  await repo.enqueue('old',JSON.stringify(payload));
  await assert.rejects(saveNextSaleDraft(repo,'old',blank));
  assert.deepEqual(JSON.parse((await repo.loadDraft('current-sale')).payload),old);
  await repo.confirm('old',JSON.stringify(receipt));
  await assert.rejects(saveNextSaleDraft({...repo,saveDraft:async()=>{throw new Error('Disk full');}},'old',blank));
  assert.equal((await repo.operation('old')).status,'confirmed');
  assert.deepEqual(JSON.parse((await repo.loadDraft('current-sale')).payload),old);
  await assert.rejects(saveNextSaleDraft(repo,'old',{...blank,id:'old'}));
  await saveNextSaleDraft(repo,'old',blank);
  db.close();db=new DatabaseSync(path);repo=localRepository(adapter(db),'staff-a');
  assert.deepEqual(JSON.parse((await repo.loadDraft('current-sale')).payload),blank);
  assert.deepEqual(JSON.parse((await repo.operation('old')).result),receipt);
 } finally {db.close();rmSync(dir,{recursive:true,force:true});}
});

test('lost acknowledgement cannot clear sale; recovery advances once without a second server write',async()=>{
 const { saveNextSaleDraft } = await import('../src/features/sales/submission.ts');
 const db=new DatabaseSync(':memory:');db.exec(localSchema);
 try {
  const repo=localRepository(adapter(db),'staff-a');
  const draft={id:'recover-sale',payload,items:[{width:'13'}]};
  const blank={id:'after-recovery',payload:null,items:[],customer:{name:''},method:null};
  await repo.saveDraft('current-sale',JSON.stringify(draft));
  let sends=0;let writes=0;const server=new Map();
  const send=async(id)=>{sends++;if(!server.has(id)){server.set(id,receipt);writes++;throw new Error('Acknowledgement lost');}return server.get(id);};
  await assert.rejects(submitDurably(repo,draft.id,payload,send));
  await assert.rejects(saveNextSaleDraft(repo,draft.id,blank));
  assert.deepEqual(JSON.parse((await repo.loadDraft('current-sale')).payload),draft);
  assert.deepEqual(await submitDurably(repo,draft.id,payload,send),receipt);
  await saveNextSaleDraft(repo,draft.id,blank);
  assert.deepEqual(JSON.parse((await repo.loadDraft('current-sale')).payload),blank);
  assert.equal(writes,1);assert.equal(sends,2);
  assert.deepEqual(await submitDurably(repo,draft.id,payload,send),receipt);
  assert.equal(sends,2);
  assert.equal(await repo.operation(blank.id),null);
  await assert.rejects(saveNextSaleDraft(localRepository(adapter(db),'staff-b'),draft.id,{...blank,id:'other-account'}));
 } finally {db.close();}
});

test('advancing records the last confirmed sale durably; unreadable or missing records are ignored',async()=>{
 const { saveNextSaleDraft, loadLastConfirmedSale, LAST_CONFIRMED_SALE } = await import('../src/features/sales/submission.ts');
 const dir=mkdtempSync(join(tmpdir(),'bomedia-last-confirmed-'));const path=join(dir,'db');let db=new DatabaseSync(path);db.exec(localSchema);
 try {
  let repo=localRepository(adapter(db),'staff-a');
  const full={...receipt,customerId:'c',totalKobo:'720000',receivedKobo:'700000',balanceKobo:'20000',reviewFlags:[]};
  const blank={id:'next',payload:null,items:[],customer:{name:''},received:'0',method:null};
  assert.equal(await loadLastConfirmedSale(repo),null);
  await repo.saveDraft('current-sale',JSON.stringify({id:'old',payload}));
  await repo.enqueue('old',JSON.stringify(payload));
  await assert.rejects(saveNextSaleDraft(repo,'old',blank));
  assert.equal(await loadLastConfirmedSale(repo),null,'pending sale must not be reported as confirmed');
  await repo.confirm('old',JSON.stringify(full));
  await saveNextSaleDraft(repo,'old',blank);
  db.close();db=new DatabaseSync(path);repo=localRepository(adapter(db),'staff-a');
  const last=await loadLastConfirmedSale(repo);
  assert.equal(last.operationId,'old');
  assert.deepEqual(last.receipt,full);
  assert.ok(Date.parse(last.advancedAt)>0);
  assert.equal(await loadLastConfirmedSale(localRepository(adapter(db),'staff-b')),null,'other account sees nothing');
  db.prepare('UPDATE drafts SET payload=? WHERE account_id=? AND draft_id=?').run('{not json','staff-a',LAST_CONFIRMED_SALE);
  assert.equal(await loadLastConfirmedSale(repo),null,'corrupt record is ignored, not thrown');
  await repo.saveDraft(LAST_CONFIRMED_SALE,JSON.stringify({operationId:'x',receipt:{invoiceNumber:'9'}}));
  assert.equal(await loadLastConfirmedSale(repo),null,'incomplete receipt is ignored');
 } finally {db.close();rmSync(dir,{recursive:true,force:true});}
});
