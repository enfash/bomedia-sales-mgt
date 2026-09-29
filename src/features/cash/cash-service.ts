import { supabase } from '@/services/supabase/client';
import { isCashRejection, type CashOutcome, type CashPayload, type CashReceipt } from './submission';
export type CashCount = { entryId: string; amountKobo: string; recordedByName: string; occurredAt: string; receivedAt: string; reviewFlags: string[] };
/** Drawer figures, shared by the live summary and the snapshot saved when admin finalizes. */
export type CashFigures = {
  openingKobo: string | null; openedByName: string | null; cashReceivedKobo: string; cashExpensesKobo: string; cashWithdrawalsKobo: string;
  posOutflowKobo: string; transferOutflowKobo: string; expectedCashKobo: string | null;
  countedKobo: string | null; countedByName: string | null; countedAt: string | null; differenceKobo: string | null;
};
export type CashClose = {
  closeId: string; finalizedAt: string; finalizedByName: string; note: string | null; snapshot: CashFigures;
  lateEntryCount: number; expectedChangeKobo: string | null; needsReview: boolean;
};
export type CashReopen = { closeId: string; finalizedAt: string; finalizedByName: string; reopenedAt: string; reopenedByName: string; reason: string };
export type CashSummary = CashFigures & { date: string; hasMore: boolean; entries: CashReceipt[]; counts: CashCount[]; close: CashClose | null; reopenHistory: CashReopen[] };
export async function readCashSummary(key: string, offset: number, signal: AbortSignal) {
  if (!supabase) throw new Error('Sign in to view the drawer.');
  const { data, error } = await supabase.rpc('cash_day_summary', { target_date: key.split('|')[0], page_offset: offset }).abortSignal(signal);
  if (error || !data?.entries) throw new Error('Unable to refresh the drawer. Check your connection and retry.');
  // A server without migration 010 omits closing fields; show "not counted" rather than failing.
  const summary: CashSummary = { countedKobo: null, countedByName: null, countedAt: null, differenceKobo: null, close: null, ...data, counts: data.counts ?? [], reopenHistory: data.reopenHistory ?? [] };
  return { items: [summary], hasMore: summary.hasMore };
}
export async function sendCashEntry(id: string, payload: CashPayload): Promise<CashOutcome> {
  if (!supabase) throw new Error('Sign in to record this entry.');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const { data, error } = await supabase.rpc('process_cash_entry', { operation_id: id, payload }).abortSignal(controller.signal);
    if (error) {
      if (['P0001','42501','22P02','22007','22008'].includes(error.code)) throw new Error('This saved entry needs admin review. Do not record another copy.');
      throw new Error('Confirmation unavailable. Retry this same saved entry when connected.');
    }
    if (isCashRejection(data) && data.operationId === id) return data;
    if (!data?.entryId || data.action !== payload.action || data.amountKobo !== payload.amountKobo || data.method !== payload.method) throw new Error('Incomplete confirmation. Retry the saved entry.');
    return data;
  } finally { clearTimeout(timer); }
}
// Finalize and reopen are online admin actions: the server rejects a repeat, so a lost response is
// resolved by refreshing the day rather than by a local queue.
async function adminDayAction(name: 'finalize_cash_day' | 'reopen_cash_day', args: Record<string, string | null>) {
  if (!supabase) throw new Error('Sign in as admin to change the cash day.');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const { error } = await supabase.rpc(name, args).abortSignal(controller.signal);
    if (!error) return;
    if (error.code === '42501') throw new Error('Only an admin can finalize or reopen a cash day.');
    if (error.code === 'P0001') throw new Error(error.message);
    throw new Error('No confirmation received. Refresh the day to see whether it changed before trying again.');
  } finally { clearTimeout(timer); }
}
export function finalizeCashDay(date: string, note: string) { return adminDayAction('finalize_cash_day', { target_date: date, close_note: note.trim() || null }); }
export function reopenCashDay(date: string, reason: string) { return adminDayAction('reopen_cash_day', { target_date: date, reason_text: reason.trim() }); }
export type CashDayState = { date: string; state: 'final' | 'review' | 'open' | 'none' };
export async function readCashDayStates(key: string, _offset: number, signal: AbortSignal) {
  if (!supabase) throw new Error('Sign in to view the drawer.');
  const { data, error } = await supabase.rpc('cash_day_states', { end_date: key.split('|')[0], day_count: 7 }).abortSignal(signal);
  if (error || !Array.isArray(data)) throw new Error('Day states unavailable.');
  return { items: data as CashDayState[], hasMore: false };
}
