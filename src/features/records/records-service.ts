import { supabase } from '@/services/supabase/client';

export type PaymentState = 'paid' | 'part' | 'unpaid' | 'void';
export type SaleSummary = { id: string; customerId: string; invoiceNumber: string; customerName: string; customerPhone: string; totalKobo: string; paidKobo: string; balanceKobo: string; state: PaymentState; status: string; reviewFlags: string[]; createdAt: string };
export type SaleItemRow = { position: number; materialName: string; width: string; height: string; unit: 'ft' | 'in'; quantity: string; calculatedKobo: string; chargedKobo: string };
export type SalePaymentRow = { amountKobo: string; method: string; occurredAt: string };

const PAGE_SIZE = 20;

type SaleRow = {
  id: string; customer_id: string; invoice_number: number | string; customer_name: string; customer_phone: string | null;
  total_kobo: number | string; status: string; review_flags: string[] | null; created_at: string;
  payment_allocations: { amount_kobo: number | string }[] | null;
};

export async function fetchSalesForDate(businessDate: string, offset: number, signal?: AbortSignal): Promise<{ sales: SaleSummary[]; hasMore: boolean }> {
  if (!supabase) throw new Error('Sign in to view records.');
  const { data, error } = await supabase.from('sales')
    // Allocations are embedded per sale, so each row's paid amount is complete regardless
    // of paging. Totals across rows are only ever as complete as the rows loaded.
    .select('id,customer_id,invoice_number,customer_name,customer_phone,total_kobo,status,review_flags,created_at,payment_allocations(amount_kobo)')
    .eq('business_date', businessDate)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
    .abortSignal(signal ?? new AbortController().signal);
  if (error) throw new Error('Unable to load records. Check your connection and retry.');
  const rows = (data ?? []) as SaleRow[];
  return {
    sales: rows.map(row => {
      const total = BigInt(String(row.total_kobo));
      // Exact integer kobo throughout; never a float and never a rounded display value.
      const paid = (row.payment_allocations ?? []).reduce((sum, a) => sum + BigInt(String(a.amount_kobo)), 0n);
      const balance = total - paid;
      const state: PaymentState = row.status === 'void' ? 'void' : balance <= 0n ? 'paid' : paid > 0n ? 'part' : 'unpaid';
      return {
        id: row.id, customerId: row.customer_id, invoiceNumber: String(row.invoice_number), customerName: row.customer_name, customerPhone: row.customer_phone ?? '',
        totalKobo: String(total), paidKobo: String(paid), balanceKobo: String(balance < 0n ? 0n : balance), state,
        status: row.status, reviewFlags: row.review_flags ?? [], createdAt: row.created_at,
      };
    }),
    hasMore: rows.length === PAGE_SIZE,
  };
}

export async function fetchSaleItems(saleId: string): Promise<SaleItemRow[]> {
  if (!supabase) throw new Error('Sign in to view invoice items.');
  const { data, error } = await supabase.from('sale_items')
    .select('position,material_name,width_input,height_input,unit,quantity,calculated_kobo,charged_kobo')
    .eq('sale_id', saleId).order('position');
  if (error) throw new Error('Unable to load invoice items. Retry.');
  return (data ?? []).map(row => ({
    position: row.position, materialName: row.material_name, width: row.width_input, height: row.height_input,
    unit: row.unit, quantity: String(row.quantity), calculatedKobo: String(row.calculated_kobo), chargedKobo: String(row.charged_kobo),
  }));
}

type AllocationRow = { amount_kobo: number | string; payments: { method: string; occurred_at: string } | { method: string; occurred_at: string }[] | null };
export async function fetchSalePayments(saleId: string): Promise<SalePaymentRow[]> {
  if (!supabase) throw new Error('Sign in to view payments.');
  const { data, error } = await supabase.from('payment_allocations')
    .select('amount_kobo,payments(method,occurred_at)')
    .eq('sale_id', saleId);
  if (error) throw new Error('Unable to load payments for this invoice. Retry.');
  return ((data ?? []) as AllocationRow[]).flatMap(row => {
    const payment = Array.isArray(row.payments) ? row.payments[0] : row.payments;
    return payment ? [{ amountKobo: String(row.amount_kobo), method: payment.method, occurredAt: payment.occurred_at }] : [];
  });
}

export type DayTotals = { billedKobo: string; collectedKobo: string; outstandingKobo: string };

// Authoritative day totals from records_day_totals(date): billed/collected/owed for the
// whole business date, so the summary no longer depends on how many rows are paged in.
export async function fetchDayTotals(businessDate: string, signal?: AbortSignal): Promise<DayTotals> {
  if (!supabase) throw new Error('Sign in to view records.');
  const { data, error } = await supabase.rpc('records_day_totals', { target_date: businessDate }).abortSignal(signal ?? new AbortController().signal);
  if (error || !data?.[0]) throw new Error('Unable to load day totals. Check your connection and retry.');
  const row = data[0];
  return { billedKobo: String(row.billed_kobo), collectedKobo: String(row.collected_kobo), outstandingKobo: String(row.outstanding_kobo) };
}
