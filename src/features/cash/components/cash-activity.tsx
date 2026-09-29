import { useState } from 'react';
import { View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { ActionButton } from '@/components/ui/action-button';
import { CopyableAmount } from '@/components/ui/copyable-amount';
import { FormSection } from '@/components/ui/form-section';
import { ReviewSheet } from '@/components/ui/review-sheet';
import { StatusChip } from '@/components/ui/status-chip';
import { WorkspaceTable } from '@/components/ui/workspace-table';
import { useWorkspaceLayout } from '@/hooks/use-workspace-layout';
import { lagosTime, readableLagosDate } from '@/features/records/lagos-date';
import { formatNaira } from '@/features/sales/domain/money';
import { tokens } from '@/theme/tokens';
import type { CashReceipt } from '../submission';

const labels: Record<CashReceipt['action'], string> = { opening: 'Opening count', closing_count: 'Closing count', expense: 'Expense', withdrawal: 'Withdrawal' };

export function CashActivity({ entries, loading, error, hasMore, onLoadMore }: {
  entries: CashReceipt[]; loading: boolean; error: string; hasMore: boolean; onLoadMore: () => void;
}) {
  const { desktop } = useWorkspaceLayout();
  const [selected, setSelected] = useState<CashReceipt | null>(null);
  return <>
    <FormSection title="Outgoing entries" description="Recorded expenses and withdrawals. Open an entry to see its full details.">
      {!entries.length && !loading && !error ? <Text>No money was paid out on this day.</Text> : null}
      {entries.length && desktop ? <WorkspaceTable rows={entries} rowKey={entry => entry.entryId} rowLabel={entry => `View ${labels[entry.action].toLowerCase()}: ${entry.reason}`} onOpen={setSelected} columns={[
        { key: 'time', title: 'Time', weight: 0.7, render: entry => <Text style={{ fontVariant: ['tabular-nums'] }}>{lagosTime(entry.occurredAt)}</Text> },
        { key: 'entry', title: 'Entry / recorded by', weight: 2, render: entry => <View style={{ gap: tokens.spacing.extraSmall }}><Text>{labels[entry.action]} · {entry.reason}</Text><Text variant="bodySmall">{entry.recordedByName}</Text>{entry.reviewFlags.length ? <StatusChip label="Flagged for review" tone="caution" /> : null}</View> },
        { key: 'method', title: 'Method', weight: 1.2, render: entry => <StatusChip label={entry.method.toUpperCase()} /> },
        { key: 'amount', title: 'Paid out', numeric: true, weight: 1.4, render: entry => <Text selectable style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>− {formatNaira(entry.amountKobo)}</Text> },
      ]} /> : entries.map(entry => <Card key={entry.entryId} mode="outlined" onPress={() => setSelected(entry)} accessibilityLabel={`View ${labels[entry.action].toLowerCase()}: ${entry.reason}`}><Card.Content style={{ gap: tokens.spacing.small }}>
        <Text variant="titleMedium">{labels[entry.action]} · {entry.reason}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.small, alignItems: 'center' }}><Text variant="bodySmall">{lagosTime(entry.occurredAt)} · {entry.recordedByName}</Text><StatusChip label={entry.method.toUpperCase()} /></View>
        <Text selectable variant="titleMedium" style={{ fontVariant: ['tabular-nums'] }}>− {formatNaira(entry.amountKobo)}</Text>
        {entry.reviewFlags.length ? <StatusChip label="Flagged for review" tone="caution" /> : null}
      </Card.Content></Card>)}
      {hasMore ? <ActionButton disabled={loading} loading={loading} onPress={onLoadMore}>Load more entries</ActionButton> : null}
    </FormSection>
    <ReviewSheet visible={!!selected} title="Recorded outgoing entry" onClose={() => setSelected(null)}>
      {selected ? <>
        <Text variant="titleLarge">{labels[selected.action]}</Text>
        <Text selectable>{selected.reason}</Text>
        <CopyableAmount label="Paid out" kobo={selected.amountKobo} emphasis />
        <StatusChip label={selected.method.toUpperCase()} />
        <Text>{selected.method === 'cash' ? 'This payment reduces the cash drawer.' : 'This payment does not reduce physical cash.'}</Text>
        <Text>Recorded by {selected.recordedByName}</Text>
        <Text>{readableLagosDate(selected.businessDate)} · {lagosTime(selected.occurredAt)} Lagos</Text>
        <Text selectable>Entry {selected.entryId}</Text>
        {selected.reviewFlags.length ? <StatusChip label="Flagged for review" tone="caution" /> : null}
      </> : null}
    </ReviewSheet>
  </>;
}
