import type { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { tokens } from '@/theme/tokens';

export function FormSection({ step, title, description, trailing, children }: PropsWithChildren<{ step?: string; title: string; description?: string; trailing?: ReactNode }>) {
  const theme = useTheme();
  return <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderWidth: 1, borderRadius: tokens.radius.card, padding: tokens.spacing.medium, gap: tokens.spacing.medium }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.small }}>
      {step ? <View style={{ width: tokens.layout.stepBadge, height: tokens.layout.stepBadge, borderRadius: tokens.radius.field, backgroundColor: theme.colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }}><Text variant="labelLarge" style={{ color: theme.colors.onPrimaryContainer }}>{step}</Text></View> : null}
      <View style={{ flex: 1 }}><Text variant="titleMedium" style={{ fontWeight: '700' }}>{title}</Text>{description ? <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{description}</Text> : null}</View>
      {trailing}
    </View>
    {children}
  </View>;
}
