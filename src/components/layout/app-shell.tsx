import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { Link, usePathname } from 'expo-router';
import { Image, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useWorkspaceLayout } from '@/hooks/use-workspace-layout';
import { tokens } from '@/theme/tokens';
import { ActionButton as Button } from '@/components/ui/action-button';
import { StatusChip, type ChipTone } from '@/components/ui/status-chip';

type TopbarChip = { label: string; tone: ChipTone };
const TopbarStatus = createContext<(href: string, chip: TopbarChip | null) => void>(() => {});

/**
 * Lets a screen put one short status (e.g. draft saved) in the desktop topbar beside the
 * environment marker, instead of spending a band of page space on it. Pass null to clear.
 * Tabs stay mounted, so the chip is keyed by route and only the current route's chip shows.
 */
export function useTopbarStatus(href: string, chip: TopbarChip | null) {
  const set = use(TopbarStatus);
  const label = chip?.label; const tone = chip?.tone ?? 'neutral';
  useEffect(() => {
    set(href, label ? { label, tone } : null);
    return () => set(href, null);
  }, [set, href, label, tone]);
}

const destinations = [
  { href: '/', label: 'New sale', icon: 'receipt-text-plus', description: 'Customer, printing details and invoice review' },
  { href: '/records', label: 'Records', icon: 'format-list-bulleted', description: 'Inspect invoices by business date' },
  { href: '/customers', label: 'Customers', icon: 'account-group', description: 'Customer balances and outstanding invoices' },
  { href: '/payments', label: 'Payments', icon: 'cash-check', description: 'Confirmed collections and payment recovery' },
  { href: '/cash', label: 'Cash', icon: 'cash-register', description: 'Today’s shared drawer and outgoing entries' },
] as const;

export function AppShell({ children }: PropsWithChildren) {
  const { desktop, wide } = useWorkspaceLayout();
  const theme = useTheme();
  const pathname = usePathname();
  const current = destinations.find(item => item.href === pathname);
  const [chips, setChips] = useState<Record<string, TopbarChip>>({});
  const setChip = useCallback((href: string, chip: TopbarChip | null) => setChips(previous => {
    if (!chip) { if (!(href in previous)) return previous; const { [href]: _removed, ...rest } = previous; return rest; }
    const existing = previous[href];
    return existing?.label === chip.label && existing.tone === chip.tone ? previous : { ...previous, [href]: chip };
  }), []);
  const status = chips[pathname];
  // Keep the navigator in the same child position across resize to retain feature state.
  return <TopbarStatus value={setChip}><View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background }}>
    {desktop ? <View style={{ width: wide ? tokens.layout.sidebarWidth : tokens.layout.compactSidebarWidth, backgroundColor: theme.colors.surface, borderRightWidth: 1, borderColor: theme.colors.outlineVariant, padding: tokens.spacing.medium, gap: tokens.spacing.large }}>
      <View style={{ gap: tokens.spacing.small, paddingVertical: tokens.spacing.medium }}>
        <View style={{ backgroundColor: tokens.surfaces.light.surface, padding: tokens.spacing.small, borderRadius: tokens.radius.field }}>
        <Image source={require('../../../assets/images/bomedia-logo.png')} resizeMode="contain" accessibilityLabel="BOMedia" style={{ width: '100%', height: tokens.layout.brandHeight }} />
        </View>
        <Text variant="labelSmall" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>SALES MANAGEMENT</Text>
      </View>
      <View style={{ gap: tokens.spacing.small }}>
        {destinations.map(item => <Link key={item.href} href={item.href} asChild>
          <Button icon={item.icon} mode={pathname === item.href ? 'contained-tonal' : 'text'} accessibilityState={{ selected: pathname === item.href }} contentStyle={{ justifyContent: 'flex-start' }} style={{ borderRadius: tokens.radius.field }}>{item.label}</Button>
        </Link>)}
      </View>
      <View style={{ flex: 1 }} />
    </View> : null}
    <View style={{ flex: 1, minWidth: 0 }}>
      {desktop ? <View style={{ minHeight: tokens.layout.topbarHeight, paddingHorizontal: tokens.spacing.large, paddingVertical: tokens.spacing.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.medium, borderBottomWidth: 1, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }}>
        <View style={{ flex: 1, gap: tokens.spacing.small }}><Text accessibilityRole="header" variant="titleLarge">{current?.label ?? 'BOMedia'}</Text><Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{current?.description}</Text></View>
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: tokens.spacing.small }}>
          {status ? <StatusChip label={status.label} tone={status.tone} /> : null}
          <StatusChip label="Development" />
        </View>
        {pathname === '/records' ? <Link href="/" asChild><Button mode="contained" icon="plus">New sale</Button></Link> : pathname === '/payments' ? <Link href="/customers" asChild><Button mode="contained-tonal" icon="account-search">Find customer</Button></Link> : null}
      </View> : null}
      {children}
    </View>
  </View></TopbarStatus>;
}
