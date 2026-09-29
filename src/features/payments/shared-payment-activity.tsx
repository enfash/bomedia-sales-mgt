import { RefreshControl } from '@/components/ui/refresh-control';
import { useWorkspaceLayout } from '@/hooks/use-workspace-layout';
import { DateNavigator } from '@/components/ui/date-navigator';
import { WorkspaceTable } from '@/components/ui/workspace-table';
import { PaymentAllocationSummary } from './components/payment-allocation-summary';
import { StatusChip } from '@/components/ui/status-chip';
import { WorkspaceToolbar } from '@/components/ui/workspace-toolbar';
import { use, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Button, Card, Text } from 'react-native-paper';
import { AuthProfile } from '@/features/auth/auth-gate';
import { CopyableAmount } from '@/components/ui/copyable-amount';
import { ReviewSheet } from '@/components/ui/review-sheet';
import { FormSection } from '@/components/ui/form-section';
import { KeyFigure } from '@/components/ui/key-figure';
import { StatusNote } from '@/components/ui/status-note';
import { useFocusedPage } from '@/hooks/use-focused-page';
import { tokens } from '@/theme/tokens';
import { addDays, lagosTime, readableLagosDate, todayLagos } from '@/features/records/lagos-date';
import { formatNaira } from '@/features/sales/domain/money';
import { readPaymentActivity, type ActivityReceipt } from './activity-service';

async function readAdminReview(key: string, offset: number, signal: AbortSignal) {
  return key === 'disabled' ? { items: [], hasMore: false } : readPaymentActivity(key, offset, signal);
}

export function SharedPaymentActivity({ revision }: { revision: string }) {
  const { desktop } = useWorkspaceLayout();
  const profile = use(AuthProfile);
  const today = todayLagos();
  const [date, setDate] = useState(today);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [selected, setSelected] = useState<ActivityReceipt | null>(null);
  const admin = profile?.role === 'admin';
  const page = useFocusedPage(`${date}|${reviewOnly ? 'review' : 'day'}|${revision}`, readPaymentActivity);
  const reviewPage = useFocusedPage(admin ? `${today}|review|${revision}` : 'disabled', readAdminReview);
  const reviewTotals = reviewPage.items?.[0];
  const totals = page.items?.at(-1);
  const receipts = [...new Map(page.items?.flatMap(item => item.receipts).map(receipt => [receipt.id, receipt]) ?? []).values()];
  // Exact kobo addition of the server's own method totals; no float, no rounding.
  const receivedKobo = totals ? (BigInt(totals.cashKobo) + BigInt(totals.posKobo) + BigInt(totals.transferKobo)).toString() : '0';
  return <>
    {admin && !reviewOnly && reviewTotals && BigInt(reviewTotals.unappliedKobo) > 0n ? <StatusNote attention message={`${reviewTotals.count} ${reviewTotals.count === '1' ? 'receipt has' : 'receipts have'} ${formatNaira(reviewTotals.unappliedKobo)} unapplied across all dates.${reviewTotals.receipts[0] ? ` Most recent: ${reviewTotals.receipts[0].customerName}, ${readableLagosDate(reviewTotals.receipts[0].businessDate)}.` : ''}`} action={<Button onPress={() => setReviewOnly(true)}>Review</Button>} /> : null}
    {admin && reviewPage.error ? <StatusNote attention message="Unapplied receipts could not refresh. Review unapplied money to check for receipts needing attention." /> : null}
    <FormSection title={reviewOnly ? 'Unapplied receipts · all dates' : 'Confirmed collections'} description="Shared across the business. Refresh to see newer receipts.">
      <WorkspaceToolbar>
      {!reviewOnly ? <DateNavigator date={date} today={today} minDate={admin ? undefined : addDays(today, -6)} onChange={setDate} /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.small }}>
        {admin ? <Button onPress={() => setReviewOnly(value => !value)}>{reviewOnly ? 'Show daily collections' : 'Review unapplied money'}</Button> : null}
        <RefreshControl label="Refresh payments" updatedLabel={page.updatedAt ? lagosTime(page.updatedAt) : undefined} loading={page.loading || reviewPage.loading} onRefresh={() => { page.refresh(); reviewPage.refresh(); }} />
      </View></WorkspaceToolbar>
      {page.error ? <Text accessibilityLiveRegion="polite">{page.error}</Text> : null}
      {!page.items && !page.error ? <ActivityIndicator accessibilityLabel="Loading confirmed payments" /> : null}
      {totals ? <>
        {BigInt(totals.unappliedKobo) > 0n && (!admin || reviewOnly) ? <StatusNote attention message={`${formatNaira(totals.unappliedKobo)} received here could not be applied to an invoice. An admin needs to decide where it goes.`} /> : null}
        <KeyFigure
          label={reviewOnly ? 'Received on unapplied receipts · all dates' : 'Received on this date · all methods'}
          kobo={receivedKobo}
          note={`${totals.count} confirmed ${totals.count === '1' ? 'receipt' : 'receipts'}${page.loading ? ' · refreshing…' : ''}. Initial and debt payments together; cash here is not the drawer balance.`}
          breakdown={[
            { label: 'Cash · goes into the drawer', kobo: totals.cashKobo },
            { label: 'POS · settles to the bank', kobo: totals.posKobo },
            { label: 'Transfer · straight to the bank', kobo: totals.transferKobo },
          ]}
        />
      </> : null}
      {page.items && !receipts.length ? <Text>{reviewOnly ? 'No unapplied receipts.' : 'No receipts for this date.'}</Text> : null}
      {desktop ? <WorkspaceTable rows={receipts} rowKey={receipt => receipt.id} rowLabel={receipt => `View receipt for ${receipt.customerName}`} onOpen={setSelected} columns={[
        { key: 'time', title: reviewOnly ? 'Date / time' : 'Time', weight: reviewOnly ? 1.3 : 0.7, render: receipt => <View>{reviewOnly ? <Text variant="labelSmall">{receipt.businessDate}</Text> : null}<Text style={{ fontVariant: ['tabular-nums'] }}>{lagosTime(receipt.occurredAt)}</Text></View> },
        { key: 'customer', title: 'Customer', weight: 1.8, render: receipt => <Text>{receipt.customerName}</Text> },
        { key: 'collector', title: 'Collected by', render: receipt => <Text>{receipt.collectedByName}</Text> },
        { key: 'method', title: 'Method', weight: 1.2, render: receipt => <StatusChip label={receipt.method.toUpperCase()} /> },
        { key: 'amount', title: 'Received', numeric: true, weight: 1.4, render: receipt => <Text selectable style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>{formatNaira(receipt.amountKobo)}</Text> },
        { key: 'applied', title: 'Applied to', weight: 1.4, render: receipt => <PaymentAllocationSummary receipt={receipt} /> },
      ]} /> : receipts.map(receipt => <Card key={receipt.id} mode="outlined" onPress={() => setSelected(receipt)}><Card.Content style={{ gap: tokens.spacing.small }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: tokens.spacing.small }}><Text variant="titleMedium" style={{ flexShrink: 1 }}>{receipt.customerName}</Text><StatusChip label={receipt.method.toUpperCase()} /></View>
        <Text selectable variant="titleMedium" style={{ fontVariant: ['tabular-nums'] }}>{formatNaira(receipt.amountKobo)}</Text>
        <Text>Collected by {receipt.collectedByName} · {reviewOnly ? `${receipt.businessDate} · ` : ''}{lagosTime(receipt.occurredAt)}</Text>
        <PaymentAllocationSummary receipt={receipt} />
      </Card.Content></Card>)}
      {page.hasMore ? <Button disabled={page.loading} onPress={page.loadMore}>Load more receipts</Button> : null}
    </FormSection>
    <ReviewSheet visible={!!selected} title="Confirmed receipt" onClose={() => setSelected(null)}>
      {selected ? <>
        <Text variant="titleLarge">{selected.customerName}</Text>
        <CopyableAmount label="Received" kobo={selected.amountKobo} />
        <Text>{selected.method.toUpperCase()} · Collected by {selected.collectedByName}</Text>
        <Text selectable>Receipt {selected.id}</Text>
        <Text>Collected: {new Date(selected.occurredAt).toLocaleString()}</Text>
        <Text>Confirmed by server: {new Date(selected.receivedAt).toLocaleString()}</Text>
        {selected.allocations.map((allocation, index) => <Text key={index}>Invoice #{allocation.invoiceNumber}: {formatNaira(allocation.amountKobo)}</Text>)}
        {BigInt(selected.unappliedKobo) > 0n ? <><CopyableAmount label="Unapplied" kobo={selected.unappliedKobo} /><Text>This money is recorded once. Admin resolution is not available yet; do not record it again.</Text></> : null}
        {selected.reviewFlags.length ? <Text>Flagged for admin review.</Text> : null}
      </> : null}
    </ReviewSheet>
  </>;
}
