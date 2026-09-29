export const tokens = {
  controls: { stepperButtonWidth: 30, stepperIconSize: 20, choiceMinWidth: 140, dateLabelMinWidth: 132, summaryMinWidth: 280, rowActionWidth: 180 },
  invoice: { railWidth: 360 },
  sheet: { min: 0.45, initial: 0.7, max: 0.9, increment: 0.1, handleWidth: 48, handleHeight: 5 },
  spacing: { tiny: 2, extraSmall: 4, small: 8, medium: 16, large: 24, extraLarge: 32 },
  radius: { field: 8, card: 16, sheet: 28, pill: 999 },
  layout: { tabletBreakpoint: 760, workspaceBreakpoint: 900, wideBreakpoint: 1200, sidebarWidth: 232, compactSidebarWidth: 184, topbarHeight: 64, brandHeight: 48, formWidth: 560, desktopWidth: 1200, workspaceGutter: 24, touchTarget: 48, stepBadge: 32, statusDot: 6, dimensionMinWidth: 84, quantityWidth: 104 },
  avatar: { compact: 32, comfortable: 36 },
  calendarBadge: { width: 44, height: 48 },
  // Cash day close-state dots (docs/design/cash-day-navigator-reference.html). Semantic, not role
  // accents; a word always accompanies each dot. "No entries" uses the surface outlineVariant.
  cashDay: {
    light: { finalized: '#3f7d2c', needsReview: '#c28a00', open: '#8a8f86' },
    dark: { finalized: '#8fc77a', needsReview: '#e2b845', open: '#899180' },
  },
  typography: { eyebrowSpacing: 1.2 },
  surfaces: {
    light: { background: '#f6f5f2', surface: '#ffffff', surfaceVariant: '#efeee9', onSurface: '#20231f', onSurfaceVariant: '#555a54', outline: '#777b73', outlineVariant: '#e1e3dc' },
    dark: { background: '#141613', surface: '#1c1f1b', surfaceVariant: '#292d27', onSurface: '#edf0e7', onSurfaceVariant: '#bdc4b6', outline: '#899180', outlineVariant: '#3b4136' },
  },
  roles: {
    staff: { primary: '#cc5500', container: '#ffdbc7', onContainer: '#351000', darkPrimary: '#ffb68d' },
    admin: { primary: '#2b3493', container: '#dfe0ff', onContainer: '#080f59', darkPrimary: '#bec2ff' },
  },
} as const;
export type AppRole = keyof typeof tokens.roles;
