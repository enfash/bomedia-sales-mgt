import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

import { tokens, type AppRole } from './tokens';

export function createAppTheme(role: AppRole, dark: boolean) {
  const base = dark ? MD3DarkTheme : MD3LightTheme;
  const palette = tokens.roles[role];
  return {
    ...base,
    roundness: tokens.radius.field,
    colors: {
      ...base.colors,
      ...tokens.surfaces[dark ? 'dark' : 'light'],
      primary: dark ? palette.darkPrimary : palette.primary,
      onPrimary: dark ? palette.onContainer : '#ffffff',
      primaryContainer: dark ? palette.onContainer : palette.container,
      onPrimaryContainer: dark ? palette.container : palette.onContainer,
      secondary: dark ? palette.darkPrimary : palette.primary,
      onSecondary: dark ? palette.onContainer : '#ffffff',
      secondaryContainer: dark ? palette.onContainer : palette.container,
      onSecondaryContainer: dark ? palette.container : palette.onContainer,
    },
  };
}
// Presentation defaults only; these do not assign permissions or authenticate a user.
export const lightTheme = createAppTheme('staff', false);
export const darkTheme = createAppTheme('staff', true);
export const spacing = tokens.spacing;
