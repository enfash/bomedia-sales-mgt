import { supabase } from '@/services/supabase/client';

export type CustomerSort = 'name' | 'balance' | 'oldest';
export type CustomerBalance = { id: string; name: string; phone: string; balanceKobo: string; openInvoiceCount: number; oldestUnpaidDate: string | null };
export type DebtTotals = { customerCount: number; totalDebtKobo: string; oldestUnpaidDate: string | null };
export type OutstandingSale = { saleId: string; invoiceNumber: string; businessDate: string; totalKobo: string; balanceKobo: string; reviewFlags: string[] };

const PAGE_SIZE = 20;

export async function fetchDebtTotals(signal?: AbortSignal): Promise<DebtTotals> {
  if (!supabase) throw new Error('Sign in to load customer totals.');
  const { data, error } = await supabase.rpc('customer_debt_totals').abortSignal(signal ?? new AbortController().signal);
  if (error || !data?.[0]) throw new Error('Unable to load customer totals. Check your connection and retry.');
  const row = data[0];
  return { customerCount: row.customer_count, totalDebtKobo: String(row.total_debt_kobo), oldestUnpaidDate: row.oldest_unpaid_date ?? null };
}

type CustomerBalanceRow = { customer_id: string; name: string; phone: string | null; balance_kobo: number | string; open_invoice_count: number | string | null; oldest_unpaid_date: string | null };
export async function fetchCustomerBalances(search: string, sort: CustomerSort, offset: number, signal?: AbortSignal): Promise<{ customers: CustomerBalance[]; hasMore: boolean }> {
  if (!supabase) throw new Error('Sign in to search customers.');
  const { data, error } = await supabase.rpc('customer_balances', { search_text: search.trim() || null, sort_key: sort, page_limit: PAGE_SIZE, page_offset: offset }).abortSignal(signal ?? new AbortController().signal);
  if (error) throw new Error('Customer search failed. Retry.');
  const rows = (data ?? []) as CustomerBalanceRow[];
  return {
    customers: rows.map(row => ({
      id: row.customer_id, name: row.name, phone: row.phone ?? '', balanceKobo: String(row.balance_kobo),
      openInvoiceCount: Number(row.open_invoice_count ?? 0), oldestUnpaidDate: row.oldest_unpaid_date,
    })),
    hasMore: rows.length === PAGE_SIZE,
  };
}

type OutstandingSaleRow = { sale_id: string; invoice_number: number | string; business_date: string; total_kobo: number | string; balance_kobo: number | string; review_flags: string[] | null };
export async function fetchOutstandingSales(customerId: string): Promise<OutstandingSale[]> {
  if (!supabase) throw new Error('Sign in to load outstanding invoices.');
  const { data, error } = await supabase.rpc('customer_outstanding_sales', { target_customer_id: customerId });
  if (error) throw new Error('Unable to load this customer’s outstanding invoices. Retry.');
  return ((data ?? []) as OutstandingSaleRow[]).map(row => ({
    saleId: row.sale_id, invoiceNumber: String(row.invoice_number), businessDate: row.business_date,
    totalKobo: String(row.total_kobo), balanceKobo: String(row.balance_kobo), reviewFlags: row.review_flags ?? [],
  }));
}
