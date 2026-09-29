import { WorkspaceTable } from '@/components/ui/workspace-table';
import { DayNavigator } from '@/components/ui/day-navigator';
import { useWorkspaceLayout } from '@/hooks/use-workspace-layout';
import { use, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Text } from 'react-native-paper';

import { CopyableAmount } from '@/components/ui/copyable-amount';
import { MetricGrid } from '@/components/ui/metric-grid';
import { StatusChip, type ChipTone } from '@/components/ui/status-chip';
import { Page } from '@/components/ui/page';
import { ReviewSheet } from '@/components/ui/review-sheet';
import { AuthProfile } from '@/features/auth/auth-gate';
import { formatNaira } from '@/features/sales/domain/money';
import { useFocusedPage } from '@/hooks/use-focused-page';
import { tokens } from '@/theme/tokens';
import { addDays, lagosTime, todayLagos } from './lagos-date';
import { fetchDayTotals, fetchSaleItems, fetchSalePayments, fetchSalesForDate, type DayTotals, type SaleItemRow, type SalePaymentRow, type SaleSummary } from './records-service';

async function readRecords(date: string, offset: number, signal: AbortSignal) {
  const page = await fetchSalesForDate(date, offset, signal);
  return { items: page.sales, hasMore: page.hasMore };
}
// Server-side day totals, complete regardless of how many rows are paged into the list.
async function readDayTotals(date: string, _offset: number, signal: AbortSignal) {
  return { items: [await fetchDayTotals(date, signal)], hasMore: false };
}

const STATE_LABEL: Record<SaleSummary['state'], { label: string; tone: ChipTone }> = {
  paid: { label: 'Paid', tone: 'settled' },
  part: { label: 'Part paid', tone: 'owing' },
  unpaid: { label: 'Unpaid', tone: 'owing' },
  void: { label: 'Void', tone: 'neutral' },
};

export default function RecordsScreen() {
  const { desktop, roomy } = useWorkspaceLayout();
  const profile = use(AuthProfile);
  const today = todayLagos();
  const [date, setDate] = useState(today);
  const { items: sales, error, loading, hasMore, refresh, loadMore, updatedAt } = useFocusedPage(date, readRecords);
  const totalsPage = useFocusedPage(date, readDayTotals);
  const totals: DayTotals | undefined = totalsPage.items?.[0];
  const [detail, setDetail] = useState<SaleSummary | null>(null);
  function refreshAll() { totalsPage.refresh(); refresh(); }

  const staffLimited = profile?.role !== 'admin';

  return <>
    <Page workspace={roomy}>
      <DayNavigator selectedDate={date} onChange={setDate} today={today} minDate={staffLimited ? addDays(today, -6) : undefined}
        lastSyncedAt={updatedAt} onRefresh={refreshAll} refreshing={loading || totalsPage.loading} refreshLabel="Refresh records" />
      {staffLimited ? <Text variant="labelMedium">This view shows today plus the six preceding days. Find an older invoice from Customers instead.</Text> : null}
      {sales && sales.length ? <>
        {totalsPage.error
          ? <Card mode="outlined"><Card.Content style={{ gap: tokens.spacing.small }}><Text variant="labelLarge">Day totals</Text><Text>{totalsPage.error}</Text><Button onPress={totalsPage.refresh} disabled={totalsPage.loading}>Retry</Button></Card.Content></Card>
          : totals ? <MetricGrid>
            <Card mode="outlined"><Card.Content><CopyableAmount label="Billed" kobo={totals.billedKobo} emphasis /></Card.Content></Card>
            <Card mode="outlined"><Card.Content><CopyableAmount label="Collected against these invoices" kobo={totals.collectedKobo} emphasis /></Card.Content></Card>
            <Card mode="outlined"><Card.Content><CopyableAmount label="Still owed on them" kobo={totals.outstandingKobo} emphasis /></Card.Content></Card>
          </MetricGrid> : <ActivityIndicator accessibilityLabel="Loading day totals" />}
        <Text variant="bodySmall">{hasMore
          ? `Totals above cover the whole day; the list shows the first ${sales.length} invoices. Load more to see the rest.`
          : `${sales.length} ${sales.length === 1 ? 'invoice' : 'invoices'} on this date.`}</Text>
      </> : null}
      {!sales && !error ? <ActivityIndicator accessibilityLabel="Loading records" /> : null}
      {error ? <><Text accessibilityLiveRegion="polite">{error}</Text><Button onPress={refresh}>Retry</Button></> : null}
      {sales && !sales.length && !loading && !error ? <Text>No sales recorded for this date.</Text> : null}
      {desktop ? <Card mode="outlined"><WorkspaceTable rows={sales ?? []} rowKey={sale => sale.id} rowLabel={sale => `Open invoice ${sale.invoiceNumber}, ${sale.customerName}, ${STATE_LABEL[sale.state].label}`} onOpen={setDetail} columns={[
        { key: 'invoice', title: 'Invoice', weight: 0.7, render: sale => <Text style={{ fontVariant: ['tabular-nums'], fontWeight: '600' }}>#{sale.invoiceNumber}</Text> },
        { key: 'customer', title: 'Customer', weight: 2, render: sale => <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.small, flexWrap: 'wrap' }}><Text>{sale.customerName}</Text>{sale.reviewFlags.length ? <StatusChip label="Flagged for review" tone="caution" /> : null}</View> },
        { key: 'time', title: 'Time', weight: 0.7, render: sale => <Text style={{ fontVariant: ['tabular-nums'] }}>{lagosTime(sale.createdAt)}</Text> },
        { key: 'total', title: 'Total', weight: 1.4, numeric: true, render: sale => <Text selectable style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>{formatNaira(sale.totalKobo)}</Text> },
        { key: 'balance', title: 'Balance', weight: 1.4, numeric: true, render: sale => <Text selectable style={{ textAlign: 'right', fontVariant: ['tabular-nums'], fontWeight: sale.state === 'paid' ? '400' : '600' }}>{formatNaira(sale.balanceKobo)}</Text> },
        { key: 'status', title: 'Status', weight: 1.2, render: sale => <StatusChip label={STATE_LABEL[sale.state].label} tone={STATE_LABEL[sale.state].tone} /> },
      ]} /></Card> : sales?.map(sale => <Card accessibilityRole="button" key={sale.id} mode="outlined" onPress={() => setDetail(sale)}>
        <Card.Content style={{ gap: tokens.spacing.small }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.small }}>
            <Text variant="titleMedium" style={{ fontVariant: ['tabular-nums'] }}>#{sale.invoiceNumber}</Text>
            <Text variant="titleMedium" style={{ flex: 1 }} numberOfLines={1}>{sale.customerName}</Text>
            <StatusChip label={STATE_LABEL[sale.state].label} tone={STATE_LABEL[sale.state].tone} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text variant="bodySmall">{lagosTime(sale.createdAt)}</Text>
            <Text selectable variant="titleMedium" style={{ fontVariant: ['tabular-nums'] }}>{formatNaira(sale.totalKobo)}</Text>
          </View>
          {sale.state === 'paid' ? null : <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text variant="bodySmall">Balance</Text>
            <Text selectable style={{ fontVariant: ['tabular-nums'], fontWeight: '600' }}>{formatNaira(sale.balanceKobo)}</Text>
          </View>}
          {sale.reviewFlags.length ? <StatusChip label="Flagged for review" tone="caution" /> : null}
        </Card.Content>
      </Card>)}
      {hasMore ? <Button loading={loading} disabled={loading} onPress={loadMore}>Load more</Button> : null}
      {loading && sales ? <Text accessibilityLiveRegion="polite">Refreshing records…</Text> : null}
    </Page>
    <SaleDetailSheet sale={detail} onClose={() => setDetail(null)} />
  </>;
}

function SaleDetailSheet({ sale, onClose }: { sale: SaleSummary | null; onClose: () => void }) {
  return <ReviewSheet visible={!!sale} title={sale ? `Invoice #${sale.invoiceNumber}` : ''} onClose={onClose}>
    {sale ? <SaleDetailContent key={sale.id} sale={sale} onClose={onClose} /> : null}
  </ReviewSheet>;
}

function SaleDetailContent({ sale, onClose }: { sale: SaleSummary; onClose: () => void }) {
  const [items, setItems] = useState<SaleItemRow[] | null>(null);
  const [payments, setPayments] = useState<SalePaymentRow[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([fetchSaleItems(sale.id), fetchSalePayments(sale.id)])
      .then(([nextItems, nextPayments]) => { setItems(nextItems); setPayments(nextPayments); })
      .catch(failure => setError(failure instanceof Error ? failure.message : 'Unable to load invoice detail.'));
  }, [sale.id]);
  const receivedKobo = payments?.reduce((sum, payment) => (BigInt(sum) + BigInt(payment.amountKobo)).toString(), '0') ?? null;
  return <>
    <Text variant="titleMedium">{sale.customerName}</Text>
    <Text selectable>{sale.customerPhone || 'No phone on file'}</Text>
    {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
    {!items && !error ? <ActivityIndicator accessibilityLabel="Loading invoice items" /> : items?.map(item => <View key={item.position} style={{ gap: tokens.spacing.small }}>
      <Text selectable>{item.position}. {item.materialName} · {item.width} × {item.height} {item.unit === 'in' ? 'inches' : 'feet'} · Qty {item.quantity}</Text>
      <View style={{ flexDirection: 'row', gap: tokens.spacing.large, flexWrap: 'wrap' }}><CopyableAmount label="Calculated" kobo={item.calculatedKobo} /><CopyableAmount label="Charge" kobo={item.chargedKobo} /></View>
      <Divider />
    </View>)}
    {sale.status === 'open' ? <Button mode="contained" onPress={() => { onClose(); router.navigate({ pathname: '/payments', params: { customerId: sale.customerId, saleId: sale.id, entry: randomUUID() } }); }}>Pay this invoice</Button> : null}
    <CopyableAmount label="Total" kobo={sale.totalKobo} />
    {receivedKobo !== null ? <CopyableAmount label="Received" kobo={receivedKobo} /> : null}
    {payments?.map((payment, index) => <Text key={index} selectable>{formatNaira(payment.amountKobo)} · {payment.method}</Text>)}
  </>;
}
