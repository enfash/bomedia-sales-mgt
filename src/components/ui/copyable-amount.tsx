import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';

import { decimalNaira, formatNaira } from '@/features/sales/domain/money';
import { tokens } from '@/theme/tokens';

// `hero` is the one figure a screen exists to answer; `emphasis` is a secondary total.
export function CopyableAmount({ label, kobo, emphasis = false, hero = false, onContainer = false }: { label: string; kobo: string; emphasis?: boolean; hero?: boolean; onContainer?: boolean }) {
  const theme = useTheme();
  const foreground = onContainer ? theme.colors.onPrimaryContainer : theme.colors.onSurface;
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      const copied = await Clipboard.setStringAsync(decimalNaira(kobo));
      setMessage(copied ? 'Copied' : 'Could not copy. Try again.');
    } catch { setMessage('Could not copy. Try again.'); }
  }
  return <View>
    <Text variant="labelMedium" style={{ color: onContainer ? foreground : theme.colors.onSurfaceVariant }}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Copy ${label}: ${formatNaira(kobo)}`} onPress={copy} style={{ minHeight: tokens.layout.touchTarget, justifyContent: 'center' }}>
      <Text variant={hero ? "displaySmall" : emphasis ? "headlineSmall" : "titleMedium"} style={{ color: foreground, fontWeight: hero || emphasis ? '700' : '500', fontVariant: ['tabular-nums'], letterSpacing: hero ? -1 : undefined }}>{formatNaira(kobo)}</Text>
    </Pressable>
    {message ? <Text accessibilityLiveRegion="polite" variant="labelSmall" style={{ color: foreground }}>{message}</Text> : null}
  </View>;
}
