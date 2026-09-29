import type { LocalRepository } from '../../services/local/repository.ts';

export type PaymentPayload = {
  kind: 'payment'; version: 1; customerName?: string; scope: 'customer' | 'invoice'; customerId: string;
  saleId: string | null; amountKobo: string; method: 'cash' | 'pos' | 'transfer';
  deviceId: string; occurredAt: string;
};
export type PaymentReceipt = {
  paymentId: string; customerId: string; scope: 'customer' | 'invoice'; saleId: string | null;
  amountKobo: string; allocatedKobo: string; unappliedKobo: string; method: PaymentPayload['method'];
  collectedBy: string; collectedByName: string; occurredAt: string; receivedAt: string; businessDate: string;
  allocations: { saleId: string; invoiceNumber: string; amountKobo: string; balanceKobo: string }[];
  reviewFlags: string[];
};

/** Persist the immutable receipt request before sending. Reuse its ID after a lost reply. */
export async function submitPaymentDurably(repo: LocalRepository, id: string, payload: PaymentPayload,
  send: (id: string, payload: PaymentPayload) => Promise<PaymentReceipt>) {
  const localId = `payment:${id}`;
  await repo.enqueue(localId, JSON.stringify(payload));
  const saved = await repo.operation(localId);
  if (saved?.status === 'confirmed' && saved.result) return JSON.parse(saved.result) as PaymentReceipt;
  const receipt = await send(id, payload);
  await repo.confirm(localId, JSON.stringify(receipt));
  return receipt;
}

/** A history-refresh failure must not turn an acknowledged receipt into a failed payment. */
export async function submitPaymentAndRefresh(repo: LocalRepository, id: string, payload: PaymentPayload,
  send: (id: string, payload: PaymentPayload) => Promise<PaymentReceipt>) {
  const receipt = await submitPaymentDurably(repo, id, payload, send);
  try { return { receipt, operations: await repo.payments() }; }
  catch { return { receipt, operations: null }; }
}
