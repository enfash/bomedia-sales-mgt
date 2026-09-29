import type { PropsWithChildren } from 'react';
import { useIsFocused } from 'expo-router/react-navigation';
import { Platform, View } from 'react-native';

export function FocusedScene({ children }: PropsWithChildren) {
  const focused = useIsFocused();
  // Native screen detachment is sufficient there. Web must also exclude hidden controls
  // from sequential keyboard focus, without unmounting durable form/recovery state.
  return <View style={{ flex: 1, display: Platform.OS === 'web' && !focused ? 'none' : 'flex' }}>{children}</View>;
}
