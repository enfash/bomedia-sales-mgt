import { nairaToKobo } from '../sales/domain/money.ts';
export type PaymentContext = { customerId: string; customerName: string; balanceKobo: string; invoices: { saleId: string; invoiceNumber: string; balanceKobo: string }[] };
export function reviewPayment(context: PaymentContext, amount: string, method: string | null) {
  const kobo = nairaToKobo(amount);
  if (!kobo || BigInt(kobo) <= 0n || kobo.length > 16) throw new Error('Enter a positive amount with up to two decimal places.');
  if (!['cash', 'pos', 'transfer'].includes(method ?? '')) throw new Error('Choose how this payment was received.');
  if (BigInt(kobo) > BigInt(context.balanceKobo)) throw new Error('This amount exceeds the current debt. Check the amount or contact your admin.');
  let remaining = BigInt(kobo);
  const allocations = context.invoices.flatMap(invoice => {
    const applied = remaining < BigInt(invoice.balanceKobo) ? remaining : BigInt(invoice.balanceKobo);
    remaining -= applied;
    return applied > 0n ? [{ ...invoice, amountKobo: applied.toString() }] : [];
  });
  if (remaining !== 0n) throw new Error('Debt details are incomplete. Refresh and retry.');
  return { kobo, allocations };
}
