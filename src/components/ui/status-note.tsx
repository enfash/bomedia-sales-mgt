import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { tokens } from '@/theme/tokens';

export function StatusNote({ message, attention = false, action }: { message: string; attention?: boolean; action?: ReactNode }) {
  const theme = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.small, padding: tokens.spacing.small, borderRadius: tokens.radius.field, backgroundColor: attention ? theme.colors.errorContainer : theme.colors.surfaceVariant }}>
    <View style={{ width: tokens.layout.statusDot, height: tokens.layout.statusDot, borderRadius: tokens.radius.pill, backgroundColor: attention ? theme.colors.error : theme.colors.primary }} />
    <Text selectable accessibilityLiveRegion="polite" variant="bodySmall" style={{ flex: 1, color: attention ? theme.colors.onErrorContainer : theme.colors.onSurfaceVariant }}>{message}</Text>
    {action}
  </View>;
}
