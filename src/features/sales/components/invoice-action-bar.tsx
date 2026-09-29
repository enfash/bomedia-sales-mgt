import { View } from 'react-native';
import { ActionButton } from '@/components/ui/action-button';
import { CopyableAmount } from '@/components/ui/copyable-amount';
import { tokens } from '@/theme/tokens';

export function InvoiceActionBar({ count, totalKobo, blocker, onReview }: {
  count: number; totalKobo: string; blocker: string; onReview: () => void;
}) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.small }}>
    <CopyableAmount label={`${count} ${count === 1 ? 'item' : 'items'} · Invoice total`} kobo={totalKobo} emphasis />
    <ActionButton mode="contained" disabled={!!blocker} accessibilityHint={blocker || 'Review payment and full invoice'} onPress={onReview}>Review sale</ActionButton>
  </View>;
}
