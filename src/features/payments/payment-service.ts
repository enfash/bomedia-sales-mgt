import { supabase } from '@/services/supabase/client';
import type { PaymentPayload, PaymentReceipt } from './submission';

export class PaymentReviewRequired extends Error {}
export async function sendPayment(operationId: string, payload: PaymentPayload): Promise<PaymentReceipt> {
  if (!supabase) throw new PaymentReviewRequired('Sign in before recording a payment.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const { data, error } = await supabase.rpc('record_payment', { operation_id: operationId, payload }).abortSignal(controller.signal);
    if (error) {
      if (['P0001', '42501', '22P02', '22007', '22008'].includes(error.code)) {
        throw new PaymentReviewRequired('This saved payment needs review. Contact your admin; do not record it again with a new ID.');
      }
      throw new Error('Payment confirmation unavailable. Retry the same saved payment when connected.');
    }
    if (!data?.paymentId || data.customerId !== payload.customerId || data.amountKobo !== payload.amountKobo
      || data.scope !== payload.scope || data.saleId !== payload.saleId || data.method !== payload.method
      || !Array.isArray(data.allocations) || !Array.isArray(data.reviewFlags)) {
      throw new Error('Payment confirmation incomplete. Retry the same saved payment.');
    }
    return data as PaymentReceipt;
  } finally { clearTimeout(timer); }
}

export async function fetchPaymentContext(customerId: string, saleId: string | null): Promise<import('./review').PaymentContext> {
  if (!supabase) throw new Error('Sign in to review this payment.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const { data, error } = await supabase.rpc('payment_context', { target_customer_id: customerId, target_sale_id: saleId }).abortSignal(controller.signal);
    if (error || !data?.invoices) throw new Error('Payment review is unavailable. Check your connection and ask your admin to confirm payment setup.');
    return data;
  } finally { clearTimeout(timer); }
}
