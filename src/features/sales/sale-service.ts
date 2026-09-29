import { supabase } from '@/services/supabase/client';
import type { SalePayload, SaleReceipt } from './submission';

export class SaleReviewRequired extends Error {}
export async function sendSale(operationId: string, payload: SalePayload): Promise<SaleReceipt> {
  if (!supabase) throw new SaleReviewRequired('Sign in before submitting a sale.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const { data, error } = await supabase.rpc('create_sale', { operation_id: operationId, payload }).abortSignal(controller.signal);
    if (error) {
      if (error.code === 'P0001') throw new SaleReviewRequired(`${error.message}. The saved submission needs review; it has not been discarded.`);
      if (error.code === '42501') throw new SaleReviewRequired('Your access could not be verified. Sign in again or contact your admin.');
      throw new Error('Confirmation unavailable. Your submission is kept on this device. Retry this submission when connected.');
    }
    if (!data?.saleId || !data?.invoiceNumber) throw new Error('Confirmation was incomplete. Retry the same submission.');
    return data as SaleReceipt;
  } catch (failure) {
    if (failure instanceof SaleReviewRequired) throw failure;
    throw new Error('Confirmation unavailable. Your submission is kept on this device. Retry this submission when connected.');
  } finally { clearTimeout(timer); }
}
