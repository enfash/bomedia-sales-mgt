---
name: bomedia-ui
description: Design, implement, or review BOMedia Sales Manager screens, navigation, responsive layouts, and shared UI using Expo Router and React Native Paper. Apply to BOMedia UI work across web, tablet, and mobile.
---

# BOMedia UI

## Context and authority

Read the repository's `AGENTS.md` and required continuity documents first. Read [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) for the approved visual contract and [PRODUCT_SPECIFICATION.md](../../PRODUCT_SPECIFICATION.md) for product scope. Read the exact Expo SDK documentation required by AGENTS.md before writing application code.

These are project-specific presentation rules. Follow subsequent explicit owner decisions. They do not authorize deployments, financial writes, new product modules, or previously withheld actions.

## Platform layouts

Design desktop web as an operations workspace. Use a persistent labelled sidebar on wide screens, a topbar for page context and relevant actions, and a wide main content area. Use compact or collapsible navigation at intermediate widths and compact navigation at narrow widths. Mobile remains touch-first with bottom/stack navigation and focused workflows.

Choose responsive thresholds from actual content fit and keep them in shared tokens. The pasted conversation's 768/1200 breakpoints are suggestions, not approved constants. Check narrow browser windows as well as native screens; do not choose the desktop shell solely because the platform is web.

Share calculations, validation, queries, permissions, durable drafts and submission state. Let shells and data presentation differ by available space. Keep Expo Router routes thin and retain deep links, active-route highlighting, browser back navigation and focus refresh. Resizing must not clear drafts, selected records or pending submission recovery.

Reuse or extend shared layout components for the sidebar, topbar and page container. A narrow form width belongs to suitable forms, not every desktop page. Do not duplicate whole feature implementations to obtain different layouts.

## Navigation and scope

Build navigation from implemented routes and approved capabilities. At adoption these are New sale, Records, Customers, Payments and Cash; verify current source before editing. Do not add decorative Dashboard, Jobs, Inventory, Reports or Staff destinations unless the corresponding feature is in the authorized task.

Sidebar items need readable labels, supporting icons and a clear active state. Group items only when it improves scanning. Separate account controls from primary navigation. Do not duplicate primary navigation in the topbar or display controls for nonexistent search, notifications or bulk actions. Server permissions remain authoritative regardless of hidden navigation.

## Page composition

- Records and customer lists: prefer aligned tables at desktop widths and readable lists/cards at narrow widths. Keep identifiers, customer, date, amount and status easy to compare. Right-align money and use tabular numerals where supported. Retain exact money formatting and number-to-copy behaviour.
- Table toolbars: expose relevant implemented search, filters, refresh and pagination. Add sorting only when its data contract supports it; sorting a single fetched page must not imply globally sorted results. Label status with text as well as colour.
- Forms: group related fields into logical sections. Use columns when field relationships and reading order support them; give long text and complex inputs enough room. Sale entry can pair editing with invoice review on wide screens. Preserve full invoice review and explicit confirmation before submission.
- Details and review: mobile retains the approved adjustable sheet. Desktop may use a bounded dialog or side panel suited to the task. Preserve dismiss-to-draft behaviour, keyboard access, focus return, visible close controls and recovery states.
- Summaries: use useful operational totals with clear labels and hierarchy. Distinguish sales, collections, debt and expected drawer cash. Display pending, confirmed, rejected, loading, empty, stale and failed states accurately. Do not fabricate charts or figures to fill space.

## BOMedia visual character

Use React Native Paper with `src/theme/tokens.ts`, `src/theme/theme.ts` and existing shared UI. Preserve user logos/assets and the approved staff orange/admin blue accents; the conversation's alternative brand hex is not a replacement. Extend shared tokens when necessary instead of creating per-screen palettes, spacing scales or radii.

Aim for a calm, readable business tool: clear typography, restrained accents, neutral surfaces, aligned numbers and compact desktop controls. Establish hierarchy through spacing, borders and typography before shadows. Avoid giant empty headers, unrelated gradients, colourful KPI tiles, nested cards, excessive pills and oversized desktop buttons. Keep touch targets usable on mobile and tablet; density must not sacrifice readability or keyboard focus.

## Workflow and completion evidence

Before editing, identify the desktop and mobile compositions, shared state and platform-specific presentation. Inspect existing components and the working diff; preserve unrelated work. Make routine presentation decisions within these rules without repeatedly seeking approval.

For a UI change, inspect representative narrow mobile, intermediate and wide desktop layouts, including long labels, financial values and overflow. Check relevant light/dark and role presentations, focus/keyboard behaviour and native touch/keyboard handling. For shell changes, specifically check navigation, resize state retention and pending recovery. Use safe previews or read-only flows when live financial writes are not authorized.

Run checks appropriate to the change. Report which layouts and behaviours were actually inspected and which remain untested; documentation or a screenshot alone is not proof of authenticated flow correctness. Update canonical design status and HANDOFF.md, distinguishing rules from implemented behaviour. A UI task is complete only when its authorized scope meets these rules and remaining verification limits are explicit.
