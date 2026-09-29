import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkspaceLayout } from '@/hooks/use-workspace-layout';
import { tokens } from '@/theme/tokens';

/**
 * `workspace` pages are operations screens: they fill the window so tables and
 * columns get the room a wide monitor actually offers, held off the edges by
 * `workspaceGutter`. Everything else stays at a readable form width, centred,
 * because a login or a single-column form does not improve by getting wider.
 */
export function Page({ children, workspace = false, footer }: PropsWithChildren<{ workspace?: boolean; footer?: ReactNode }>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { roomy } = useWorkspaceLayout();
  const gutter = workspace && roomy ? tokens.layout.workspaceGutter : tokens.spacing.medium;
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, paddingVertical: gutter, paddingBottom: Math.max(tokens.spacing.large, insets.bottom), paddingLeft: Math.max(gutter, insets.left), paddingRight: Math.max(gutter, insets.right) }}>
      <View style={{ width: '100%', maxWidth: workspace ? undefined : tokens.layout.formWidth, alignSelf: 'center', gap: tokens.spacing.large }}>{children}</View>
    </ScrollView>
    {footer ? <View style={{ backgroundColor: theme.colors.surface, borderTopWidth: 1, borderColor: theme.colors.outlineVariant, padding: gutter, paddingBottom: Math.max(gutter, insets.bottom), paddingLeft: Math.max(gutter, insets.left), paddingRight: Math.max(gutter, insets.right) }}>{footer}</View> : null}
    </View>
  );
}
