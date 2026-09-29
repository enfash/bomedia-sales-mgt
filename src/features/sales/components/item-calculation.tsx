import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { CopyableAmount } from '@/components/ui/copyable-amount';
import { SummaryStrip } from '@/components/ui/summary-strip';
import { tokens } from '@/theme/tokens';
import { formatNaira } from '../domain/money';

export function ItemCalculation({ area, calculatedKobo, chargedKobo, roundingKobo, action }: {
  area: string; calculatedKobo: string; chargedKobo: string; roundingKobo: string; action: ReactNode;
}) {
  const theme = useTheme();
  return <SummaryStrip action={action}>
    <View>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Area · sq ft</Text>
      <View style={{ minHeight: tokens.layout.touchTarget, justifyContent: 'center' }}><Text selectable variant="titleMedium" style={{ fontVariant: ['tabular-nums'] }}>{area}</Text></View>
    </View>
    <CopyableAmount label="Calculated" kobo={calculatedKobo} />
    <CopyableAmount label={`Charged · round up to ${formatNaira(roundingKobo)}`} kobo={chargedKobo} emphasis />
  </SummaryStrip>;
}
