import type { ComponentProps } from 'react';
import { Button } from 'react-native-paper';
import { tokens } from '@/theme/tokens';

/** One touch-target policy for form actions, with Paper owning their appearance. */
export function ActionButton({ contentStyle, ...props }: ComponentProps<typeof Button>) {
  return <Button {...props} contentStyle={[{ minHeight: tokens.layout.touchTarget }, contentStyle]} />;
}
