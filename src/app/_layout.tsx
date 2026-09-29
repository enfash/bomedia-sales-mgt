import { use } from 'react';
import { AuthGate, AuthProfile } from '@/features/auth/auth-gate';
import { Stack } from 'expo-router/stack';
import { ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { createAppTheme, lightTheme } from '@/theme/theme';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return <PaperProvider theme={lightTheme}><AuthGate><AppNavigation /></AuthGate></PaperProvider>;
}

function AppNavigation() {
  const isDark = useColorScheme() === 'dark';
  const profile = use(AuthProfile);
  const theme = createAppTheme(profile?.role ?? 'staff', isDark);
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
      notification: theme.colors.error,
    },
  };

  return (
    <PaperProvider theme={theme}>
      <ThemeProvider value={navigationTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeProvider>
    </PaperProvider>
  );
}
