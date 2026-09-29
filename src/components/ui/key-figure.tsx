import { useState } from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { CopyableAmount } from '@/components/ui/copyable-amount';
import { formatNaira } from '@/features/sales/domain/money';
import { tokens } from '@/theme/tokens';

type Row = { label: string; kobo: string; operation?: 'add' | 'subtract' };

/**
 * The single figure a screen exists to answer, with the arithmetic that produced it
 * beside it in small type. `unavailable` states why the figure cannot be shown yet —
 * a missing input is not an error, and the screen must not read like one.
 * Every amount stays exact and copyable; nothing here rounds or abbreviates.
 */
export function KeyFigure({ label, kobo, note, unavailable, breakdown = [] }: {
  label: string;
  kobo: string | null;
  note?: string;
  unavailable?: string;
  breakdown?: Row[];
}) {
  const theme = useTheme();
  const [availableWidth, setAvailableWidth] = useState(0);
  const side = availableWidth >= tokens.controls.summaryMinWidth * 2 + tokens.spacing.large * 2 + tokens.spacing.extraLarge && breakdown.length > 0;
  return <View onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)} style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderWidth: 1, borderRadius: tokens.radius.card, padding: tokens.spacing.large, flexDirection: side ? 'row' : 'column', gap: side ? tokens.spacing.extraLarge : tokens.spacing.medium, alignItems: side ? 'center' : undefined }}>
    <View style={{ flex: side ? 1 : undefined, minWidth: 0, gap: tokens.spacing.extraSmall }}>
      {kobo === null
        ? <>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{unavailable ?? 'Not available yet'}</Text>
          </>
        : <CopyableAmount label={label} kobo={kobo} hero />}
      {note ? <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{note}</Text> : null}
    </View>
    {breakdown.length ? <View style={{ flex: side ? 1 : undefined, minWidth: 0, gap: tokens.spacing.small, borderLeftWidth: side ? 1 : 0, borderTopWidth: side ? 0 : 1, borderColor: theme.colors.outlineVariant, paddingLeft: side ? tokens.spacing.large : 0, paddingTop: side ? 0 : tokens.spacing.medium }}>
      {breakdown.map(row => <View key={row.label} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.spacing.medium }}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flexShrink: 1 }}>{row.label}</Text>
        <Text selectable variant="bodyMedium" style={{ color: theme.colors.onSurface, flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{row.operation === 'add' ? '+ ' : row.operation === 'subtract' ? '− ' : ''}{formatNaira(row.kobo)}</Text>
      </View>)}
    </View> : null}
  </View>;
}
