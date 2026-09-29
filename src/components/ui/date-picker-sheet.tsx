import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { ReviewSheet } from '@/components/ui/review-sheet';
import { addMonths, fullLagosDate, monthTitle, monthWeeks } from '@/features/records/lagos-date';
import { tokens } from '@/theme/tokens';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Monday-first month grid for choosing a business date between `minDate` and today. */
export function DatePickerSheet({ visible, date, today, minDate, onSelect, onClose }: {
  visible: boolean; date: string; today: string; minDate?: string; onSelect: (date: string) => void; onClose: () => void;
}) {
  const theme = useTheme();
  const [month, setMonth] = useState(date);
  const [shownFor, setShownFor] = useState(date);
  // Reopening on another date starts at that date's month.
  if (visible && shownFor !== date) { setShownFor(date); setMonth(date); }
  const allowed = (day: string) => day <= today && (!minDate || day >= minDate);
  return <ReviewSheet visible={visible} title="Choose a date" onClose={onClose}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <IconButton icon="chevron-left" disabled={!!minDate && addMonths(month, 0) <= minDate} onPress={() => setMonth(addMonths(month, -1))} accessibilityLabel="Previous month" />
      <Text variant="titleMedium" accessibilityRole="header">{monthTitle(month)}</Text>
      <IconButton icon="chevron-right" disabled={addMonths(month, 1) > today} onPress={() => setMonth(addMonths(month, 1))} accessibilityLabel="Next month" />
    </View>
    <View style={{ gap: tokens.spacing.extraSmall }}>
      <View style={{ flexDirection: 'row' }}>{weekdays.map(day => <Text key={day} variant="labelSmall" style={{ flex: 1, textAlign: 'center', color: theme.colors.onSurfaceVariant }}>{day}</Text>)}</View>
      {monthWeeks(month).map((week, index) => <View key={index} style={{ flexDirection: 'row', gap: tokens.spacing.extraSmall }}>
        {week.map((day, column) => {
          if (!day) return <View key={column} style={{ flex: 1 }} />;
          const selected = day === date; const available = allowed(day);
          return <Pressable key={day} disabled={!available} accessibilityRole="button" accessibilityState={{ selected, disabled: !available }} accessibilityLabel={fullLagosDate(day)}
            onPress={() => { onClose(); onSelect(day); }}
            style={{ flex: 1, minHeight: tokens.layout.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.field, backgroundColor: selected ? theme.colors.primaryContainer : 'transparent', opacity: available ? 1 : 0.35 }}>
            <Text variant="bodyLarge" style={{ fontVariant: ['tabular-nums'], fontWeight: day === today || selected ? '700' : '400', color: selected ? theme.colors.onPrimaryContainer : day === today ? theme.colors.primary : theme.colors.onSurface }}>{Number(day.slice(8))}</Text>
          </Pressable>;
        })}
      </View>)}
    </View>
    {minDate ? <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Dates from {fullLagosDate(minDate)} to today are available.</Text> : null}
  </ReviewSheet>;
}
