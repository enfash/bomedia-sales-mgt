import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useWorkspaceLayout } from '@/hooks/use-workspace-layout';
import { tokens } from '@/theme/tokens';

export function WorkspaceToolbar({ children }: PropsWithChildren) {
  const { roomy } = useWorkspaceLayout();
  return <View style={{ flexDirection: roomy ? 'row' : 'column', flexWrap: 'wrap', alignItems: roomy ? 'center' : 'stretch', justifyContent: 'space-between', gap: tokens.spacing.medium }}>{children}</View>;
}
