import { Pressable, TextInput as NativeTextInput, View } from 'react-native';
import { Icon, TextInput, useTheme } from 'react-native-paper';

import { tokens } from '@/theme/tokens';

/** Paper owns the outline, label, height, typography and focus state. Its custom
 * input renderer gives the number a separate lane between the step controls,
 * without narrowing Paper adornments or reproducing its field geometry. */
export function StepperField({ label, value, onChangeText, onStep, canDecrease, disabled = false, width = tokens.layout.quantityWidth, accessibilityHints }: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  onStep: (delta: number) => void;
  canDecrease: boolean;
  disabled?: boolean;
  width?: number;
  accessibilityHints: { decrease: string; increase: string };
}) {
  const theme = useTheme();
  const decreaseDisabled = disabled || !canDecrease;
  const stepStyle = { width: tokens.controls.stepperButtonWidth, minHeight: tokens.layout.touchTarget, alignItems: 'center', justifyContent: 'center' } as const;
  return <TextInput
    mode="outlined"
    label={label}
    value={value}
    onChangeText={onChangeText}
    disabled={disabled}
    keyboardType="number-pad"
    accessibilityLabel={label}
    style={{ width }}
    render={inputProps => <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityHints.decrease} accessibilityState={{ disabled: decreaseDisabled }} disabled={decreaseDisabled} onPress={() => onStep(-1)} style={stepStyle}>
        <Icon source="chevron-left" size={tokens.controls.stepperIconSize} color={decreaseDisabled ? theme.colors.onSurfaceDisabled : theme.colors.primary} />
      </Pressable>
      <NativeTextInput {...inputProps} style={[inputProps.style, { flex: 1, minWidth: 0, textAlign: 'center', paddingHorizontal: 0 }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityHints.increase} accessibilityState={{ disabled }} disabled={disabled} onPress={() => onStep(1)} style={stepStyle}>
        <Icon source="chevron-right" size={tokens.controls.stepperIconSize} color={disabled ? theme.colors.onSurfaceDisabled : theme.colors.primary} />
      </Pressable>
    </View>}
  />;
}
