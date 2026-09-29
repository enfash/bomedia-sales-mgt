# Central UI foundation

Updated 7 September 2026. See HANDOFF.md and BACKEND_SETUP.md for current implementation and remaining work.

## Platform design rules — approved 8 September 2026

The owner requested persistent project instructions following the supplied web/mobile design conversation. [BOMedia UI skill](skills/bomedia-ui/SKILL.md) is mandatory for UI work through AGENTS.md. It defines desktop sidebar/topbar/workspace, responsive data presentation, mobile interaction patterns, shared tokens and verification expectations. Existing role colours and product scope remain authoritative; sample modules and breakpoints in the conversation are not adopted wholesale.

Implementation status (8 September follow-up): AppShell now provides a labelled web sidebar and topbar from 900px, compact sidebar below 1200px, and retained bottom tabs on narrower web/native. Records and Customers use wide tables in the desktop workspace. New Sale pairs entry sections and invoice from 1200px. Breakpoints and shell sizes are shared tokens; Page retains form-width default for other flows. The same navigator stays mounted across resize. Authenticated visual, resize-state and native regression checks remain pending; successful builds are not visual approval. Payments/Cash contents and review-sheet presentation retain their existing layouts.

## Approved presentation contract

Use Expo Router and React Native Paper throughout. `src/theme/tokens.ts` is the source for palettes, spacing, radii, content widths, touch targets and sheet sizes. `src/theme/theme.ts` supplies light/dark Paper themes for verified staff/admin roles. Staff primary #cc5500; admin primary #2b3493. Semantic status colours retain consistent meaning. Role colour is presentation; permissions are enforced by the backend.

Shared UI:
- `src/components/ui/page.tsx`: safe-area-aware scrolling and content width.
- `choice-buttons.tsx`: controlled selectors. FEET/INCHES is compact and right-aligned beside its label, retaining a usable touch area and literal typed dimension values. Payment Cash/POS/Transfer has no initial selection.
- `copyable-amount.tsx`: tap the number itself to copy decimal naira, with inline feedback; no separate copy button.
- `review-sheet.tsx`: adjustable-height bottom sheet with drag handle, close/expand controls, safe areas and keyboard handling. Dismissal preserves the draft. Device gestures remain to be verified.

Keep route files thin. Reuse Paper typography, semantic theme values and shared components instead of independent screen styles. Change shared tokens/components when a UI adjustment should apply across the product. Business values come from authorized server data; UI tokens are not business configuration.

## Current sales implementation

`src/features/sales/sales-screen.tsx` now uses live catalogue/customer services and persistent drafts; fictional preview fixtures have been removed. It supports multiple editable printing items, calculated/charged copyable values, invoice minimum adjustment, payment selection, required phone on debt, complete invoice preview and actual development-database submission. Customer search explicitly selects an existing stable ID or a new customer draft. Submission is frozen until confirmed and retries reuse the same ID.

Domain money arithmetic remains exact and serialized as strings. Material rates and minimum/rounding rules come from Supabase; only authorized future admin operations may change them. Full offline entry, admin management and final physical-device visual approval remain unfinished. Do not infer their appearance or behavior from old sample mockups.

## Records and Customers (read-only)

A bottom-tab navigator (`src/app/(tabs)/_layout.tsx`) now hosts New sale, Records and Customers, matching the staff navigation proposal in PRODUCT_SPECIFICATION.md §8 (final approval still open). Both new screens reuse `Page`, `ReviewSheet`, and `CopyableAmount` rather than introducing new UI primitives. Records shows sales for a Lagos business date (staff limited to the seven-day RLS window already enforced server-side; admin unrestricted) with a detail sheet for items/payments. Customers shows count/total-debt summary cards, a debounced searchable balance list, and a detail sheet of a selected customer's outstanding invoices; its Pay debt and invoice actions open the Payments tab, where fresh server debt is reviewed before confirmation. Both screens share `useFocusedPage` for cancellable query-scoped reads and reload on tab focus/app foreground. Explicit refresh actions and progress/error text keep snapshot freshness visible; customer balances are not presented as a realtime feed. Detail-sheet content remains keyed on the selected id. Payment review must independently revalidate debt before writes are enabled.

Run appropriate TypeScript/lint checks and behavioral tests for changes. Verify keyboard, large text, narrow screens and native gestures on device before claiming release readiness.

## New Sale visual pass — 7 September 2026

Implemented a focused visual pass after the owner asked to make BOMedia distinctive while retaining Paper. Shared neutral light/dark surfaces now live in `tokens.surfaces` and feed the Paper theme. Orange/blue remain role accents. New shared `FormSection` provides numbered sections; `StatusNote` gives readable save/error feedback. `CopyableAmount` supports emphasized totals and contrast-aware text on accent containers.

New Sale uses Customer / Printing details / Your invoice sections, grouped width/height inputs (wrapping on narrow screens), a distinct current-item calculation panel, and reusable `InvoiceItem` / `InvoiceTotals` components for both the draft and final review. Payment choices still have no default. Compact FEET/INCHES now shares a single pill track aligned right. The review sheet keeps its drag handle; expand/reduce and close are accessible header icon controls, removing the separate expand row.

The UI was inspected in an isolated component preview at 390px and 320px widths, including staff light and admin light/dark, plus expanded invoice review. This preview imports the actual shared components but uses fictional values and cannot save a sale. It does not establish authenticated app-flow or native keyboard/gesture correctness. Final user visual approval remains pending. No database, pricing, permission or durable-submission logic changed in this pass.


## Payments — 8 September implementation

Payments adds a fourth tab for recoverable submissions and local receipt history. Entry starts from a customer or invoice. A shared FormSection holds exact amount and initially-unselected Cash/POS/Transfer ChoiceButtons; review uses ReviewSheet with the drag handle and expansion controls. It shows customer, amount, method and invoice allocations before explicit confirmation. CopyableAmount remains number-to-copy. Pending and confirmed states are distinct; receipts name the collector and surface unapplied amounts requiring admin review. No new screen-specific theme. Android visual/gesture and authenticated flow QA remain pending.


8 September native check: payment review and expand control inspected on Android emulator. Shared sheet now uses a stable PanResponder with event-only gesture refs; upward drag verified after fixing a baseline reset. Downward/close retest was interrupted by the development connection and remains pending. Screenshot: `/tmp/bomedia-payment-review-android.png` (unsaved review, no receipt submitted).


## Shared collections — 8 September

Payments history uses shared ChoiceButtons to switch Shared activity / This device. FormSection groups collection totals, Lagos-date controls, refresh and receipt cards. Tap a receipt for collector/timestamps/invoice allocation detail in ReviewSheet. Admin has an all-dates unapplied filter; no resolution action exists. All figures remain number-to-copy, semantic theme and central tokens. Collection totals explicitly exclude any claim of drawer balance. Android receipt detail, downward drag, close and admin queue empty state verified.


## Implementation update — 8 September 2026: Cash foundation

Cash now uses the same shared Page, FormSection, ChoiceButtons, CopyableAmount and adjustable ReviewSheet as the other flows. Cash/POS/Transfer starts unselected for outgoing entries; opening represents physical cash only. Missing opening must show expected cash unavailable. Calculated expected balance is not a closing count. Shared server totals and this-device saved entries are explicitly labeled. New cash form fields are not yet persisted until submission.


## Cash recovery state — 8 September 2026

Server-confirmed rejected cash requests appear as “Not recorded” with a reason in Saved on this device. Keep the history card; remove its retry action only after a matching terminal result is persisted. Unknown outcomes keep Retry saved entry and block new entry. Confirmed receipts retain their existing presentation. No financial corrections are implied by resolving an unrecorded request.


## Adaptive workspace follow-up — 9 September 2026

Applied the owner-requested expo:building-native-ui skill together with the mandatory BOMedia UI skill. Paper, existing role themes, exact full financial values and shared components take precedence over generic Apple-specific library suggestions. Desktop keeps permanent navigation, structured page title/description and contextual route actions. WorkspaceToolbar groups existing date/search/refresh controls; no unsupported global sort/filter is implied. Shared tablet threshold 760 enables roomy content and wrapping toolbars/metric grids; narrow layouts stack. Cash has summary/entry columns on wide desktop, a wider tablet workspace and a desktop outgoing table. Payments uses a desktop receipt table with retained unapplied indicators and existing date/admin filters. Native/narrow list and recovery flows remain intact.

QA-driven fixes: the unmodified blue logo has a shared light surface backing for dark contrast; removed redundant Records/Customers page titles; padded table cells and retained aligned full money values. FocusedScene excludes inactive web content from keyboard navigation while retaining mounted state. Interactive record/customer rows have explicit button semantics.

Observed before the browser tab closed: signed-in admin dark at 1440/950/390 widths, New Sale split layout, Customers table/cards and retained search, customer detail retained across resize, keyboard opening of a customer detail, invoice table at 950 with a seven-digit naira amount, invoice detail and browser Back. Latest structured headers/toolbars/Cash/Payments refinements require fresh signed-in visual review. Native devices, staff/light variants, longest labels, pending-submission resize recovery and populated Cash outgoing table remain unverified. Existing mobile ReviewSheet is retained; desktop dialog adaptation is future work.


### Signed-in verification — 9 September follow-up

The replacement browser is now signed in. Latest admin-light Cash was visually inspected at 1440/820/390 widths, confirming desktop columns, tablet grouped totals and mobile stacked content. Payments was inspected at 1440/950 with an existing prior-day receipt; its detail survived resize to 390 and closed correctly. Find customer and Records → New sale header links worked; current Customers search/refresh toolbar and full balances rendered. This supersedes the sign-in blocker above. Physical devices, staff variants, extreme labels/text scaling, populated outgoing Cash rows and pending-operation resize recovery remain unverified. No financial records were created during these checks.


### Automatic next-sale form — 9 September 2026

Successful durable sale confirmation closes ReviewSheet and automatically refreshes prices, saves a fresh draft and shows blank customer/items/payment fields with standard defaults. Page is keyed to draft identity to reset scroll and child input state only for a new sale. A StatusNote names the saved invoice and any review flag; that note is restored from the durable `last-confirmed-sale` record whenever the screen remounts onto an untouched blank draft (web AuthGate re-checks unmount the tab tree on every visibility change), and clears once the user starts editing. Exceptional failure retains the confirmed state with “Retry opening blank sale”; uncertain submissions retain existing same-ID recovery. Existing drafts are not cleared during unrelated UI reloads.


### Access gate presentation — 9 September 2026

Re-verifying an already verified profile no longer replaces the workspace. `src/features/auth/access-policy.ts` decides what stays on screen: a verified profile survives routine re-checks (web tab focus, native foreground, token refresh) and survives a transport failure, keeping its object identity when nothing changed so screens keyed on it do not reload; the blocking "Checking your access…" page appears only before the first verified profile of a session; a definitive server denial (no profile row, inactive, unknown role) always returns the user to the access screen with a specific message. Consequence for every screen: in-memory state — an open ReviewSheet, an unsent payment amount, a success note, list snapshots, scroll position — now survives switching apps or tabs. Authorization is still enforced entirely by server RLS and RPC checks; this is presentation only.

### Design canvas — 9 September 2026

At the owner's instruction, UI work is drafted in a Claude design canvas first and the live pages are cross-checked against it. The first canvas, "BOMedia Sales Screens", proposes layouts for New sale, Records, Customers, Payments and Cash at 1440x900 and 390x844 and carries a twelve-point review of the current build. It is a proposal, not an approved contract: it reuses `tokens.ts` values and the existing shared components, and nothing in it changes a business rule, a permission or a stored value. Where it and `docs/skills/bomedia-ui/SKILL.md` differ, the skill wins. Its Customers sort control must not ship as a client-side sort of a single fetched page.


### Choice and blocked-action rules — 9 September 2026

Two rules now hold across the product, implemented first on New Sale.

A choice that carries a consequence shows that consequence inside the option. `ChoiceButtons` options take an optional `caption`, rendered after the label and included in the accessibility label, and New Sale's material buttons use it for the per-square-foot rate. The separate "Rate per square foot" row is gone: a rate read after the decision does not inform the decision. No material is preselected — the catalogue is ordered alphabetically, so the old `materials[0]` default started every item on Clear sticker at the highest rate. This matches the existing rule that a payment method is never preselected. Drafts saved before this change keep the material they already held; the new blank state appears on the next new sale.

A disabled action states what is missing, in a live region beside it. "Add item to invoice" reports no materials, no material chosen, missing dimensions, or the 200-item ceiling; "Review sale" reports an unfinished item edit or an empty invoice, replacing the standing "Check the payment and full invoice before submitting." only while it is blocked. The generic placeholder that used to sit where the calculation appears is gone, since the blocker text now says the same thing more precisely.


### One dominant figure per screen — 9 September 2026

New shared `src/components/ui/key-figure.tsx`. A screen that exists to answer one question leads with that answer: the figure at `displaySmall` with tabular numerals, its caption above, the arithmetic that produced it in a bordered column beside it on roomy widths and stacked beneath on narrow ones, and a note underneath. `CopyableAmount` gained a `hero` size for it; the figure stays copyable and exact like every other amount, and nothing rounds or abbreviates. When the figure cannot exist yet the component takes `unavailable` and states the action that would produce it — a missing input is not an error and must not read like one.

Applied to three screens whose data the deployed RPCs already return, with no query, migration or business-rule change:
- **Cash** leads with expected cash in the drawer, breaking down to opening (with the actor who counted it), cash received, expenses and withdrawals. With no opening count it reads "Count the opening cash to see the expected balance." POS and transfer outflows moved into their own "Outside the drawer" section, since they never touch physical cash.
- **Customers** leads with total outstanding debt and notes how many customers it is owed across, replacing the two equal-weight count/debt cards.
- **Payments** leads with the amount received on the selected date across all methods — the exact kobo sum of the server's own cash, POS and transfer totals, added with BigInt — breaking down by method with what each method does with the money. Unapplied money is now an attention `StatusNote` above the figure rather than only an admin filter.

Records now shows explicitly qualified totals for loaded invoices. A complete server-side day summary remains planned.


### Full-width workspace and list presentation — 9 September 2026

**Width.** `Page` no longer caps a `workspace` screen at `desktopWidth` (1200) and centres it; operations screens now fill the window, held off the edges by the new `tokens.layout.workspaceGutter` (24) on roomy widths and by `spacing.medium` below that. Tables and paired columns get the room a wide monitor offers instead of leaving equal empty margins. Non-workspace pages — sign-in, single-column forms — keep `formWidth` centred, because a form does not improve by getting wider. Measured at 1680: content runs from the sidebar edge to 24 px from the window edge. `desktopWidth` remains a token for anything that still wants a bounded column.

**StatusChip.** New shared `src/components/ui/status-chip.tsx`. Tones map onto the existing Paper role containers — `settled` (secondary), `owing` (error), `caution` (tertiary), `neutral` (surfaceVariant) — so no new palette entered the system. Every chip carries its word as well as its colour, so meaning survives greyscale, colour-blindness and a screen reader.

**Records.** `fetchSalesForDate` now embeds `payment_allocations(amount_kobo)` on the sales select, so each row's paid amount is complete regardless of paging; paid, balance and a `PaymentState` (`paid` / `part` / `unpaid` / `void`) are derived with exact BigInt kobo. The table shows Invoice, Customer with an inline "Flagged for review" chip, Time (Lagos wall clock), Total, Balance and a status chip; the almost-always-empty Review column is gone. Below the tablet breakpoint each invoice is a card with the chip on the first line and the balance shown only when something is owed. A day summary above the table gives Billed, Collected against these invoices and Still owed. Those three are sums of the rows actually loaded, so while more pages remain the caption says so explicitly rather than implying a complete day total; a genuine server-side day total is still the right end state.

**Card-layout choices.** `ChoiceButtons` takes `layout="card"`: a container-sized grid of pressable cards with the option label on the first line and its `caption` — the rate, the price — on a second line beneath, rather than the two run together on one line. Paper's `Button` clamps its child to a single line, so a two-line option cannot be a Button; the card variant is a `Pressable` styled from the same tokens (16px radius, `outlineVariant` border, `touchTarget` minimum height, shared minimum choice width; measured container space selects one, two or four columns). Selected is a filled `primary` card with `onPrimary` text — verified legible in both light and dark. New Sale's material picker uses it; the chip layout is unchanged for everything else, including the compact FEET/INCHES control.

**Row actions and nested buttons.** `DataTable.Row` always wraps its children in a `TouchableRipple`, which is a `<button>` on web — with or without `onPress`. Any control placed inside one therefore nests buttons, which React rejects as invalid DOM and which makes the inner control's press behaviour unreliable. A row that carries its own action must NOT be a `DataTable.Row`: build it from `View`s with the row metrics (minHeight `touchTarget`, `spacing.medium` horizontal padding, 1px `outlineVariant` bottom border) and give each interactive part its own control. Rows whose cells are pure text may keep `DataTable.Row` and its whole-row `onPress`; Records, Payments and Cash do. This bit us once on Customers — check it whenever a list row gains a button.

**Customers.** Rows gain an initials avatar and a per-row "Record payment" action routing to the Payments entry the detail sheet already used; a settled customer shows a Settled chip instead. Open-invoice counts, oldest-unpaid dates and sorting appear in the design canvas but are NOT implemented: `customer_balances` returns only id, name, phone and balance, and sorting a single fetched page would misrepresent the whole list. Both need server work before they ship.


### Live invoice rail and grouped date navigator — 9 September 2026

**New Sale rail.** `InvoiceTotals` now renders from the moment the screen opens, not only once an item exists: with an empty invoice the running figures are zero rather than absent, so the number a person watches while quoting never appears from nowhere or shifts the layout under them. The empty-invoice explanation stays above it. The minimum-adjustment line still appears only when an adjustment is actually applied — the canvas draws it as an em dash, but a row that is empty almost always is exactly what finding 5 of the review argued against, so it stays conditional.

**Customers rows and tokens.** Customers is the one workspace list that does not use `WorkspaceTable`. Its rows carry a "Record payment" button, and every `WorkspaceTable` row is a `DataTable.Row`, which Paper always wraps in a `TouchableRipple` — a `<button>` on web — so a control inside one nests buttons and React errors. Customers therefore builds its rows from plain `View`s and keeps the explanatory comment above the header. Its column and avatar geometry are tokens, not literals: `controls.rowActionWidth` sizes the action column in both header and cell, `avatar.compact` / `avatar.comfortable` size the initials, and the initials' `labelStyle` spreads Paper's `theme.fonts.labelMedium` / `labelLarge` rather than naming a font size — an avatar label is type, so it belongs on the type ramp.

**Records date navigator.** The two chevrons and the label are one bordered pill (`radius.pill`, `outlineVariant`), with the arrows immediately either side of a 132px label column instead of at opposite ends of a 560px row — measured 214px overall against 440px of separation before. The label names what it is showing: "Today", "Yesterday", or the readable date, with `readableLagosDate` (new, in `lagos-date.ts`) underneath as a subtitle in every state. The forward arrow is disabled and visibly so on the latest permitted date. Formatting is done in UTC because a business date is already a Lagos calendar date, not an instant to convert again.


### Item dimension row — 9 September 2026

Width, Height and Qty sit on one row: they are the three numbers that make a single item and were previously spread over two rows plus a full-width quantity field. Each dimension label carries the active unit — "Width (ft)" or "Width (in)" — so the FEET/INCHES choice is visible at the moment of typing rather than only in the toggle above; the labels re-render on toggle and the typed digits are untouched, as the pricing contract requires. A single decorative × sits between Width and Height — hidden from assistive technology, since a screen reader announces the labelled fields already — stating that the size is a multiplication. There is deliberately no second × before Qty: the pair carries the meaning, and the width it frees is exactly what lets the row stay on one line on a phone (owner's call). Qty uses shared `StepperField`: Paper's outlined `TextInput` owns the label, height, outline, typography and focus state. Its `render` slot contains a native input between separate chevron controls, preserving a clear number lane without Paper adornment padding. The stepper's width and control/icon sizes come from tokens. Width/Height/Qty outlines are all 50px high in the measured standard Paper configuration; do not hardcode that measurement as a field height. The overall Paper wrapper includes its own label inset. Native touch/keyboard and extreme text scaling still need device QA.

### Shared components and Claude artifact implementation — 10 September 2026

Approved reference: https://claude.ai/code/artifact/77cdd868-b632-4c96-96f6-b5fd28a7d550. Its sample names, money, rates and timestamps are design examples; live values must continue to come from the existing data contracts.

- **Field policy:** use Paper to own field geometry. Never manually reproduce Paper's border, floating label or height to make a custom field. Extend a shared field using its supported renderer when a composite input is needed; keep screen-specific layout outside its internal geometry.
- **Sizing policy:** theme tokens are the shared configuration. Presentation literals that recur across controls belong there or inside the shared component. Do not patch a screen with a second field height, button height, spacing scale or colour palette. Semantic table column weights may belong to the screen's single column definition; header and body must use that same definition.
- **Container adaptation:** `AdaptiveGrid` (also exported as `MetricGrid`), `ChoiceButtons` cards and `KeyFigure` measure their own available width. A desktop window can contain a narrow card: never select a split-card layout from window width alone. Grids fit as many readable columns as their shared minimum permits; material choices keep balanced one/two/four-column rows.
- **Actions and navigation:** `ActionButton` centralizes the Paper action touch target. `DateNavigator` is shared by Records and Payments; both show a named day and the actual Lagos business date. `RefreshControl` keeps progress and the last successful refresh time beside the control. Failed reads retain the previous timestamp; loading another page does not imply the earlier rows were refreshed. Review sheet resize bounds and increments all derive from `tokens.sheet`.
- **New Sale:** paired customer/phone fields when they fit, a wider desktop entry column and token-sized invoice rail; tablet fills available content space. A compact saved-status chip replaces the full-width band; desktop shows one environment marker in the shell. `ItemCalculation` uses `SummaryStrip` for area, calculated price, charged price and Add/Update action. Area is displayed to two decimal places; the charge still uses the full exact rational area and server-supplied rounding rule. Phone uses `Page.footer` and `InvoiceActionBar` for an always-visible total/Review action above navigation, with no absolute overlay hiding scroll content.
- **Tables:** `WorkspaceTable` aligns Records and Payments headings/cells from one column definition. Its rows open details and must contain no nested interactive controls. Payments uses Lagos collection time, labelled method chips and `PaymentAllocationSummary`, including actual invoice number/count and unapplied amount. Narrow layouts retain cards and the same allocations.
- **Payments attention:** admin sees an all-date unapplied-receipt alert from the existing protected `payment_activity` RPC, with a Review action. Its request participates in focus/foreground/explicit refresh and never invokes an admin query for staff. The all-date review summary is explicitly labelled all dates. Resolution remains unimplemented.
- **Cash wording:** Outside the drawer currently describes POS/transfer **outflows**, matching its RPC; these are not the artifact's POS/transfer collections.

Remaining reference differences: Cash needs opening timestamps/movement data and noncash collection totals before those reference details can be shown (customer ordering/age/open counts and Records server day totals shipped in migration 009). Invoice rail item density remains a presentation refinement. Do not fabricate these values or remove pending-recovery/device history to imitate the static mockup. Physical iOS/Android interaction and extreme text scaling remain unverified.

29 September 2026 — shell status and customer chip. `AppShell` exposes `useTopbarStatus(route, chip | null)`. A screen can use it to place one short status chip in the desktop topbar, beside the single Development marker. Chips are keyed by route because tabs stay mounted. New Sale uses it for draft/submission status on desktop, so no separate band of page space is spent on it (canvas critique 8). Phones keep the status and Development chips at the top of the page. `StatusChip` accepts an optional MaterialCommunityIcons `icon`, which is decorative and hidden from screen readers because the label carries the meaning. The New Sale Customer section header now shows a settled-tone check chip, "Existing customer" or "New customer". The picker adds a one-line note that a new customer is saved with the sale.

29 September 2026 — Cash closing. Canvas: https://claude.ai/code/artifact/18901ee8-dd4d-4c62-bdc0-7ec73d98c5d5 (draft; figures are the spec's worked example). Cash now has the shared DateNavigator: staff can go back six days, admin any date. The Closing count section shows expected vs counted, a difference chip (Short by / Over by / Balanced, with a copyable amount) and the count history with Used / Replaced / Backfilled chips. The Day status section shows Open / Finalized / Needs review, and admin Finalize / Reopen actions in the shared ReviewSheet (note required without an opening count; reopen reason required). On desktop the Cash topbar chip mirrors the day state through `useTopbarStatus`. Entry types for today are Opening cash, Closing count, Expense and Withdrawal. On an earlier date admin sees only Closing count (backfill), and staff see a read-only note. All components are existing shared primitives: no new tokens or palettes.

29 September 2026 — day navigator (owner edit of the Cash closing canvas). The shared `DateNavigator` is now: outlined step arrows; a pressable date showing a calendar badge (primary-colour month band and day number), a relative label (Today / Yesterday / N days ago) and the full date; and a Monday-first month picker in the shared ReviewSheet, bounded by `minDate` and today. "Jump to today" appears only on earlier days. Records and Payments pass `minDate` (today−6) for staff; Cash does the same. The new shared `DayStrip` shows seven recent days (ending at the selected date + 3, never after today), each with a dot and a word: Finalized, Needs review, Open, No entries. On narrow screens the word moves into the accessibility label. Dot colours are the new semantic `tokens.dayState` (light/dark), not role accents. Cash groups the navigator, refresh and strip in one surface card, matching the canvas. The canvas's "Synced" live dot was not adopted; the shared RefreshControl's "Updated HH:MM · Lagos" is kept.

29 September 2026 — shared DayNavigator (owner spec: docs/design/cash-day-navigator-reference.html, `.daybar`). `src/components/ui/day-navigator.tsx` replaces the Cash day card and is also used on Records. Props: selectedDate, onChange, today, minDate?, dayStatuses?, lastSyncedAt, onRefresh, refreshing, refreshLabel, disabled?. Its geometry is copied one-for-one from the reference and kept as a local `size` constant; the owner limited new tokens to the status dots, now `tokens.cashDay` light/dark (finalized, needsReview, open; "No entries" uses outlineVariant). The accent follows the role (admin blue, staff orange). Staff keep the seven-day read-only range through `minDate`. Records passes no statuses, so its strip shows dates only; no invoice statistics are invented. Below 600px: Jump to today moves under row 1, "Synced" is hidden, refresh is icon-only, the date line is shortened, and the strip scrolls with 56px tiles, keeping the selected tile in view. The month picker is the shared `DatePickerSheet`, also used by `DateNavigator`, which remains on Payments. The earlier `DayStrip` component and the `dayState`/`dayDot`/`dayTileHeight` tokens were removed.
Measured against the reference at 1200px in an isolated web preview with sample data: card 918×186, date button 270×58, calendar tile 44×48 and selected strip tile 122×77 all match. Known differences: the reference uses Roboto Flex, and the app uses Paper's theme font, so glyphs render slightly lighter. At 390px, row 1 cannot hold Jump to today at the reference sizes, so it sits on its own line, and two-word status labels wrap on 56px tiles.
