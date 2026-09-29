import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';
import { DatePickerSheet } from '@/components/ui/date-picker-sheet';
import { addDays, canGoNext, canGoPrevious, dateParts, dayWindow, fullLagosDate, lagosTime, relativeDayLabel } from '@/features/records/lagos-date';
import { tokens } from '@/theme/tokens';

export type DayStatus = 'finalized' | 'needsReview' | 'open' | 'none';
const statusLabels: Record<DayStatus, string> = { finalized: 'Finalized', needsReview: 'Needs review', open: 'Open', none: 'No entries' };

// Geometry of the .daybar block in docs/design/cash-day-navigator-reference.html, kept one-for-one.
// The owner limited new tokens to the status-dot colours, so these stay local to this component.
const size = {
  card: { radius: 16, padding: 12, gap: 12 }, row: 12, stepperGap: 6, circle: 40, chevron: 18,
  date: { radius: 12, padding: 4, paddingRight: 12, gap: 12, textMinWidth: 196 },
  calendar: { width: 44, height: 48, radius: 10, month: 10, monthSpacing: 1, day: 19 },
  relative: 17, chevronDown: 14, full: 12.5, pill: { vertical: 8, horizontal: 14, text: 13 },
  sync: { gap: 10, dot: 8, text: 12, icon: 16, iconGap: 6 },
  strip: { gap: 6, tileRadius: 12, tileTop: 8, tileSide: 4, tileBottom: 9, tileGap: 3, weekday: 11, weekdaySpacing: 0.6, day: 17, status: 11, dot: 7, ring: 1.5, statusGap: 5, phoneTile: 56 },
  phoneBreakpoint: 600,
  // The reference sets body line-height 1.45 and 1.2 on the strip day number; React Native's default is tighter.
  lineHeight: (fontSize: number, ratio = 1.45) => Math.round(fontSize * ratio * 10) / 10,
};

/**
 * Business-date navigator: step a day, pick a date, jump to today, refresh, and a seven-day strip.
 * Pass `dayStatuses` to show each day's state (Cash close state); without it the strip shows dates only.
 * Dates are Lagos calendar days (yyyy-mm-dd). Nothing after today is selectable or shown.
 */
export function DayNavigator({ selectedDate, onChange, today, minDate, dayStatuses, lastSyncedAt, onRefresh, refreshing, refreshLabel, disabled = false }: {
  selectedDate: string; onChange: (date: string) => void; today: string; minDate?: string;
  dayStatuses?: Record<string, DayStatus>; lastSyncedAt: string | null; onRefresh: () => void; refreshing: boolean;
  refreshLabel: string; disabled?: boolean;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const phone = width < size.phoneBreakpoint;
  const [picking, setPicking] = useState(false);
  const dots = tokens.cashDay[theme.dark ? 'dark' : 'light'];
  const dotColor: Record<DayStatus, string> = { finalized: dots.finalized, needsReview: dots.needsReview, open: dots.open, none: theme.colors.outlineVariant };
  const parts = dateParts(selectedDate);
  const previous = !disabled && canGoPrevious(selectedDate, minDate);
  const next = !disabled && canGoNext(selectedDate, today);
  const days = dayWindow(selectedDate, today, minDate);

  const circle = (icon: 'chevron-left' | 'chevron-right', enabled: boolean, label: string, onPress: () => void) =>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !enabled }} disabled={!enabled} onPress={onPress}
      style={({ pressed, hovered }) => ({ width: size.circle, height: size.circle, borderRadius: tokens.radius.pill, borderWidth: 1, borderColor: theme.colors.outlineVariant, alignItems: 'center', justifyContent: 'center',
        backgroundColor: enabled && (pressed || hovered) ? theme.colors.surfaceVariant : theme.colors.surface, opacity: enabled ? 1 : 0.35 })}>
      <MaterialCommunityIcons name={icon} size={size.chevron} color={theme.colors.onSurface} />
    </Pressable>;

  const jump = selectedDate !== today ? <Pressable accessibilityRole="button" disabled={disabled} onPress={() => onChange(today)}
    style={({ pressed, hovered }) => ({ borderWidth: 1, borderColor: theme.colors.primary, borderRadius: tokens.radius.pill, paddingVertical: size.pill.vertical, paddingHorizontal: size.pill.horizontal, minHeight: size.circle, justifyContent: 'center',
      backgroundColor: pressed || hovered ? theme.colors.primaryContainer : theme.colors.surface })}>
    <Text style={{ color: theme.colors.primary, fontSize: size.pill.text, fontWeight: '600' }} numberOfLines={1}>Jump to today</Text>
  </Pressable> : null;

  return <View style={{ backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: size.card.radius, padding: size.card.padding, gap: size.card.gap }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size.row, flexWrap: phone ? 'nowrap' : 'wrap' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: size.stepperGap, flexShrink: 1, minWidth: 0 }}>
        {circle('chevron-left', previous, 'Previous day', () => onChange(addDays(selectedDate, -1)))}
        <Pressable accessibilityRole="button" accessibilityLabel={`Choose a date, currently ${fullLagosDate(selectedDate).replace(',', '')}`} disabled={disabled} onPress={() => setPicking(true)}
          style={({ pressed, hovered }) => ({ flexDirection: 'row', alignItems: 'center', gap: size.date.gap, borderRadius: size.date.radius, borderWidth: 1, paddingVertical: size.date.padding, paddingLeft: size.date.padding, paddingRight: size.date.paddingRight, flexShrink: 1, minWidth: 0,
            borderColor: pressed || hovered ? theme.colors.outlineVariant : 'transparent', backgroundColor: pressed || hovered ? theme.colors.surfaceVariant : 'transparent' })}>
          <View style={{ width: size.calendar.width, height: size.calendar.height, borderRadius: size.calendar.radius, borderWidth: 1, borderColor: theme.colors.outlineVariant, overflow: 'hidden', backgroundColor: theme.colors.surface }}>
            <Text style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary, fontSize: size.calendar.month, fontWeight: '700', letterSpacing: size.calendar.monthSpacing, textAlign: 'center', paddingVertical: 2 }}>{parts.month}</Text>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: size.calendar.day, lineHeight: size.calendar.day, fontWeight: '700', color: theme.colors.onSurface, fontVariant: ['tabular-nums'] }}>{parts.day}</Text></View>
          </View>
          <View style={{ minWidth: phone ? 0 : size.date.textMinWidth, flexShrink: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: size.stepperGap }}>
              <Text numberOfLines={1} style={{ fontSize: size.relative, lineHeight: size.lineHeight(size.relative), fontWeight: '700', color: theme.colors.onSurface, flexShrink: 1 }}>{relativeDayLabel(selectedDate, today)}</Text>
              <MaterialCommunityIcons name="chevron-down" size={size.chevronDown} color={theme.colors.onSurfaceVariant} />
            </View>
            <Text numberOfLines={1} style={{ fontSize: size.full, lineHeight: size.lineHeight(size.full), color: theme.colors.onSurfaceVariant }}>{phone ? `${parts.weekday} ${parts.day} ${parts.month.charAt(0)}${parts.month.slice(1).toLowerCase()} ${selectedDate.slice(0, 4)}` : fullLagosDate(selectedDate)}</Text>
          </View>
        </Pressable>
        {circle('chevron-right', next, 'Next day', () => onChange(addDays(selectedDate, 1)))}
      </View>
      {!phone ? jump : null}
      <View style={{ flex: 1, minWidth: 0 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: size.sync.gap }}>
        {!phone ? <>
          <View style={{ width: size.sync.dot, height: size.sync.dot, borderRadius: tokens.radius.pill, backgroundColor: dots.finalized }} />
          <Text style={{ fontSize: size.sync.text, color: theme.colors.onSurfaceVariant }} numberOfLines={1}>{lastSyncedAt ? `Synced ${lagosTime(lastSyncedAt)}` : 'Not synced yet'}</Text>
        </> : null}
        <RefreshButton label={refreshLabel} refreshing={refreshing} iconOnly={phone} onPress={onRefresh} />
      </View>
    </View>
    {phone && jump ? <View style={{ alignItems: 'flex-end' }}>{jump}</View> : null}
    <Strip days={days} selected={selectedDate} today={today} statuses={dayStatuses} dotColor={dotColor} phone={phone} disabled={disabled} onSelect={onChange} />
    <DatePickerSheet visible={picking} date={selectedDate} today={today} minDate={minDate} onSelect={onChange} onClose={() => setPicking(false)} />
  </View>;
}

function RefreshButton({ label, refreshing, iconOnly, onPress }: { label: string; refreshing: boolean; iconOnly: boolean; onPress: () => void }) {
  const theme = useTheme();
  const [spin] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => { void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {}); }, []);
  useEffect(() => {
    if (!refreshing || reduceMotion) { spin.stopAnimation(); spin.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }));
    loop.start();
    return () => loop.stop();
  }, [refreshing, reduceMotion, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: refreshing, busy: refreshing }} disabled={refreshing} onPress={onPress}
    style={({ pressed, hovered }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: size.sync.iconGap, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: tokens.radius.pill,
      minHeight: size.circle, minWidth: size.circle, paddingVertical: iconOnly ? 0 : size.pill.vertical, paddingHorizontal: iconOnly ? 0 : size.pill.horizontal,
      backgroundColor: pressed || hovered ? theme.colors.surfaceVariant : theme.colors.surface, opacity: refreshing ? 0.7 : 1 })}>
    <Animated.View style={{ transform: [{ rotate }] }}><MaterialCommunityIcons name="refresh" size={size.sync.icon} color={theme.colors.primary} /></Animated.View>
    {!iconOnly ? <Text style={{ color: theme.colors.primary, fontSize: size.pill.text, fontWeight: '600' }} numberOfLines={1}>{label}</Text> : null}
  </Pressable>;
}

function Strip({ days, selected, today, statuses, dotColor, phone, disabled, onSelect }: {
  days: string[]; selected: string; today: string; statuses?: Record<string, DayStatus>; dotColor: Record<DayStatus, string>;
  phone: boolean; disabled: boolean; onSelect: (date: string) => void;
}) {
  const theme = useTheme();
  const scroll = useRef<ScrollView>(null);
  const [viewport, setViewport] = useState(0);
  // Phone: keep the selected tile in view inside the horizontally scrolling strip.
  useEffect(() => {
    if (!phone || !viewport) return;
    const index = days.indexOf(selected);
    const x = index * (size.strip.phoneTile + size.strip.gap) - (viewport - size.strip.phoneTile) / 2;
    scroll.current?.scrollTo({ x: Math.max(0, x), animated: false });
  }, [phone, viewport, days, selected]);
  const tiles = days.map(day => {
    const parts = dateParts(day); const active = day === selected; const isToday = day === today;
    const status = statuses?.[day];
    const ink = active ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant;
    const weekdayLong = fullLagosDate(day).split(',')[0];
    return <Pressable key={day} disabled={disabled} accessibilityRole="tab" accessibilityState={{ selected: active }}
      accessibilityLabel={`${weekdayLong} ${parts.day}${isToday ? ', today' : ''}${status ? `, ${statusLabels[status].toLowerCase()}` : ''}`} onPress={() => onSelect(day)}
      style={({ pressed, hovered }) => ({ flex: phone ? undefined : 1, width: phone ? size.strip.phoneTile : undefined, minHeight: size.circle, borderRadius: size.strip.tileRadius, borderWidth: 1,
        paddingTop: size.strip.tileTop, paddingHorizontal: size.strip.tileSide, paddingBottom: size.strip.tileBottom, alignItems: 'center', gap: size.strip.tileGap,
        borderColor: active ? theme.colors.primary : 'transparent', backgroundColor: active ? theme.colors.primaryContainer : pressed || hovered ? theme.colors.surfaceVariant : 'transparent' })}>
      <Text numberOfLines={1} style={{ fontSize: size.strip.weekday, lineHeight: size.lineHeight(size.strip.weekday), fontWeight: '600', letterSpacing: size.strip.weekdaySpacing, color: ink }}>{parts.weekday.toUpperCase()}{isToday && !phone ? ' · TODAY' : ''}</Text>
      <Text style={{ fontSize: size.strip.day, lineHeight: size.lineHeight(size.strip.day, 1.2), fontWeight: '600', fontVariant: ['tabular-nums'], color: active ? theme.colors.onPrimaryContainer : isToday ? theme.colors.primary : theme.colors.onSurface }}>{parts.day}</Text>
      {status ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: size.strip.statusGap, maxWidth: '100%' }}>
        <View style={{ width: size.strip.dot, height: size.strip.dot, borderRadius: tokens.radius.pill, flexShrink: 0,
          backgroundColor: status === 'open' ? 'transparent' : dotColor[status], borderWidth: status === 'open' ? size.strip.ring : 0, borderColor: dotColor.open }} />
        <Text numberOfLines={phone ? 2 : 1} style={{ fontSize: size.strip.status, lineHeight: size.lineHeight(size.strip.status), color: ink, flexShrink: 1, textAlign: 'center' }}>{statusLabels[status]}</Text>
      </View> : null}
    </Pressable>;
  });
  const frame = { borderTopWidth: 1, borderColor: theme.colors.outlineVariant, paddingTop: size.card.gap } as const;
  return phone
    ? <View style={frame} onLayout={event => setViewport(event.nativeEvent.layout.width)}>
        <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={{ gap: size.strip.gap }}>{tiles}</ScrollView>
      </View>
    : <View accessibilityRole="tablist" style={{ ...frame, flexDirection: 'row', gap: size.strip.gap }}>{tiles}</View>;
}
