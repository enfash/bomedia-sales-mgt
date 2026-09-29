import type { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { tokens } from '@/theme/tokens';

/** Related figures and their action wrap together when their container gets narrow. */
export function SummaryStrip({ children, action }: PropsWithChildren<{ action?: ReactNode }>) {
  const theme = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.medium, padding: tokens.spacing.medium, borderRadius: tokens.radius.field, backgroundColor: theme.colors.surfaceVariant }}>
    <View style={{ flexGrow: 1, flexBasis: tokens.controls.summaryMinWidth, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.medium }}>{children}</View>
    {action}
  </View>;
}
