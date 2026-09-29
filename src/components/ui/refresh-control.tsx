import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { ActionButton } from './action-button';
import { tokens } from '@/theme/tokens';

export function RefreshControl({ label, updatedLabel, loading, onRefresh }: {
  label: string; updatedLabel?: string; loading: boolean; onRefresh: () => void;
}) {
  const theme = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.small }}>
    {updatedLabel ? <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Updated {updatedLabel} · Lagos</Text> : null}
    <ActionButton icon="refresh" onPress={onRefresh} loading={loading} disabled={loading}>{label}</ActionButton>
  </View>;
}
