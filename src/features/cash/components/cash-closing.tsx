import { useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { ActionButton } from '@/components/ui/action-button';
import { CopyableAmount } from '@/components/ui/copyable-amount';
import { FormSection } from '@/components/ui/form-section';
import { MetricGrid } from '@/components/ui/metric-grid';
import { ReviewSheet } from '@/components/ui/review-sheet';
import { StatusChip, type ChipTone } from '@/components/ui/status-chip';
import { StatusNote } from '@/components/ui/status-note';
import { lagosTime, readableLagosDate } from '@/features/records/lagos-date';
import { formatNaira } from '@/features/sales/domain/money';
import { tokens } from '@/theme/tokens';
import type { CashFigures, CashSummary } from '../cash-service';

/** Counted minus expected, in words people use at the drawer. Null when either side is missing. */
export function differenceWords(differenceKobo: string | null): { label: string; kobo: string; tone: ChipTone } | null {
  if (differenceKobo === null) return null;
  if (differenceKobo === '0') return { label: 'Balanced', kobo: '0', tone: 'settled' };
  return differenceKobo.startsWith('-')
    ? { label: 'Short by', kobo: differenceKobo.slice(1), tone: 'owing' }
    : { label: 'Over by', kobo: differenceKobo, tone: 'settled' };
}

/** The day's state for chips: finalized days that changed afterwards need admin review. */
export function dayState(summary: CashSummary): { label: string; tone: ChipTone } {
  if (!summary.close) return { label: 'Open · not finalized', tone: 'neutral' };
  return summary.close.needsReview ? { label: 'Needs review', tone: 'caution' } : { label: 'Finalized', tone: 'settled' };
}

function Difference({ figures }: { figures: CashFigures }) {
  const difference = differenceWords(figures.differenceKobo);
  if (!difference) return <Text variant="bodySmall">{figures.countedKobo === null ? 'No closing count yet.' : 'Difference unavailable: no opening count was recorded for this day.'}</Text>;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.small }}>
    <StatusChip label={difference.label} tone={difference.tone} />
    {difference.kobo !== '0' ? <CopyableAmount label="Difference" kobo={difference.kobo} emphasis /> : null}
  </View>;
}

function Arithmetic({ figures }: { figures: CashFigures }) {
  const theme = useTheme();
  const rows = [
    ['Opening count', figures.openingKobo, ''], ['Cash received', figures.cashReceivedKobo, '+ '],
    ['Cash expenses', figures.cashExpensesKobo, '− '], ['Cash withdrawals', figures.cashWithdrawalsKobo, '− '],
    ['Expected cash', figures.expectedCashKobo, ''], ['Counted (latest)', figures.countedKobo, ''],
  ] as const;
  return <View style={{ gap: tokens.spacing.extraSmall }}>{rows.map(([label, kobo, sign]) =>
    <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: tokens.spacing.medium }}>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <Text selectable variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>{kobo === null ? 'Not recorded' : `${sign}${formatNaira(kobo)}`}</Text>
    </View>)}</View>;
}

export function ClosingCount({ summary }: { summary: CashSummary }) {
  const theme = useTheme();
  return <FormSection title="Closing count" description="Anyone can recount until admin finalizes the day. The latest count is used." trailing={<StatusChip {...dayState(summary)} />}>
    <MetricGrid>
      {summary.expectedCashKobo === null ? <View><Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Expected cash</Text><Text variant="titleMedium">No opening count</Text></View> : <CopyableAmount label="Expected cash" kobo={summary.expectedCashKobo} />}
      {summary.countedKobo === null ? <View><Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Counted</Text><Text variant="titleMedium">Not counted yet</Text></View> : <CopyableAmount label={`Counted · ${summary.countedByName}, ${lagosTime(summary.countedAt ?? '')}`} kobo={summary.countedKobo} />}
    </MetricGrid>
    <Difference figures={summary} />
    {summary.counts.length ? <View style={{ gap: tokens.spacing.small, borderTopWidth: 1, borderColor: theme.colors.outlineVariant, paddingTop: tokens.spacing.medium }}>
      <Text variant="titleSmall">Counts for this day</Text>
      {summary.counts.map((count, index) => <View key={count.entryId} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.small }}>
        <Text style={{ flexGrow: 1, flexShrink: 1 }}>{lagosTime(count.occurredAt)} · {count.recordedByName}</Text>
        {count.reviewFlags.includes('backfilled_count') ? <StatusChip label="Backfilled" tone="caution" /> : null}
        <StatusChip label={index === 0 ? 'Used' : 'Replaced'} tone={index === 0 ? 'settled' : 'neutral'} />
        <Text selectable style={{ fontVariant: ['tabular-nums'], minWidth: tokens.controls.dateLabelMinWidth, textAlign: 'right' }}>{formatNaira(count.amountKobo)}</Text>
      </View>)}
    </View> : null}
  </FormSection>;
}

type SheetMode = 'finalize' | 'reopen' | null;
export function DayStatus({ summary, admin, onFinalize, onReopen }: {
  summary: CashSummary; admin: boolean;
  onFinalize: (note: string) => Promise<void>; onReopen: (reason: string) => Promise<void>;
}) {
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = summary.close;
  const noteRequired = sheet === 'finalize' && summary.openingKobo === null;
  const blocker = sheet === 'reopen' && !text.trim() ? 'Enter the reason for reopening.'
    : noteRequired && !text.trim() ? 'Add a note explaining the missing opening count.'
    : text.trim().length > 500 ? 'Keep the note to 500 characters.' : '';
  function open(mode: SheetMode) { setText(''); setError(''); setSheet(mode); }
  async function confirm() {
    if (busy || blocker) return;
    setBusy(true); setError('');
    try { await (sheet === 'finalize' ? onFinalize(text) : onReopen(text)); setSheet(null); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'The day did not change. Refresh and try again.'); }
    finally { setBusy(false); }
  }
  const difference = close ? differenceWords(close.snapshot.differenceKobo) : null;
  return <>
    <FormSection title="Day status" trailing={<StatusChip {...dayState(summary)} />}>
      {close ? <>
        <Text>Finalized by {close.finalizedByName} at {lagosTime(close.finalizedAt)}{close.finalizedAt.slice(0, 10) !== summary.date ? ` on ${readableLagosDate(close.finalizedAt.slice(0, 10))}` : ''}. Snapshot: expected {close.snapshot.expectedCashKobo === null ? 'unavailable' : formatNaira(close.snapshot.expectedCashKobo)}, counted {close.snapshot.countedKobo === null ? '—' : formatNaira(close.snapshot.countedKobo)}{difference ? `, ${difference.label.toLowerCase()}${difference.kobo === '0' ? '' : ` ${formatNaira(difference.kobo)}`}` : ''}.</Text>
        {close.note ? <Text selectable>Note: {close.note}</Text> : null}
        {close.needsReview ? <StatusNote attention message={`${close.lateEntryCount} ${close.lateEntryCount === 1 ? 'entry was' : 'entries were'} added for this day after finalization.${close.expectedChangeKobo && close.expectedChangeKobo !== '0' ? ` Expected cash has changed by ${close.expectedChangeKobo.startsWith('-') ? '− ' + formatNaira(close.expectedChangeKobo.slice(1)) : '+ ' + formatNaira(close.expectedChangeKobo)} since the snapshot.` : ''} The saved snapshot does not change${admin ? '. Reopen the day to recount and finalize again.' : '. Admin will review it.'}`} /> : null}
        {admin ? <ActionButton mode="outlined" onPress={() => open('reopen')}>Reopen day</ActionButton> : null}
      </> : <>
        <Text>{admin ? 'Finalize once the closing count is right. This saves the figures as the day’s close.' : 'Admin finalizes the day after the closing count.'}</Text>
        {admin ? <ActionButton mode="contained" disabled={summary.countedKobo === null} onPress={() => open('finalize')}>Finalize day</ActionButton> : null}
        {admin && summary.countedKobo === null ? <Text variant="bodySmall">Record a closing count before finalizing.</Text> : null}
      </>}
      {summary.reopenHistory.length ? <View style={{ gap: tokens.spacing.extraSmall }}>
        <Text variant="titleSmall">Reopened before</Text>
        {summary.reopenHistory.map(item => <Text key={item.closeId} variant="bodySmall">Finalized by {item.finalizedByName} at {lagosTime(item.finalizedAt)}; reopened by {item.reopenedByName} at {lagosTime(item.reopenedAt)}: {item.reason}</Text>)}
      </View> : null}
    </FormSection>
    <ReviewSheet visible={sheet !== null} title={sheet === 'finalize' ? `Finalize ${readableLagosDate(summary.date)}` : `Reopen ${readableLagosDate(summary.date)}`} onClose={() => { if (!busy) setSheet(null); }}>
      {sheet === 'finalize' ? <>
        <Arithmetic figures={summary} />
        <Difference figures={summary} />
        <Text variant="bodySmall">This saves the figures above as the day’s close. Entries added for this day later mark it Needs review instead of changing it. Entries still waiting on other devices are not included.</Text>
      </> : <Text>Reopening keeps the current finalization in the history with your reason. Staff can then recount, and you can finalize again.</Text>}
      <TextInput mode="outlined" label={sheet === 'reopen' ? 'Reason (required)' : noteRequired ? 'Note (required: no opening count)' : 'Note (optional)'} value={text} onChangeText={setText} maxLength={500} multiline disabled={busy} />
      {blocker && text ? <Text variant="bodySmall">{blocker}</Text> : null}
      {error ? <StatusNote attention message={error} /> : null}
      <ActionButton mode="contained" loading={busy} disabled={busy || !!blocker} accessibilityHint={blocker || undefined} onPress={confirm}>{sheet === 'finalize' ? 'Finalize day' : 'Reopen day'}</ActionButton>
    </ReviewSheet>
  </>;
}
