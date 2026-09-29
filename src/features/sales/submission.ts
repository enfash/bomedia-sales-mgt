import type { LocalRepository } from '../../services/local/repository.ts';

export type SaleReceipt = { saleId: string; invoiceNumber: string; customerId: string; totalKobo: string; receivedKobo: string; balanceKobo: string; reviewFlags: string[] };
export type SalePayload = {
  version: 1; rulesVersion: number; deviceId: string; occurredAt: string;
  customer: { id: string | null; name: string; phone: string };
  items: { materialId: string; priceVersionId: string; width: string; height: string; unit: 'ft' | 'in'; quantity: string }[];
  totalKobo: string; receivedKobo: string; method: 'cash' | 'pos' | 'transfer' | null;
};
export async function submitDurably(repo: LocalRepository, id: string, payload: SalePayload, send: (id: string, payload: SalePayload) => Promise<SaleReceipt>) {
  await repo.enqueue(id, JSON.stringify(payload));
  const operation = await repo.operation(id);
  if (operation?.status === 'confirmed' && operation.result) return JSON.parse(operation.result) as SaleReceipt;
  const receipt = await send(id, payload);
  // An unsuccessful local acknowledgement leaves the operation retryable with the same ID.
  await repo.confirm(id, JSON.stringify(receipt));
  return receipt;
}

// Only replace the active draft after a durable acknowledgement. Keep the receipt
// in the operation store so starting another sale cannot erase confirmed history.
export async function saveNextSaleDraft(repo: LocalRepository, confirmedId: string, next: { id: string; payload: null }) {
  const operation = await repo.operation(confirmedId);
  if (operation?.status !== 'confirmed' || !operation.result) throw new Error('Sale confirmation is still pending.');
  if (!next.id || next.id === confirmedId || next.payload !== null) throw new Error('The next sale must have a new identity.');
  // Record the confirmed invoice durably before advancing, so the confirmation note
  // survives remounts (auth re-checks, foreground/visibility changes) and restarts.
  const confirmed: LastConfirmedSale = { operationId: confirmedId, receipt: JSON.parse(operation.result) as SaleReceipt, advancedAt: new Date().toISOString() };
  await repo.saveDraft(LAST_CONFIRMED_SALE, JSON.stringify(confirmed));
  await repo.saveDraft('current-sale', JSON.stringify(next));
}

export const LAST_CONFIRMED_SALE = 'last-confirmed-sale';
export type LastConfirmedSale = { operationId: string; receipt: SaleReceipt; advancedAt: string };

// The most recently advanced confirmed sale on this device/account, or null. Returns null
// rather than throwing on unreadable data: this is feedback only, never the receipt source.
export async function loadLastConfirmedSale(repo: LocalRepository): Promise<LastConfirmedSale | null> {
  try {
    const saved = await repo.loadDraft(LAST_CONFIRMED_SALE);
    if (!saved) return null;
    const parsed = JSON.parse(saved.payload) as Partial<LastConfirmedSale>;
    if (!parsed.operationId || !parsed.receipt?.invoiceNumber || !Array.isArray(parsed.receipt.reviewFlags)) return null;
    return parsed as LastConfirmedSale;
  } catch { return null; }
}
