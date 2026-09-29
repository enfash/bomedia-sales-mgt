import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { ActionButton as Button } from './action-button';

import { tokens } from '@/theme/tokens';

type Props<T extends string> = {
  label: string;
  // `caption` is a decisive detail — a price, a rate — that belongs with the choice
  // itself rather than somewhere it would be read after the decision.
  options: readonly { value: T; label: string; caption?: string }[];
  value: T | null;
  onChange: (value: T) => void;
  compact?: boolean;
  // 'card' stacks the label over its caption in an even grid. Paper's Button clamps
  // its child to one line, so a two-line option cannot be a Button.
  layout?: 'chip' | 'card';
};

export function ChoiceButtons<T extends string>({ label, options, value, onChange, compact = false, layout = 'chip' }: Props<T>) {
  const theme = useTheme();
  const [availableWidth, setAvailableWidth] = useState(0);
  const columns = availableWidth >= tokens.controls.choiceMinWidth * 4 + tokens.spacing.small * 3 ? 4 : availableWidth >= tokens.controls.choiceMinWidth * 2 + tokens.spacing.small ? 2 : 1;
  const cardWidth = availableWidth ? (availableWidth - tokens.spacing.small * (columns - 1)) / columns : tokens.controls.choiceMinWidth;
  if (layout === 'card') {
    return (
      <View style={{ gap: tokens.spacing.small }}>
        <Text variant="labelLarge">{label}</Text>
        <View onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.small }}>
          {options.map((option) => {
            const selected = value === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${option.label}${option.caption ? `, ${option.caption}` : ''}`}
                accessibilityState={{ selected }}
                onPress={() => onChange(option.value)}
                style={{
                  flexGrow: 1, flexBasis: cardWidth, minWidth: 0,
                  minHeight: tokens.layout.touchTarget,
                  justifyContent: 'center', gap: tokens.spacing.tiny,
                  paddingHorizontal: tokens.spacing.medium, paddingVertical: tokens.spacing.small,
                  borderRadius: tokens.radius.card,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                }}
              >
                <Text variant="titleSmall" style={{ fontWeight: '600', color: selected ? theme.colors.onPrimary : theme.colors.onSurface }}>{option.label}</Text>
                {option.caption ? <Text variant="bodySmall" style={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant, opacity: selected ? 0.9 : 1 }}>{option.caption}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: tokens.spacing.small, flexDirection: compact ? 'row' : 'column', alignItems: compact ? 'center' : undefined, flexWrap: 'wrap' }}>
      <Text variant="labelLarge">{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 0 : tokens.spacing.small, marginLeft: compact ? 'auto' : undefined, backgroundColor: compact ? theme.colors.surfaceVariant : undefined, borderRadius: tokens.radius.pill }}>
        {options.map((option) => (
          <Button
            key={option.value}
            mode={value === option.value ? 'contained' : compact ? 'text' : 'outlined'}
            compact={compact}
            accessibilityLabel={`${label}: ${option.label}${option.caption ? `, ${option.caption}` : ''}`}
            accessibilityState={{ selected: value === option.value }}
            onPress={() => onChange(option.value)}
            style={{ borderRadius: compact ? tokens.radius.pill : tokens.radius.field, borderColor: theme.colors.outlineVariant }}
          >{option.caption ? `${option.label} · ${option.caption}` : option.label}</Button>
        ))}
      </View>
    </View>
  );
}
