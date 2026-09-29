import { type PropsWithChildren, useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, PanResponder, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens } from '@/theme/tokens';

export function ReviewSheet({ visible, title, onClose, children }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [fraction, setFraction] = useState<number>(tokens.sheet.initial);
  const currentFraction = useRef<number>(tokens.sheet.initial);
  const dragStart = useRef<number>(tokens.sheet.initial);
  const resize = useCallback((value: number) => {
    const next = Math.max(tokens.sheet.min, Math.min(tokens.sheet.max, value));
    currentFraction.current = next;
    setFraction(next);
  }, []);
  // Keep the responder stable during movement; rebuilding it loses the gesture baseline.
  // eslint-disable-next-line react-hooks/refs -- PanResponder registers these event callbacks; it does not invoke them during render.
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { dragStart.current = currentFraction.current; },
    onPanResponderMove: (_, gesture) => resize(dragStart.current - gesture.dy / height),
  }), [height, resize]);
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss review" onPress={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: theme.colors.backdrop }} />
      <View accessibilityViewIsModal style={{ height: Math.min(height * fraction, height - insets.top), maxWidth: tokens.layout.formWidth, width: '100%', alignSelf: 'center', backgroundColor: theme.colors.surface, borderTopLeftRadius: tokens.radius.sheet, borderTopRightRadius: tokens.radius.sheet, paddingBottom: Math.max(insets.bottom, tokens.spacing.medium) }}>
        <View {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="Review sheet height" accessibilityValue={{ min: Math.round(tokens.sheet.min * 100), max: Math.round(tokens.sheet.max * 100), now: Math.round(fraction * 100) }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={e => resize(fraction + (e.nativeEvent.actionName === 'increment' ? tokens.sheet.increment : -tokens.sheet.increment))} style={{ minHeight: tokens.layout.touchTarget, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: tokens.sheet.handleWidth, height: tokens.sheet.handleHeight, borderRadius: tokens.radius.pill, backgroundColor: theme.colors.outline }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: tokens.spacing.medium }}><Text variant="titleLarge" style={{ flex: 1, fontWeight: '700' }}>{title}</Text><IconButton icon={fraction < tokens.sheet.max ? 'arrow-expand-vertical' : 'arrow-collapse-vertical'} accessibilityLabel={fraction < tokens.sheet.max ? 'Expand sheet' : 'Reduce sheet'} onPress={() => resize(fraction < tokens.sheet.max ? tokens.sheet.max : tokens.sheet.initial)} /><IconButton icon="close" accessibilityLabel="Close review" onPress={onClose} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: tokens.spacing.medium, gap: tokens.spacing.medium }}>
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
