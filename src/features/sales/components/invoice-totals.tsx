import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { CopyableAmount } from '@/components/ui/copyable-amount';
import { tokens } from '@/theme/tokens';

export function InvoiceTotals({ subtotalKobo, adjustmentKobo, totalKobo, receivedKobo, balanceKobo, method, children }: {
  subtotalKobo: string; adjustmentKobo: string; totalKobo: string; receivedKobo?: string; balanceKobo?: string; method?: string; children?: ReactNode;
}) {
  const theme = useTheme();
  return <View style={{ backgroundColor: theme.colors.primaryContainer, borderRadius: tokens.radius.card, padding: tokens.spacing.medium, gap: tokens.spacing.small }}>
    <Text variant="labelLarge" style={{ color: theme.colors.onPrimaryContainer, letterSpacing: tokens.typography.eyebrowSpacing }}>INVOICE SUMMARY</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.large }}>
      <CopyableAmount label="Items subtotal" kobo={subtotalKobo} onContainer />
      {BigInt(adjustmentKobo) > BigInt(0) ? <CopyableAmount label="Minimum adjustment" kobo={adjustmentKobo} onContainer /> : null}
    </View>
    <CopyableAmount label="Invoice total" kobo={totalKobo} emphasis onContainer />
    {receivedKobo !== undefined || balanceKobo !== undefined ? <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.onPrimaryContainer, paddingTop: tokens.spacing.small, flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.large }}>
      {receivedKobo !== undefined ? <CopyableAmount label={`Received${method ? ` · ${method}` : ''}`} kobo={receivedKobo} onContainer /> : null}
      {balanceKobo !== undefined ? <CopyableAmount label="Balance remaining" kobo={balanceKobo} onContainer /> : null}
    </View> : null}
    {children}
  </View>;
}
