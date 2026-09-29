import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { ActionButton } from '@/components/ui/action-button';
import { DatePickerSheet } from '@/components/ui/date-picker-sheet';
import { addDays, dateParts, fullLagosDate, relativeDayLabel } from '@/features/records/lagos-date';
import { tokens } from '@/theme/tokens';

/**
 * One business-date control: step a day with the arrows, tap the date to pick from a calendar,
 * and jump back to today from an earlier day. Dates after today and before `minDate` are unavailable.
 */
export function DateNavigator({ date, today, minDate, onChange, disabled = false }: {
  date: string; today: string; minDate?: string; onChange: (date: string) => void; disabled?: boolean;
}) {
  const theme = useTheme();
  const [picking, setPicking] = useState(false);
  const parts = dateParts(date);
  const canPrevious = !disabled && (!minDate || date > minDate);
  const canNext = !disabled && date < today;
  function openPicker() { setPicking(true); }
  return <>
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.spacing.small }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.extraSmall }}>
        <IconButton mode="outlined" icon="chevron-left" style={{ margin: 0 }} size={tokens.controls.stepperIconSize} disabled={!canPrevious} onPress={() => onChange(addDays(date, -1))} accessibilityLabel="Show the day before" />
        <Pressable accessibilityRole="button" accessibilityLabel={`${relativeDayLabel(date, today)}, ${fullLagosDate(date)}. Choose a date`} disabled={disabled} onPress={openPicker}
          style={({ pressed, hovered }) => ({ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.small, paddingVertical: tokens.spacing.extraSmall, paddingLeft: tokens.spacing.extraSmall, paddingRight: tokens.spacing.small, borderRadius: tokens.radius.field, backgroundColor: pressed || hovered ? theme.colors.surfaceVariant : 'transparent', minHeight: tokens.layout.touchTarget, flexShrink: 1 })}>
          <View style={{ width: tokens.calendarBadge.width, height: tokens.calendarBadge.height, borderRadius: tokens.radius.field, borderWidth: 1, borderColor: theme.colors.outlineVariant, overflow: 'hidden', backgroundColor: theme.colors.surface }}>
            <Text variant="labelSmall" style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary, textAlign: 'center', fontWeight: '700', letterSpacing: tokens.typography.eyebrowSpacing }}>{parts.month}</Text>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text variant="titleMedium" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{parts.day}</Text></View>
          </View>
          <View style={{ flexShrink: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.extraSmall }}>
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>{relativeDayLabel(date, today)}</Text>
              <MaterialCommunityIcons name="chevron-down" size={tokens.controls.stepperIconSize - 4} color={theme.colors.onSurfaceVariant} />
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{fullLagosDate(date)}</Text>
          </View>
        </Pressable>
        <IconButton mode="outlined" icon="chevron-right" style={{ margin: 0 }} size={tokens.controls.stepperIconSize} disabled={!canNext} onPress={() => onChange(addDays(date, 1))} accessibilityLabel="Show the day after" />
      </View>
      {date < today ? <ActionButton mode="outlined" compact disabled={disabled} onPress={() => onChange(today)}>Jump to today</ActionButton> : null}
    </View>
    <DatePickerSheet visible={picking} date={date} today={today} minDate={minDate} onSelect={onChange} onClose={() => setPicking(false)} />
  </>;
}
