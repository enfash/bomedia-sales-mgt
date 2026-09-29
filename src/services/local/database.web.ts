import type { LocalRepository, StoredOperation } from './repository';

// Web stores drafts and retry receipts durably. It still requires a connection for new entry.
export async function openLocalRepository(accountId: string): Promise<LocalRepository> {
  if (!accountId) throw new Error('Account scope required.');
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('bomedia-recovery', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('drafts'); request.result.createObjectStore('outbox'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  function transaction<T>(store: string, mode: IDBTransactionMode, action: (store: IDBObjectStore, result: (value: T) => void) => void): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode); let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Local save was interrupted.'));
      try { action(tx.objectStore(store), result => { value = result; }); } catch (error) { tx.abort(); reject(error); }
    });
  }
  const key = (id: string) => `${accountId}:${id}`;
  return {
    saveDraft: async (id, payload) => { JSON.parse(payload); await transaction<void>('drafts', 'readwrite', store => { store.put({ payload }, key(id)); }); },
    loadDraft: id => transaction('drafts', 'readonly', (store, done) => { const req = store.get(key(id)); req.onsuccess = () => done(req.result ?? null); }),
    enqueue: async (id, payload) => {
      if (!id) throw new Error('Stable operation ID required.'); JSON.parse(payload);
      await transaction<void>('outbox', 'readwrite', (store) => {
        const req = store.get(key(id));
        req.onsuccess = () => {
          if (req.result && req.result.payload !== payload) { store.transaction.abort(); return; }
          if (!req.result) store.put({ accountId, operation_id: id, payload, status: 'pending', result: null, createdAt: new Date().toISOString() }, key(id));
        };
      });
    },
    operation: id => transaction<StoredOperation | null>('outbox', 'readonly', (store, done) => { const req = store.get(key(id)); req.onsuccess = () => done(req.result ?? null); }),
    cashEntries: () => transaction('outbox', 'readonly', (store, done) => {
      const req = store.getAll(); req.onsuccess = () => done(req.result.filter(r => r.accountId === accountId && r.operation_id.startsWith('cash:')).sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
    }),
    payments: () => transaction('outbox', 'readonly', (store, done) => {
      const req = store.getAll(); req.onsuccess = () => done(req.result.filter(r => r.accountId === accountId && r.operation_id.startsWith('payment:')).sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
    }),
    pending: () => transaction('outbox', 'readonly', (store, done) => {
      const req = store.getAll(); req.onsuccess = () => done(req.result.filter(r => r.accountId === accountId && r.status === 'pending').sort((a,b) => a.createdAt.localeCompare(b.createdAt)));
    }),
    rejectCash: async (id, result) => {
      const value = JSON.parse(result);
      if (!id.startsWith('cash:') || value.status !== 'rejected' || value.operationId !== id.slice(5)) throw new Error('Invalid cash rejection.');
      await transaction<void>('outbox', 'readwrite', store => {
        const req = store.get(key(id));
        req.onsuccess = () => { if (req.result?.status === 'pending') store.put({ ...req.result, status: 'needs_attention', result }, key(id)); };
      });
    },
    confirm: async (id, result) => {
      JSON.parse(result);
      await transaction<void>('outbox', 'readwrite', store => {
        const req = store.get(key(id));
        req.onsuccess = () => { if (req.result?.status === 'pending') store.put({ ...req.result, status: 'confirmed', result }, key(id)); };
      });
    },
  };
}
