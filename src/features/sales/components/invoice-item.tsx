import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { ActionButton as Button } from '@/components/ui/action-button';
import { CopyableAmount } from '@/components/ui/copyable-amount';
import { tokens } from '@/theme/tokens';

export function InvoiceItem({ position, material, width, height, unit, quantity, calculatedKobo, chargedKobo, onEdit, onRemove }: {
  position: number; material: string; width: string; height: string; unit: 'ft' | 'in'; quantity: string;
  calculatedKobo: string; chargedKobo: string; onEdit?: () => void; onRemove?: () => void;
}) {
  const theme = useTheme();
  return <View style={{ gap: tokens.spacing.small, paddingBottom: tokens.spacing.medium, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: tokens.spacing.small }}>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, fontVariant: ['tabular-nums'] }}>{String(position).padStart(2, '0')}</Text>
      <Text selectable variant="titleMedium" style={{ flex: 1, fontWeight: '700' }}>{material}</Text>
      <Text selectable variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Qty {quantity}</Text>
    </View>
    <Text selectable variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{width} × {height} {unit === 'in' ? 'inches' : 'feet'}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.large }}>
      <CopyableAmount label="Calculated" kobo={calculatedKobo} /><CopyableAmount label="Charge" kobo={chargedKobo} emphasis />
    </View>
    {onEdit || onRemove ? <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.spacing.small }}>
      {onEdit ? <Button compact onPress={onEdit} accessibilityLabel={`Edit item ${position}, ${material}`}>Edit</Button> : null}
      {onRemove ? <Button compact textColor={theme.colors.onSurfaceVariant} onPress={onRemove} accessibilityLabel={`Remove item ${position}, ${material}`}>Remove</Button> : null}
    </View> : null}
  </View>;
}
