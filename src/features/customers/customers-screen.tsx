import { RefreshControl } from '@/components/ui/refresh-control';
import { lagosTime, readableLagosDate } from '@/features/records/lagos-date';
import { WorkspaceToolbar } from '@/components/ui/workspace-toolbar';
import { useWorkspaceLayout } from '@/hooks/use-workspace-layout';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { Pressable, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';

import { CopyableAmount } from '@/components/ui/copyable-amount';
import { KeyFigure } from '@/components/ui/key-figure';
import { StatusChip } from '@/components/ui/status-chip';
import { Page } from '@/components/ui/page';
import { ReviewSheet } from '@/components/ui/review-sheet';
import { formatNaira } from '@/features/sales/domain/money';
import { useFocusedPage } from '@/hooks/use-focused-page';
import { tokens } from '@/theme/tokens';
import { fetchCustomerBalances, fetchDebtTotals, fetchOutstandingSales, type CustomerBalance, type CustomerSort, type OutstandingSale } from './customers-service';

// The list key carries both the sort and the search so a sort change invalidates and
// refetches the page from offset 0, keeping server-side ordering honest across pages.
const KEY_SEP = '\u0001';
async function readCustomers(key: string, offset: number, signal: AbortSignal) {
  const sep = key.indexOf(KEY_SEP);
  const sort = key.slice(0, sep) as CustomerSort;
  const query = key.slice(sep + 1);
  const page = await fetchCustomerBalances(query, sort, offset, signal);
  return { items: page.customers, hasMore: page.hasMore };
}
async function readTotals(_key: string, _offset: number, signal: AbortSignal) {
  return { items: [await fetchDebtTotals(signal)], hasMore: false };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
}

function owes(customer: CustomerBalance) { return BigInt(customer.balanceKobo) > BigInt(0); }
function openLabel(customer: CustomerBalance) {
  const n = customer.openInvoiceCount;
  const count = `${n} open ${n === 1 ? 'invoice' : 'invoices'}`;
  return customer.oldestUnpaidDate ? `${count} · oldest ${readableLagosDate(customer.oldestUnpaidDate)}` : count;
}

const SORTS: { value: CustomerSort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'balance', label: 'Balance' },
  { value: 'oldest', label: 'Oldest debt' },
];

export default function CustomersScreen() {
  const theme = useTheme();
  const { desktop, roomy } = useWorkspaceLayout();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CustomerSort>('name');
  const [selected, setSelected] = useState<CustomerBalance | null>(null);
  const totalsPage = useFocusedPage('totals', readTotals);
  const totals = totalsPage.items?.[0];
  const totalsError = totalsPage.error;
  const { items: customers, error, loading, hasMore, refresh, loadMore, updatedAt } = useFocusedPage(sort + KEY_SEP + search, readCustomers, 250);
  function refreshAll() { totalsPage.refresh(); refresh(); }

  return <>
    <Page workspace={roomy}>
      {totalsError
        ? <Card mode="outlined"><Card.Content style={{ gap: tokens.spacing.small }}><Text variant="labelLarge">Total outstanding debt</Text><Text>{totalsError}</Text><Button onPress={totalsPage.refresh} disabled={totalsPage.loading}>Retry</Button></Card.Content></Card>
        : totals
          ? <View style={{ flexDirection: desktop ? 'row' : 'column', gap: tokens.spacing.medium, alignItems: 'stretch' }}>
              <View style={{ flex: 1, minWidth: 0 }}><KeyFigure label="Total outstanding debt" kobo={totals.totalDebtKobo} note={`Owed across ${totals.customerCount} ${totals.customerCount === 1 ? 'customer' : 'customers'}.`} /></View>
              <Card mode="outlined" style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}><Card.Content style={{ gap: tokens.spacing.small }}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Oldest unpaid</Text>
                <Text variant="headlineSmall">{totals.oldestUnpaidDate ? readableLagosDate(totals.oldestUnpaidDate) : 'None outstanding'}</Text>
                <Text variant="labelSmall">{totals.oldestUnpaidDate ? 'Earliest date money is still owed.' : 'No open balances right now.'}</Text>
              </Card.Content></Card>
            </View>
          : <ActivityIndicator accessibilityLabel="Loading customer totals" />}
      {loading || totalsPage.loading ? <Text accessibilityLiveRegion="polite">Refreshing… Previous balances may have changed.</Text> : <Text variant="labelSmall">Balances from the last refresh. Refresh to check for newer payments or sales.</Text>}
      <WorkspaceToolbar><TextInput style={{ flexGrow: 1, minWidth: 220 }} mode="outlined" label="Search customers by name or phone" value={search} onChangeText={setSearch} />
      <RefreshControl label="Refresh balances" updatedLabel={updatedAt && totalsPage.updatedAt ? lagosTime(updatedAt < totalsPage.updatedAt ? updatedAt : totalsPage.updatedAt) : undefined} loading={loading || totalsPage.loading} onRefresh={refreshAll} /></WorkspaceToolbar>
      <SegmentedButtons density="small" value={sort} onValueChange={value => setSort(value as CustomerSort)} buttons={SORTS.map(option => ({ value: option.value, label: option.label }))} />
      {!customers && !error ? <ActivityIndicator accessibilityLabel="Loading customers" /> : null}
      {error ? <><Text accessibilityLiveRegion="polite">{error}</Text><Button onPress={refresh}>Retry</Button></> : null}
      {customers && !customers.length && !loading && !error ? <Text>No customers match this search.</Text> : null}
      {desktop ? <Card mode="outlined">
        {/* Plain rows, not DataTable.Row: Paper wraps every row in a TouchableRipple,
            which is a <button> on web, so a row action inside one nests buttons. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.spacing.medium, paddingVertical: tokens.spacing.small + 2, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }}>
          <Text variant="labelMedium" style={{ flex: 3, color: theme.colors.onSurfaceVariant }}>Customer</Text>
          <Text variant="labelMedium" style={{ flex: 1.4, color: theme.colors.onSurfaceVariant }}>Phone</Text>
          <Text variant="labelMedium" style={{ flex: 0.9, textAlign: 'right', color: theme.colors.onSurfaceVariant }}>Open</Text>
          <Text variant="labelMedium" style={{ flex: 1.5, textAlign: 'right', color: theme.colors.onSurfaceVariant }}>Outstanding</Text>
          <Text variant="labelMedium" style={{ width: tokens.controls.rowActionWidth, textAlign: 'right', color: theme.colors.onSurfaceVariant }}>Action</Text>
        </View>
        {customers?.map(customer => <View key={customer.id} style={{ flexDirection: 'row', alignItems: 'center', minHeight: tokens.layout.touchTarget, paddingHorizontal: tokens.spacing.medium, paddingVertical: tokens.spacing.small, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`View ${customer.name} outstanding invoices`} onPress={() => setSelected(customer)} style={{ flex: 3, flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.small, minHeight: tokens.layout.touchTarget }}>
            <Avatar.Text size={tokens.avatar.compact} label={initials(customer.name)} style={{ backgroundColor: theme.colors.surfaceVariant }} labelStyle={{ ...theme.fonts.labelMedium, color: theme.colors.onSurfaceVariant }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: theme.colors.primary, textDecorationLine: 'underline' }} numberOfLines={1}>{customer.name}</Text>
              {customer.oldestUnpaidDate ? <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>Oldest unpaid {readableLagosDate(customer.oldestUnpaidDate)}</Text> : null}
            </View>
          </Pressable>
          <Text style={{ flex: 1.4, fontVariant: ['tabular-nums'] }} numberOfLines={1}>{customer.phone || 'No phone saved'}</Text>
          <Text style={{ flex: 0.9, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{customer.openInvoiceCount || '—'}</Text>
          <Text selectable style={{ flex: 1.5, textAlign: 'right', fontVariant: ['tabular-nums'], fontWeight: '600' }}>{owes(customer) ? formatNaira(customer.balanceKobo) : 'Paid up'}</Text>
          <View style={{ width: tokens.controls.rowActionWidth, alignItems: 'flex-end' }}>
            {owes(customer)
              ? <Button compact mode="outlined" onPress={() => router.navigate({ pathname: '/payments', params: { customerId: customer.id, saleId: '', entry: randomUUID() } })} accessibilityLabel={`Record a payment from ${customer.name}`}>Record payment</Button>
              : <StatusChip label="Settled" tone="settled" />}
          </View>
        </View>)}
      </Card> : customers?.map(customer => <Card key={customer.id} mode="outlined">
        <Card.Content style={{ gap: tokens.spacing.small }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`View ${customer.name} outstanding invoices`} onPress={() => setSelected(customer)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: tokens.spacing.small, minHeight: tokens.layout.touchTarget }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.small, flex: 1, minWidth: 0 }}>
              <Avatar.Text size={tokens.avatar.comfortable} label={initials(customer.name)} style={{ backgroundColor: theme.colors.surfaceVariant }} labelStyle={{ ...theme.fonts.labelLarge, color: theme.colors.onSurfaceVariant }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="titleMedium" numberOfLines={1}>{customer.name}</Text>
                <Text variant="bodySmall" style={{ fontVariant: ['tabular-nums'] }}>{customer.phone || 'No phone saved'}</Text>
                {owes(customer) ? <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>{openLabel(customer)}</Text> : null}
              </View>
            </View>
            <Text selectable variant="titleMedium" style={{ fontVariant: ['tabular-nums'] }}>{owes(customer) ? formatNaira(customer.balanceKobo) : 'Paid up'}</Text>
          </Pressable>
          {owes(customer)
            ? <Button mode="outlined" onPress={() => router.navigate({ pathname: '/payments', params: { customerId: customer.id, saleId: '', entry: randomUUID() } })} accessibilityLabel={`Record a payment from ${customer.name}`}>Record payment</Button>
            : null}
        </Card.Content>
      </Card>)}
      {hasMore ? <Button loading={loading} disabled={loading} onPress={loadMore}>Load more</Button> : null}
    </Page>
    <CustomerDebtSheet customer={selected} onClose={() => setSelected(null)} />
  </>;
}

function CustomerDebtSheet({ customer, onClose }: { customer: CustomerBalance | null; onClose: () => void }) {
  return <ReviewSheet visible={!!customer} title={customer ? customer.name : ''} onClose={onClose}>
    {customer ? <CustomerDebtContent key={customer.id} customer={customer} onClose={onClose} /> : null}
  </ReviewSheet>;
}

function CustomerDebtContent({ customer, onClose }: { customer: CustomerBalance; onClose: () => void }) {
  const [sales, setSales] = useState<OutstandingSale[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetchOutstandingSales(customer.id).then(setSales).catch(failure => setError(failure instanceof Error ? failure.message : 'Unable to load outstanding invoices.'));
  }, [customer.id]);
  return <>
    <Text selectable>{customer.phone || 'No phone on file'}</Text>
    <CopyableAmount label="Outstanding balance" kobo={customer.balanceKobo} />
    {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
    {!sales && !error ? <ActivityIndicator accessibilityLabel="Loading outstanding invoices" /> : null}
    {sales && !sales.length && !error ? <Text>No outstanding invoices for this customer.</Text> : null}
    {sales?.map(sale => <Card key={sale.saleId} mode="outlined"><Card.Content>
      <Text variant="titleMedium">Invoice #{sale.invoiceNumber} · {sale.businessDate}</Text>
      <View style={{ flexDirection: 'row', gap: tokens.spacing.large, flexWrap: 'wrap' }}>
        <CopyableAmount label="Total" kobo={sale.totalKobo} /><CopyableAmount label="Balance" kobo={sale.balanceKobo} />
      </View>
      <Button onPress={() => { onClose(); router.navigate({ pathname: '/payments', params: { customerId: customer.id, saleId: sale.saleId, entry: randomUUID() } }); }}>Pay this invoice</Button>
    </Card.Content></Card>)}
    <Button mode="contained" onPress={() => { onClose(); router.navigate({ pathname: '/payments', params: { customerId: customer.id, saleId: '', entry: randomUUID() } }); }}>Pay debt</Button>
    <Text variant="labelSmall">Current balances will be checked before payment review.</Text>
  </>;
}
