import { ActionButton as Button } from '@/components/ui/action-button';
import { CashActivity } from './components/cash-activity';
import { readPaymentActivity } from '@/features/payments/activity-service';
import { KeyFigure } from '@/components/ui/key-figure';
import { MetricGrid } from '@/components/ui/metric-grid';
import { View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useWorkspaceLayout } from '@/hooks/use-workspace-layout';
import { use, useCallback, useRef, useState, useTransition } from 'react';
import { useFocusEffect } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { ActivityIndicator, Card, Text, TextInput } from 'react-native-paper';
import { Page } from '@/components/ui/page';
import { FormSection } from '@/components/ui/form-section';
import { ChoiceButtons } from '@/components/ui/choice-buttons';
import { CopyableAmount } from '@/components/ui/copyable-amount';
import { ReviewSheet } from '@/components/ui/review-sheet';
import { AuthProfile } from '@/features/auth/auth-gate';
import { openLocalRepository } from '@/services/local/database';
import type { LocalRepository, StoredOperation } from '@/services/local/repository';
import { useFocusedPage } from '@/hooks/use-focused-page';
import { addDays, dayWindow, readableLagosDate, todayLagos } from '@/features/records/lagos-date';
import { DayNavigator, type DayStatus as DayState } from '@/components/ui/day-navigator';
import { useTopbarStatus } from '@/components/layout/app-shell';
import { ClosingCount, DayStatus, dayState } from './components/cash-closing';
import { formatNaira } from '@/features/sales/domain/money';
import { finalizeCashDay, readCashDayStates, readCashSummary, reopenCashDay, sendCashEntry, type CashDayState } from './cash-service';
import { submitCashDurably, validateCashEntry, isCashRejection, savedCashRejection, type CashAction, type CashPayload, type CashReceipt } from './submission';

export default function CashScreen() {
  const profile = use(AuthProfile);
  return profile ? <CashWorkspace key={profile.id} accountId={profile.id} admin={profile.role === 'admin'} /> : null;
}
const dayStatus: Record<CashDayState['state'], DayState> = { final: 'finalized', review: 'needsReview', open: 'open', none: 'none' };
const actionLabels: Record<CashAction, string> = { opening: 'Opening cash', closing_count: 'Closing count', expense: 'Expense', withdrawal: 'Withdrawal' };
function CashWorkspace({ accountId, admin }: { accountId: string; admin: boolean }) {
  const { roomy, wide, desktop } = useWorkspaceLayout();
  const today = todayLagos();
  const [date, setDate] = useState(today);
  const [dayRevision, setDayRevision] = useState(0);
  const isToday = date === today;
  const [repo, setRepo] = useState<LocalRepository | null>(null);
  const [stored, setStored] = useState<StoredOperation[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [action, setAction] = useState<CashAction | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<CashPayload['method'] | null>(null);
  const [reason, setReason] = useState('');
  const [id, setId] = useState(randomUUID);
  const [frozen, setFrozen] = useState<{ id: string; payload: CashPayload } | null>(null);
  const [review, setReview] = useState<CashPayload | null>(null);
  const [receipt, setReceipt] = useState<CashReceipt | null>(null);
  const [error, setError] = useState('');
  const [busy, startTransition] = useTransition();
  const locked = useRef(false);
  const page = useFocusedPage(`${date}|${receipt?.entryId ?? ''}|${dayRevision}`, readCashSummary);
  const summary = page.items?.at(-1);
  // Collections already have a scoped server aggregate; never sum a receipt page.
  const collectionsPage = useFocusedPage(`${date}|day|${receipt?.entryId ?? ''}`, readPaymentActivity);
  const collections = collectionsPage.items?.at(-1);
  const updatedAt = page.updatedAt && collectionsPage.updatedAt ? (page.updatedAt < collectionsPage.updatedAt ? page.updatedAt : collectionsPage.updatedAt) : null;
  function refreshAll() { page.refresh(); collectionsPage.refresh(); statesPage.refresh(); }
  useTopbarStatus('/cash', desktop && summary ? dayState(summary) : null);
  // Staff record everything for today only; on an earlier date admin may backfill a closing count.
  const entryOptions = (isToday ? ['opening', 'closing_count', 'expense', 'withdrawal'] as const : admin ? ['closing_count'] as const : [])
    .map(value => ({ value, label: actionLabels[value] }));
  // Seven recent days ending a little after the selected one (never after today), with each day's close state.
  const minDate = admin ? undefined : addDays(today, -6);
  const stripEnd = dayWindow(date, today, minDate).at(-1)!;
  const statesPage = useFocusedPage(`${stripEnd}|${dayRevision}|${receipt?.entryId ?? ''}`, readCashDayStates);
  const dayStatuses = Object.fromEntries((statesPage.items ?? []).map(day => [day.date, dayStatus[day.state]]));
  function showDate(next: string) {
    if (busy || frozen) return;
    setDate(next); setAction(null); setMethod(null); setAmount(''); setReason(''); setError('');
  }
  async function changeDay(run: () => Promise<void>) {
    try { await run(); }
    finally { setDayRevision(n => n + 1); collectionsPage.refresh(); }
  }
  let entryBlocker = '';
  try {
    if (!summary || page.error) throw new Error('Refresh the drawer before reviewing a new entry.');
    if (action === 'opening' && summary.openingKobo !== null) throw new Error('Opening cash is already recorded. Ask admin about any correction.');
    if (action === 'closing_count' && summary.close) throw new Error('This day is finalized. Admin must reopen it before a recount.');
    validateCashEntry(action, amount, method, reason);
  } catch (failure) { entryBlocker = failure instanceof Error ? failure.message : 'Complete the entry before reviewing.'; }
  const entries = [...new Map(page.items?.flatMap(item => item.entries).map(entry => [entry.entryId,entry]) ?? []).values()];
  const loadLocal = useCallback(() => {
    startTransition(async () => {
      try {
        const repository = await openLocalRepository(accountId);
        const savedDevice = await repository.loadDraft('device');
        const device = savedDevice ? JSON.parse(savedDevice.payload) as string : randomUUID();
        if (!savedDevice) await repository.saveDraft('device', JSON.stringify(device));
        const rows = await repository.cashEntries();
        setRepo(repository); setDeviceId(device); setStored(rows);
      } catch { setError('Unable to open saved cash entries. Retry before recording anything new.'); }
    });
  }, [accountId]);
  useFocusEffect(useCallback(() => { loadLocal(); }, [loadLocal]));
  const pending = stored.filter(row => row.status !== 'confirmed' && !savedCashRejection(row));
  function prepare() {
    try {
      setError('');
      if (!summary || page.error) throw new Error('Refresh the drawer before reviewing a new entry.');
      if (action === 'opening' && summary.openingKobo !== null) throw new Error('Opening cash is already recorded. Ask admin about any correction.');
      if (action === 'closing_count' && summary.close) throw new Error('This day is finalized. Admin must reopen it before a recount.');
      const kobo = validateCashEntry(action,amount,method,reason);
      setReview({ kind:'cash',version:1,action:action!,amountKobo:kobo,method:method!,reason:reason.trim(),deviceId,occurredAt:new Date().toISOString(),
        ...(action === 'closing_count' && !isToday ? { businessDate: date } : {}) });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to review entry.'); }
  }
  function submit(operation: { id: string; payload: CashPayload }) {
    if (!repo || locked.current) return;
    locked.current = true; setFrozen(operation); setReview(null); setReceipt(null);
    startTransition(async () => {
      try {
        setError('');
        const result = await submitCashDurably(repo,operation.id,operation.payload,sendCashEntry);
        if (isCashRejection(result)) {
          // Unlock new entry only after the persisted terminal result is reloaded.
          setStored(await repo.cashEntries());
          setFrozen(null); setId(randomUUID()); setAmount(''); setAction(null); setMethod(null); setReason('');
          setError(result.message); page.refresh();
          return;
        }
        setReceipt(result);
        try { setStored(await repo.cashEntries()); } catch { setError('Entry confirmed. Refresh the saved list when available.'); }
      } catch (failure) { setError(`${failure instanceof Error ? failure.message : 'Confirmation unavailable.'} Keep this entry and retry it; do not enter a duplicate.`); }
      finally { locked.current = false; }
    });
  }
  return <>
    <Page workspace={roomy}>
      <DayNavigator selectedDate={date} onChange={showDate} today={today} minDate={minDate} dayStatuses={dayStatuses}
        lastSyncedAt={updatedAt} onRefresh={refreshAll} refreshing={page.loading || collectionsPage.loading || statesPage.loading}
        refreshLabel="Refresh drawer" disabled={busy || !!frozen} />
      {page.error ? <Text accessibilityLiveRegion="polite">{page.error}</Text> : null}
      {!summary && !page.error ? <ActivityIndicator accessibilityLabel="Loading cash drawer" /> : null}

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: tokens.spacing.large }}>
      <View style={{ flex: wide ? 1 : undefined, minWidth: 0, gap: tokens.spacing.large }}>
      {summary ? <>
        <KeyFigure
          label={isToday ? 'Expected cash in the drawer now' : 'Expected cash for this day'}
          kobo={summary.expectedCashKobo}
          unavailable={isToday ? 'Count the opening cash to see the expected balance.' : 'No opening count was recorded.'}
          note={summary.expectedCashKobo === null ? `No opening count has been recorded for ${isToday ? 'today' : 'this day'}.` : 'A calculated balance. Compare it with the closing count below.'}
          breakdown={[
            ...(summary.openingKobo === null ? [] : [{ label: `Opening count · recorded by ${summary.openedByName}`, kobo: summary.openingKobo }]),
            { label: isToday ? 'Cash received today' : 'Cash received', kobo: summary.cashReceivedKobo, operation: 'add' },
            { label: 'Cash expenses', kobo: summary.cashExpensesKobo, operation: 'subtract' },
            { label: 'Cash withdrawals', kobo: summary.cashWithdrawalsKobo, operation: 'subtract' },
          ]}
        />
        <FormSection title="Outside the drawer" description="POS and transfers stay separate from physical cash.">
          <Text variant="titleSmall">Collected today</Text>
          {collectionsPage.error ? <Text accessibilityLiveRegion="polite">Collections could not refresh. {collections ? 'The amounts below are from the previous refresh.' : 'Refresh to load them.'}</Text> : null}
          {collections ? <MetricGrid><CopyableAmount label="POS collected" kobo={collections.posKobo} /><CopyableAmount label="Transfers collected" kobo={collections.transferKobo} /></MetricGrid> : !collectionsPage.error ? <ActivityIndicator accessibilityLabel="Loading noncash collections" /> : null}
          <Text variant="titleSmall">Paid out today</Text>
          <MetricGrid><CopyableAmount label="POS outgoing · outside drawer" kobo={summary.posOutflowKobo} />
          <CopyableAmount label="Transfer outgoing · outside drawer" kobo={summary.transferOutflowKobo} /></MetricGrid>
        </FormSection>
      <ClosingCount summary={summary} />
      <DayStatus summary={summary} admin={admin}
        onFinalize={note => changeDay(() => finalizeCashDay(date, note))}
        onReopen={why => changeDay(() => reopenCashDay(date, why))} />
      <CashActivity entries={entries} loading={page.loading} error={page.error} hasMore={page.hasMore} onLoadMore={page.loadMore} />
      </> : null}
      </View><View style={{ flex: wide ? 1 : undefined, minWidth: 0, gap: tokens.spacing.large }}>
      {error ? <Text accessibilityLiveRegion="assertive">{error}</Text> : null}
      {!repo ? <Button onPress={loadLocal} loading={busy}>Open saved entries</Button> : null}
      {repo && !frozen && !pending.length && !entryOptions.length ? <FormSection title="Record an entry"><Text>Entries for earlier days are read-only. Ask admin if this day needs a closing count.</Text></FormSection> : null}
      {repo && !frozen && !pending.length && entryOptions.length ? <FormSection title={isToday ? 'Record an entry' : `Backfill a closing count · ${readableLagosDate(date)}`}>
        <ChoiceButtons label="Entry type" value={action} options={entryOptions} onChange={value => { if (!busy) { setAction(value); setMethod(value === 'opening' || value === 'closing_count' ? 'cash' : null); setReason(''); } }} />
        <TextInput mode="outlined" label={action === 'closing_count' ? 'Counted cash (₦)' : 'Amount (₦)'} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} disabled={busy} />
        {action === 'opening' ? <Text>Count physical cash before business activity. Zero is allowed. One opening per day.</Text>
        : action === 'closing_count' ? <Text>{isToday ? 'Count every note and coin in the drawer now. Cash only. A new count replaces the earlier one until admin finalizes.' : 'This count is saved for the earlier day and flagged as backfilled.'}</Text> : <>
          <ChoiceButtons label="Payment method" value={method} options={[{value:'cash',label:'Cash'},{value:'pos',label:'POS'},{value:'transfer',label:'Transfer'}]} onChange={value => { if (!busy) setMethod(value); }} />
          <TextInput mode="outlined" label="Reason / description" value={reason} onChangeText={setReason} maxLength={500} disabled={busy} />
        </>}
        <Button mode="contained" disabled={busy || page.loading || !!entryBlocker} accessibilityHint={entryBlocker || undefined} onPress={prepare}>Review entry</Button>
        {entryBlocker ? <Text variant="bodySmall" accessibilityLiveRegion="polite">{entryBlocker}</Text> : null}
      </FormSection> : null}
      {frozen && !receipt ? <Button disabled={busy} loading={busy} onPress={() => submit(frozen)}>Retry this saved entry · {formatNaira(frozen.payload.amountKobo)}</Button> : null}
      {receipt ? <FormSection title="Entry confirmed">
        <Text>{actionLabels[receipt.action]} · {receipt.method.toUpperCase()} · {readableLagosDate(receipt.businessDate)}</Text>
        <CopyableAmount label="Recorded amount" kobo={receipt.amountKobo} /><Text>Recorded by {receipt.recordedByName}</Text>
        {receipt.reviewFlags.length ? <Text>Flagged for admin review.</Text> : null}
        <Button disabled={busy} onPress={() => { setFrozen(null); setReceipt(null); setId(randomUUID()); setAmount(''); setAction(null); setMethod(null); setReason(''); }}>New entry</Button>
      </FormSection> : null}
      <FormSection title="Saved on this device">
        <Button disabled={busy} onPress={loadLocal}>Refresh saved entries</Button>
        {!stored.length ? <Text>Nothing is waiting on this device. Submitted entries stay here until confirmation, even if you close the app.</Text> : null}
        {pending.length ? <Text>Resolve these entries before recording another one on this device.</Text> : null}
        {stored.map(row => { const payload = JSON.parse(row.payload) as CashPayload; const rejection = savedCashRejection(row); return <Card key={row.operation_id} mode="outlined"><Card.Content>
          <Text>{actionLabels[payload.action]} · {formatNaira(payload.amountKobo)} · {rejection ? 'Not recorded' : row.status}</Text>
          <Text>{rejection?.message}</Text>
          {!rejection ? <Button disabled={busy} onPress={() => row.status === 'confirmed' && row.result ? setReceipt(JSON.parse(row.result)) : submit({id:row.operation_id.slice(5),payload})}>{row.status === 'confirmed' ? 'View receipt' : 'Retry saved entry'}</Button> : null}
        </Card.Content></Card>; })}
      </FormSection>
      </View></View>
    </Page>
    <ReviewSheet visible={!!review} title="Review cash entry" onClose={() => setReview(null)}>
      {review ? <><Text variant="titleLarge">{actionLabels[review.action]}{review.businessDate ? ` · ${readableLagosDate(review.businessDate)}` : ''}</Text><CopyableAmount label="Amount" kobo={review.amountKobo} />
        <Text>{review.method.toUpperCase()}</Text><Text>{review.reason || (review.action === 'opening' ? 'Opening physical cash' : 'Physical cash counted in the drawer')}</Text>
        <Text>{review.action === 'opening' ? 'Record the opening count once for today.' : review.action === 'closing_count' ? 'Everyone will see this count and its difference. It replaces any earlier count until admin finalizes the day.' : 'Confirm the money actually paid out. This entry is kept for the shared records.'}</Text>
        <Button mode="contained" disabled={busy} onPress={() => submit({id,payload:review})}>Confirm entry</Button></> : null}
    </ReviewSheet>
  </>;
}
