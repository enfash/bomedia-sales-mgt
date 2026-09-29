// Small adapter permits the same SQL to be tested against real SQLite in Node.
export type LocalDatabase = {
  runAsync: (sql: string, ...params: string[]) => Promise<unknown>;
  getFirstAsync: <T>(sql: string, ...params: string[]) => Promise<T | null>;
  getAllAsync: <T>(sql: string, ...params: string[]) => Promise<T[]>;
};
export type StoredOperation = { operation_id: string; payload: string; status: 'pending' | 'confirmed' | 'needs_attention'; result: string | null };
export type LocalRepository = ReturnType<typeof localRepository>;
export function localRepository(db: LocalDatabase, accountId: string) {
  if (!accountId.trim()) throw new Error('Account scope required.');
  return {
    async saveDraft(id: string, payload: string) {
      JSON.parse(payload);
      await db.runAsync('INSERT INTO drafts VALUES (?,?,?,?) ON CONFLICT(account_id,draft_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at', accountId, id, payload, new Date().toISOString());
    },
    async loadDraft(id: string) { return db.getFirstAsync<{ payload: string }>('SELECT payload FROM drafts WHERE account_id=? AND draft_id=?', accountId, id); },
    async enqueue(operationId: string, payload: string) {
      if (!operationId.trim()) throw new Error('Stable operation ID required.');
      JSON.parse(payload);
      await db.runAsync('INSERT INTO outbox(account_id,operation_id,payload,created_at) VALUES (?,?,?,?) ON CONFLICT(account_id,operation_id) DO NOTHING', accountId, operationId, payload, new Date().toISOString());
      const saved = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM outbox WHERE account_id=? AND operation_id=?', accountId, operationId);
      if (!saved || saved.payload !== payload) throw new Error('Operation ID already has a different payload.');
    },
    async operation(id: string) { return db.getFirstAsync<StoredOperation>('SELECT operation_id,payload,status,result FROM outbox WHERE account_id=? AND operation_id=?', accountId, id); },
    async cashEntries() { return db.getAllAsync<StoredOperation>("SELECT operation_id,payload,status,result FROM outbox WHERE account_id=? AND operation_id LIKE 'cash:%' ORDER BY created_at DESC,operation_id", accountId); },
    async payments() { return db.getAllAsync<StoredOperation>("SELECT operation_id,payload,status,result FROM outbox WHERE account_id=? AND operation_id LIKE 'payment:%' ORDER BY created_at DESC,operation_id", accountId); },
    async pending() { return db.getAllAsync<{ operation_id: string; payload: string }>("SELECT operation_id,payload FROM outbox WHERE account_id=? AND status='pending' ORDER BY created_at,operation_id", accountId); },
    async rejectCash(id: string, result: string) {
      const value = JSON.parse(result);
      if (!id.startsWith('cash:') || value.status !== 'rejected' || value.operationId !== id.slice(5)) throw new Error('Invalid cash rejection.');
      await db.runAsync("UPDATE outbox SET status='needs_attention',result=? WHERE account_id=? AND operation_id=? AND status='pending'", result, accountId, id);
    },
    async confirm(id: string, result: string) {
      JSON.parse(result);
      await db.runAsync("UPDATE outbox SET status='confirmed',result=? WHERE account_id=? AND operation_id=? AND status='pending'", result, accountId, id);
    },
  };
}
