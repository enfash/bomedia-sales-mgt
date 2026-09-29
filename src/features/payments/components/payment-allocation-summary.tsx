import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { StatusChip } from '@/components/ui/status-chip';
import { tokens } from '@/theme/tokens';
import { formatNaira } from '@/features/sales/domain/money';
import type { ActivityReceipt } from '../activity-service';

export function PaymentAllocationSummary({ receipt }: { receipt: ActivityReceipt }) {
  const invoices = [...new Set(receipt.allocations.map(allocation => allocation.invoiceNumber))];
  return <View style={{ gap: tokens.spacing.extraSmall }}>
    <Text>{invoices.length === 1 ? `Invoice #${invoices[0]}` : invoices.length ? `${invoices.length} invoices` : 'No invoice applied'}</Text>
    {BigInt(receipt.unappliedKobo) > 0n ? <StatusChip label={`${formatNaira(receipt.unappliedKobo)} unapplied`} tone="caution" /> : null}
  </View>;
}
