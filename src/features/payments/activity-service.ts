import { supabase } from '@/services/supabase/client';
export type ActivityReceipt = {
  id: string; customerName: string; amountKobo: string; unappliedKobo: string;
  method: 'cash' | 'pos' | 'transfer'; collectedByName: string; businessDate: string;
  occurredAt: string; receivedAt: string; reviewFlags: string[];
  allocations: { invoiceNumber: string; amountKobo: string }[];
};
export type PaymentActivity = {
  count: string; cashKobo: string; posKobo: string; transferKobo: string; unappliedKobo: string;
  hasMore: boolean; receipts: ActivityReceipt[];
};
export async function readPaymentActivity(key: string, offset: number, signal: AbortSignal) {
  if (!supabase) throw new Error('Sign in to view confirmed payments.');
  const [date, mode] = key.split('|');
  const { data, error } = await supabase.rpc('payment_activity', { target_date: date, review_only: mode === 'review', page_offset: offset }).abortSignal(signal);
  if (error || !data?.receipts) throw new Error('Unable to refresh confirmed payments. Check your connection and retry.');
  const activity = data as PaymentActivity;
  return { items: [activity], hasMore: activity.hasMore };
}
