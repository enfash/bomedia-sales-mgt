import { Platform, useWindowDimensions } from 'react-native';
import { tokens } from '@/theme/tokens';

export function useWorkspaceLayout() {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= tokens.layout.workspaceBreakpoint;
  return { roomy: width >= tokens.layout.tabletBreakpoint, desktop, wide: desktop && width >= tokens.layout.wideBreakpoint };
}
