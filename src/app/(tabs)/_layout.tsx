import { FocusedScene } from '@/components/layout/focused-scene';
import { AppShell } from '@/components/layout/app-shell';
import { useWorkspaceLayout } from '@/hooks/use-workspace-layout';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/tabs';
import { useTheme } from 'react-native-paper';

export default function TabsLayout() {
  const theme = useTheme();
  const { desktop } = useWorkspaceLayout();
  return (
    <AppShell><Tabs screenLayout={({ children }) => <FocusedScene>{children}</FocusedScene>} screenOptions={{ headerShown: !desktop, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.onSurfaceVariant, headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.onSurface, tabBarStyle: { display: desktop ? 'none' : 'flex', backgroundColor: theme.colors.surface } }}>
      <Tabs.Screen name="index" options={{ title: 'New sale', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="receipt-text-plus" size={size} color={color} /> }} />
      <Tabs.Screen name="records" options={{ title: 'Records', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="format-list-bulleted" size={size} color={color} /> }} />
      <Tabs.Screen name="customers" options={{ title: 'Customers', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group" size={size} color={color} /> }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cash-check" size={size} color={color} /> }} />
      <Tabs.Screen name="cash" options={{ title: 'Cash', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cash-register" size={size} color={color} /> }} />
    </Tabs></AppShell>
  );
}
