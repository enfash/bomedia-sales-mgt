import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';

import { tokens } from '@/theme/tokens';

export type ChipTone = 'settled' | 'owing' | 'caution' | 'neutral';

/**
 * A category read at a glance. Every chip carries its word as well as its colour,
 * so the meaning survives greyscale, colour-blindness and a screen reader.
 */
export function StatusChip({ label, tone = 'neutral', icon }: { label: string; tone?: ChipTone; icon?: ComponentProps<typeof MaterialCommunityIcons>['name'] }) {
  const theme = useTheme();
  const palette: Record<ChipTone, { background: string; foreground: string }> = {
    settled: { background: theme.colors.secondaryContainer, foreground: theme.colors.onSecondaryContainer },
    owing: { background: theme.colors.errorContainer, foreground: theme.colors.onErrorContainer },
    caution: { background: theme.colors.tertiaryContainer, foreground: theme.colors.onTertiaryContainer },
    neutral: { background: theme.colors.surfaceVariant, foreground: theme.colors.onSurfaceVariant },
  };
  const { background, foreground } = palette[tone];
  return <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.extraSmall, backgroundColor: background, borderRadius: tokens.radius.pill, paddingHorizontal: tokens.spacing.small, paddingVertical: tokens.spacing.tiny }}>
    {icon ? <MaterialCommunityIcons name={icon} size={theme.fonts.labelMedium.fontSize} color={foreground} accessibilityElementsHidden importantForAccessibility="no" /> : null}
    <Text variant="labelMedium" style={{ color: foreground, fontWeight: '600' }}>{label}</Text>
  </View>;
}
