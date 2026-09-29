import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localSchema } from '../src/services/local/schema.ts';
import { localRepository } from '../src/services/local/repository.ts';
function adapter(db) {
  return { runAsync: async (sql,...p)=>db.prepare(sql).run(...p), getFirstAsync: async(sql,...p)=>db.prepare(sql).get(...p)??null, getAllAsync: async(sql,...p)=>db.prepare(sql).all(...p) };
}
test('durable drafts and retries survive reopening with account isolation', async()=>{
  const dir=mkdtempSync(join(tmpdir(),'bomedia-store-')); const path=join(dir,'db');
  let db=new DatabaseSync(path); db.exec(localSchema);
  try {
    const a=localRepository(adapter(db),'staff-a');
    await a.saveDraft('sale','{"items":[1,2]}');
    await a.enqueue('stable-id','{"amount":"100"}');
    await a.enqueue('stable-id','{"amount":"100"}');
    assert.equal((await a.pending()).length,1);
    await assert.rejects(a.enqueue('stable-id','{"amount":"200"}'));
    assert.equal(await localRepository(adapter(db),'staff-b').loadDraft('sale'),null);
    db.close(); db=new DatabaseSync(path);
    const restored=localRepository(adapter(db),'staff-a');
    assert.equal((await restored.loadDraft('sale')).payload,'{"items":[1,2]}');
    assert.equal((await restored.pending()).length,1);
    await restored.confirm('stable-id','{"server_id":"one"}');
    await restored.enqueue('stable-id','{"amount":"100"}');
    assert.equal((await restored.pending()).length,0);
  } finally {db.close();rmSync(dir,{recursive:true,force:true});}
});
