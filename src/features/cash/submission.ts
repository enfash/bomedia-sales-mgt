import type { LocalRepository, StoredOperation } from '../../services/local/repository.ts';
import { nairaToKobo } from '../sales/domain/money.ts';
export type CashAction = 'opening' | 'expense' | 'withdrawal' | 'closing_count';
export type CashPayload = { kind: 'cash'; version: 1; action: CashAction; amountKobo: string; method: 'cash' | 'pos' | 'transfer'; reason: string; deviceId: string; occurredAt: string; businessDate?: string };
export type CashReceipt = { entryId: string; action: CashAction; amountKobo: string; method: CashPayload['method']; reason: string; recordedByName: string; businessDate: string; occurredAt: string; receivedAt: string; reviewFlags: string[] };
export type CashRejection = { status: 'rejected'; operationId: string; message: string; resolvedAt: string };
export type CashOutcome = CashReceipt | CashRejection;
export function isCashRejection(value: unknown): value is CashRejection {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<CashRejection>;
  return r.status === 'rejected' && typeof r.operationId === 'string' && typeof r.message === 'string' && typeof r.resolvedAt === 'string';
}
export function savedCashRejection(row: StoredOperation): CashRejection | null {
  if (row.status !== 'needs_attention' || !row.result) return null;
  try { const result: unknown = JSON.parse(row.result); return isCashRejection(result) && `cash:${result.operationId}` === row.operation_id ? result : null; } catch { return null; }
}
export function validateCashEntry(action: CashAction | null, amount: string, method: string | null, reason: string) {
  if (!action) throw new Error('Choose opening cash, closing count, expense or withdrawal.');
  // Opening and closing are counts of the physical drawer: cash only, zero allowed, no reason.
  const count = action === 'opening' || action === 'closing_count';
  const kobo = nairaToKobo(amount);
  if (!kobo || kobo.length > 16 || (!count && BigInt(kobo) === 0n)) throw new Error('Enter a valid amount with up to two decimal places.');
  if (!['cash', 'pos', 'transfer'].includes(method ?? '')) throw new Error('Choose the payment method.');
  if (count && method !== 'cash') throw new Error('A drawer count is physical cash.');
  if (!count && (!reason.trim() || reason.trim().length > 500)) throw new Error('Enter a reason, up to 500 characters.');
  return kobo;
}
export async function submitCashDurably(repo: LocalRepository, id: string, payload: CashPayload, send: (id: string, payload: CashPayload) => Promise<CashOutcome>) {
  const key = `cash:${id}`;
  await repo.enqueue(key, JSON.stringify(payload));
  const saved = await repo.operation(key);
  if (saved?.status === 'confirmed' && saved.result) return JSON.parse(saved.result) as CashReceipt;
  const rejection = saved && savedCashRejection(saved);
  if (rejection) return rejection;
  const receipt = await send(id, payload);
  if (isCashRejection(receipt)) {
    if (receipt.operationId !== id) throw new Error('Rejection belongs to another request.');
    await repo.rejectCash(key, JSON.stringify(receipt));
    return receipt;
  }
  await repo.confirm(key, JSON.stringify(receipt));
  return receipt;
}
