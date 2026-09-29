# BOMedia Sales Manager — V1 product specification

Version: 1.1 · 7 September 2026

This document records the product decisions agreed during discussion. Items explicitly labelled proposed or unresolved require review before their implementation. It supersedes conflicting descriptions in the supplied older functionality document. This is a specification, not a claim that the features have been built.

## 1. Purpose and success criteria

BOMedia is an internal sales and cash-management application for a large-format printing business in Lagos, Nigeria. It replaces fragile paper/Google Sheets workflows and reduces time spent crosschecking sales, collections, expenses, and debts at night.

V1 must reliably record one customer order containing 20 or more printing items, preserve work during unexpected connection failures, prevent duplicates on retries, and make daily reconciliation understandable. Start with three independent staff users, Android as the primary entry device, and web for administration. Currency is Nigerian naira (NGN).

## 2. Scope

Included:
- Admin-created accounts, login, and staff/admin roles; no public signup.
- Material catalogue, available roll widths, and admin-managed pricing.
- Multi-item sales, invoice generation, optional deposits, and later payments.
- Searchable records: today by default for staff, with a seven-day window; full history for admins.
- Customer directory, customer count, total outstanding debt, and access to older unpaid invoices.
- Customer-level oldest-debt-first payments and invoice-specific payments.
- Expenses with payment method, opening cash, owner withdrawals, counted closing cash, and reconciliation.
- Offline sales entry and reliable synchronization; exact offline permissions for other actions remain to be confirmed.
- Shared React Native Paper design system with role-specific accents.

Deferred:
- Production board and dedicated production users. Preserve individual sale items so production can be added later.
- Automatic print nesting, rotation, roll consumption, and waste optimization.
- Quote management, advanced analytics, notifications, customer portal, and other dashboard extras.
- Importing old data unless separately requested. No migration is authorized by this document.

## 3. Roles and permissions

| Capability | Staff | Admin |
| --- | --- | --- |
| Create sales using configured pricing | Yes | Yes |
| View sales records | Today by default; seven-day window | Full history |
| Find customers and older outstanding invoices | Yes | Yes |
| See customer count and total debt | Yes; debt includes all ages | Yes |
| Record customer/invoice payments | Yes | Yes |
| View payment history needed to understand a customer's debt | Yes, including colleagues' relevant entries | Yes |
| Edit prices/material settings | No | Yes |
| Correct/reverse payments or void sales | No | Yes; retain history |
| Manage staff/accounts | No | Yes |
| Log expenses | Yes | Yes |
| Enter opening/closing cash and withdrawals | Yes; shared drawer | Yes; shared drawer |
| View business-wide reconciliation | Exact staff visibility unresolved | Yes |

Enforce permissions in Supabase as well as the interface. Hiding buttons is not authorization. Unknown/unverified roles must not silently receive staff privileges. Offline access must follow an explicit policy rather than trusting a default role.

## 4. Sale entry and calculations

One sale belongs to one customer and produces one invoice containing multiple line items. Example: flex 4 × 5 ft, quantity 2; SAV 2 × 2 ft, quantity 2,000; flex 10 × 8 ft, quantity 1.

Each item captures material, billable width, billable height, selected unit, quantity, applicable rate, calculated amount, and selected roll width where applicable. Keep entered measurements and the rate snapshot on the recorded item.

On Android, use adjacent FEET / INCHES segmented buttons, with the active option filled in the staff orange accent; do not use a unit dropdown. The unit toggle does not rewrite width or height. It changes the interpretation of those numbers. Clearly show Feet or Inches beside the fields and in the review:
- Feet: area = width × height × quantity.
- Inches: area = width × height ÷ 144 × quantity.
- Base item amount = area in square feet × material rate per square foot.

The two inches expressions `(width × height) / 144` and `(width / 12) × (height / 12)` are equivalent.

Staff enter the dimensions to be billed. A 13 × 17-inch requested print may be entered as 13 × 36 inches when charging the full width of a 3-foot roll. The app must not silently expand an entered width to a roll width. Label fields Width and Height with the current unit in the label — "Width (ft)" / "Height (ft)" under FEET, "Width (in)" / "Height (in)" under INCHES — with Quantity abbreviated to "Qty" and all three on one row (owner decision, 9 September 2026, replacing the earlier "Billable width"/"Billable height" labels to save vertical space). The billable-not-roll meaning those longer labels carried now lives in the section description, which must keep saying the dimensions entered are the ones being billed. Selection of a roll width records context; it does not automatically change billable area in V1.

Minimum order value is ₦1,000 for the entire invoice. For the initial base-price model: minimum adjustment = max(0, ₦1,000 − sum of item amounts); invoice total = sum of item amounts + minimum adjustment. Show the adjustment as its own labelled line. A draft with no valid items cannot be submitted merely because a minimum exists.

Starting rates: Flex ₦180/sq ft; SAV ₦200/sq ft; Clear sticker ₦350/sq ft; Window graphics ₦500/sq ft. Admins can add other materials.

Allowed measurement precision, additional charges, discounts, taxes, and whether any future delivery charge is before or after the minimum are unresolved. Do not invent them. Staff can enter billable dimensions but cannot override configured rates.

Invoice review shows customer, every item, units, quantities, amounts, minimum adjustment, final total, opening payment if any, and remaining balance. Support editing/removing draft items and reviewing 20+ items without losing earlier entries.

## 5. Customers and payments

Payment methods: Cash, POS, Transfer. A debt has no payment method until a payment is received.

Customer page includes search, customer count, total outstanding debt across all dates, and customer detail with a prominent Pay debt action. Use searchable customer selection and the confirmed contact rules below; names alone are not unique identifiers.

Customer-level payment applies to oldest outstanding invoices first. Show allocation before confirmation. Example: invoice A owes ₦5,000 and invoice B owes ₦8,000; a ₦10,000 payment settles A and allocates ₦5,000 to B, leaving ₦3,000 outstanding. One receipt of money is one payment with multiple allocations, not multiple duplicated collections.

Payment opened from an individual invoice applies only to that invoice. Do not silently send an excess to another invoice. Overpayment handling is unresolved.

Store who recorded a payment, amount, method, relevant customer, timestamps, and its invoice allocations. Historical balances must include authorized payments recorded by other staff. Payment corrections/reversals retain the original record, actor, reason, and history. Voiding a sale does not itself refund money or remove a cash receipt. Refund/void policy needs definition before that action is enabled.

## 6. Daily reconciliation

Use Africa/Lagos business dates. Distinguish sales value from collections: payment today for an old invoice belongs to today's collections, not today's new sales.

Capture opening physical cash, collections by method, expenses by method, owner withdrawals with source/method, actual counted closing cash, and discrepancies.

Expected closing cash = opening cash + cash payments received − cash expenses − cash withdrawals.

Difference = counted closing cash − expected closing cash.

POS and transfers do not affect the physical drawer. Show their collections and expenses separately. Reversals, refunds, or other cash movements must be explicit additions to the reconciliation model if introduced; do not hide them in edited totals. This summary is operational reconciliation, not an assertion of accounting profit or bank settlement.

There is one shared drawer for all three staff. Both staff and admins can enter opening and closing counts and owner withdrawals; every entry retains actor and timestamp. Corrections remain admin-only. All devices show the same confirmed business totals; tapping a total shows payment details including collector. Confirm whether closing locks the day and how late/offline entries affect a closed day. A close with unsynced relevant entries must not be presented as fully reconciled.

## 7. Offline reliability

Confirmed requirement: staff must create sales through unexpected internet loss, with no duplicates when retrying. Connectivity is normally available; offline support protects against unforeseen outages.

Proposed implementation requirements:
- Persist drafts locally so interruption or restart does not lose entered items.
- Assign each operation a stable unique identifier before its first submission; retries reuse it.
- Maintain a durable local submission queue; mark a sale confirmed only after the server acknowledges it.
- Backend uniqueness/idempotency checks return the existing result when a retry follows a lost acknowledgement.
- Commit the sale, all items, and any opening payment atomically.
- Distinguish Draft, Saved on this device / pending sync, Synced, and Needs attention in plain language.
- Preserve pending work through restart. Account switching/logout and local-data cleanup must not silently discard it or expose it to another user.
- Keep server timestamps plus necessary device recording context; define business-date handling for delayed sync.
- Download pricing with a version and retain the price used. Cached-price acceptance after a price change needs agreement; meetings do not eliminate technical conflicts.

Selected direction for debt payments: staff may save receipts of money offline with a stable identifier and pending-sync status. Customer-level waterfall allocation is confirmed against current balances on synchronization; invoice-specific payments stay tied to that invoice. Concurrent payments or excess amounts require admin review, never silent loss or reassignment. All devices converge on shared confirmed totals; offline devices show last-sync context and separate local pending amounts.

Further decisions: whether expenses and withdrawals may be submitted offline; how long cached login/permissions remain valid; whether staff may issue pending-sync invoices; and how conflicts or a revoked account are resolved. Initial login requires a defined online authentication flow. If payment collection is allowed offline, allocation must account for another device paying the same debt and visibly surface conflicts rather than silently overwriting balances.

## 8. UI design agreement

Use Expo Router and React Native Paper, continuing the existing foundation. Do not introduce Tamagui from the older attachment.

- Staff accent: #cc5500. Admin accent: #2b3493.
- Shared typography, spacing, shapes, controls, and semantic status colours across roles.
- Theme tokens define colour roles; validate text/background contrast instead of applying accent colours indiscriminately.
- Centralize page spacing, maximum content widths, field labels, money formatting, button hierarchy, and feedback patterns.
- Android: readable single-column entry, appropriate numeric keyboards, accessible touch targets, and visible save/sync feedback.
- Admin web: wider layouts and tables where useful; preserve shared business rules and form behaviour.
- Include loading, empty, validation-error, permission, offline, pending-sync, and retry states in every relevant screen design.
- Keep visible unit labels, clear minimum-charge adjustments, and a review before committing money-related entries.
- Reuse semantic components when they solve a repeated need; do not create a large speculative component library.

Navigation proposal for review: staff destinations Sales entry, Records, Customers, and More for expenses/account/authorized cash tasks. Admin web adds reconciliation and settings/user management. Final navigation and visual tokens beyond the two accents are not approved yet. Existing light/dark foundation remains; whether both modes are required at launch needs confirmation.

## 9. Architecture proposal

Keep a single Expo application with shared business rules and deliberate platform-specific presentation where needed.

- `src/app/`: thin routes and layout composition.
- `src/features/`: sales, customers, payments, expenses, reconciliation, and authentication logic/UI, added as implemented.
- `src/components/`: genuinely shared presentation components.
- `src/theme/`: theme definitions and design tokens.
- Data access modules: Supabase calls and local persistence behind explicit interfaces, separate from screens.
- Pure calculation functions: area, minimum charge, payment allocation, and reconciliation, with focused tests.

Conceptual records: profiles, customers, materials/roll widths, versioned rates, sales, sale items, payments, payment allocations, expenses, cash sessions/withdrawals, and audit events. These are modelling directions, not finalized SQL tables.

Supabase/Postgres is the selected backend. Use database authorization policies and transactional server operations for financial mutations. Admin account provisioning and privileged credentials belong in a trusted server context, never in the client. Store money with exact arithmetic and use the confirmed per-item upward-to-₦10 rule. Database constraints must support duplicate prevention and valid allocations.

Choose the local persistence/sync implementation after reviewing offline requirements. Do not assume Supabase alone supplies the required offline queue. Existing Supabase project contents must be inspected with authorization before deciding to reuse it or create a new project. No deletion, migration, credentials, or new project creation is authorized by this specification step.

## 10. Implementation checklist and review gates

### Phase 1 — Complete the specification
- [x] Record the agreed purpose, scope, measurement rules, invoice minimum, and debt workflow.
- [x] Record role accents and platform priorities.
- [x] Agree one shared drawer, staff/admin cash-entry permissions, starting rates, and offline debt-payment direction.
- [x] Resolve closing-day locking/reopening (29 September 2026, see below); detailed sync conflict handling remains open. Rounding is confirmed below.
- [ ] Confirm final permission matrix, navigation, login method, required customer fields, and invoice content.
- [ ] Choose whether to reuse the existing Supabase project after inspecting its purpose and live data.

### Phase 2 — Review the UI foundation
- [x] Prior cleanup established Router, aliases, Paper, starter light/dark themes, lint, and type checks; not reverified in this documentation step.
- [ ] Agree semantic colours, typography, spacing, radii, and common screen layouts.
- [ ] Review staff multi-item entry and admin reconciliation mockups, including failure/pending states.
- [ ] Replace the existing low-resolution app icon with an approved high-resolution export; preserve original artwork.

### Phase 3 — Data, access, and offline foundation
- [ ] Finalize schema and constraints; implement and test staff/admin authorization.
- [ ] Build durable draft/outbox storage and stable operation identifiers.
- [ ] Verify atomic sale creation, lost-acknowledgement retries, app restart recovery, and cross-device conflicts.

### Phase 4 — One complete sales workflow
- [ ] Create customer and 20+ line-item sale; record deposit; generate invoice.
- [ ] Find invoice and collect remaining balance.
- [ ] Test feet/inches interpretation without rewriting input and the invoice minimum.
- [ ] Review the flow with realistic BOMedia counter examples before expanding.

### Phase 5 — Complete V1
- [ ] Customer search, summary cards, historical debts, and waterfall allocation. (Search, summary cards and historical-debt viewing are implemented; waterfall payment allocation is not — see docs/HANDOFF.md.)
- [ ] Seven-day staff records and unrestricted admin history.
- [ ] Expenses, withdrawals, opening/closing cash, and reconciliation with the agreed permissions.
- [ ] Traceable corrections and approved void/refund rules.

### Phase 6 — Beta and release
- [ ] Test three independent users/devices plus admin web.
- [ ] Test small/large screens, keyboard, large text, slow network, offline recovery, and role restrictions.
- [ ] Run a sample trading day with cash/POS/transfers, old debts, expenses, and a closing discrepancy.
- [ ] Add crash reporting before beta with appropriate data handling; configure build identifiers/profiles.
- [ ] Confirm backup/recovery and operational support procedures before daily reliance.
- [ ] Review compatible dependency patches and release checks; beta approval before launch.

## 11. Acceptance examples

1. Enter 13 and 17 with Inches selected: quantity 1 yields 221/144 square feet. Switching to Feet leaves the inputs unchanged and yields 221 square feet.
2. Enter three items whose combined amount is ₦900: show a ₦100 minimum adjustment and ₦1,000 invoice total.
3. Submit a 20-item sale, lose connection after server commit, and retry: exactly one sale, its 20 items, and one opening payment exist.
4. Restart the Android app with pending work: the sale and sync status remain available without re-entry.
5. Pay ₦10,000 toward debts of ₦5,000 and ₦8,000: waterfall leaves ₦3,000 on the newer invoice, with one collection of ₦10,000.
6. Pay an individual invoice: no other invoice receives an allocation.
7. Staff find an older unpaid invoice through its customer even though it is outside the seven-day Records window.
8. Opening cash ₦10,000 + cash collections ₦25,000 − cash expenses ₦4,000 − cash withdrawals ₦5,000 gives expected cash ₦26,000. Counted ₦25,500 shows a ₦500 shortage. POS and transfer collections do not change this drawer calculation.
9. A staff user cannot bypass the interface to change prices, correct payments, or promote their role through the backend.

## 12. Next review questions

Review the staff sales-entry and admin daily-cash mockups before implementing screens. Remaining business details: extra charges, final invoice business details, and day locking/reopening. Money rounding, customer requirements, and email/password login are confirmed below. Offline expenses/withdrawals and cached authentication need explicit rules. Staff visibility of reconciliation totals beyond the shared collections remains to be finalized.

## 13. UI review, 7 September 2026

Two sample-data mockups accompany this revision: Android staff New Sale and admin web Daily Cash. These are interaction prototypes, not implemented application screens. Sample names, amounts, and invoice numbers are fictional. Unit changes retain typed dimensions; area-based item totals and invoice minimum are demonstrated. Cash detail shows collections by person without creating separate drawers. Visual spacing/corner alternatives are review choices, not final design tokens. No database changes or live financial writes occur.

### Staff unit control review

Approved: compact FEET / INCHES segmented buttons aligned to the right, measurement label remaining left. Typed values stay unchanged. The review prototype now includes optional deposit, Cash/POS/Transfer selection, remaining balance, and a sample invoice summary. Final screen approval remains pending; money-rounding rules are confirmed below.

### Explicit payment method selection

Cash, POS, and Transfer use buttons with no preselected method. Every new payment starts unselected. If an amount is received, require an explicit method choice before confirmation, and enforce the same requirement in validation/backend operations. A zero-deposit sale requires no method. Never carry the previous payment method into a new payment.

### Final invoice review

Preview invoice opens a dismissible popup showing customer, every job/material with billable size and unit, quantity, item amount, subtotal, minimum adjustment, total, payment received, selected method when applicable, and outstanding balance. Submit sale is inside this final review. Closing returns to the preserved draft. The current prototype submission only demonstrates feedback and does not save data.

## Confirmed pricing, customer selection, and login rules

### Rounding and copying amounts

Round each line item's calculated amount upward to the nearest multiple of ₦10. An amount already divisible by ₦10 remains unchanged: ₦276.25 → ₦280; ₦280 → ₦280; ₦280.01 → ₦290. Display the calculated amount before rounding and the rounded billable amount separately. Each amount has an accessible copy action that copies its displayed numeric value and confirms copying. Add rounded item amounts to form the invoice subtotal, then apply the ₦1,000 minimum-order adjustment. Do not apply this rounding to money actually received, debts, expenses, or withdrawals. Preserve the pre-rounding calculation and charged amount on each recorded item. Use exact decimal arithmetic; displaying a calculated value to kobo must not alter the underlying rounding decision.

### Consistent customer selection

Customer name is required and searchable. Search existing customers first; selecting a match reuses that customer's stable identity and saved name/contact details. Phone and email are optional on a fully paid sale. When a balance remains, a phone number must exist on the selected customer or be entered before submission. Returning customers with an existing phone do not need to re-enter it. A returning customer's missing phone still needs to be collected for an unpaid balance. Provide an explicit create-new-customer action when no appropriate match exists. Similar or identical names must not be silently merged; show available contact details to distinguish matches. Offline lookup uses cached customers; potential duplicates created offline require reconciliation rather than name-only automatic merging.

### Staff login

Admin creates accounts using staff email addresses. Email/password login; no public signup. The owner will collect staff email addresses. Do not invent accounts or request passwords in chat. Session persistence and offline access expiration remain implementation decisions to resolve before authentication is enabled.

## Database and sync design

See `docs/DATABASE_AND_SYNC_DESIGN.md` for the proposed records, transaction boundaries, access rules, retry handling, payment conflicts, and cash-day revisions. Development migrations 001–008 have been applied; BACKEND_SETUP.md records implemented scope. Recommendations in the architecture document remain distinct from confirmed product rules.

### Approved business-day finalization

Staff/admins record counts; admins finalize. Preserve closing snapshots. Late entries flag Needs review and show recorder, reported recording time, server synchronization time and balance impact. Only admins reopen/correct with a reason. Earlier offline entries are distinguished from new post-close entries, without treating device timestamps as tamper-proof.

### Compact copy actions and sale review sheet

Tap the displayed calculated or charged number itself to copy it; no separate copy buttons. Review sale opens a dismissible bottom sheet with a drag handle and adjustable height. Preserve the draft on dismissal. Invoice preview remains the full itemized final review before submission. The provided reference image specifies sheet behaviour only, not its text/content.


## Implementation update — 8 September 2026: Cash foundation

Opening cash, expenses, withdrawals and today's shared expected cash are implemented in the Cash tab and development migration 007. Both active staff/admin may record entries with attribution. Opening is once per current Lagos day and can be zero; outgoing amounts require explicit Cash/POS/Transfer plus a reason. Expected cash is unavailable without opening. Closing counts, admin finalization/corrections and late-entry reconciliation remain planned. The current interface requires a successfully loaded drawer before reviewing new entries and durably retains submitted requests; full offline entry/startup is not yet delivered.


### Cash rejection recovery implementation — 8 September 2026

A server-confirmed rejected cash request remains visible as Not recorded and no longer blocks the device. If already saved, recovery returns its original receipt; uncertain outcomes remain pending and must be retried with the same ID. Resolving a rejected request never edits or removes an accepted financial record. Migration 008 is deployed to development; native interruption/race validation remains outstanding.


### Confirmed sale → next entry — approved 9 September 2026

After Submit sale receives and durably saves confirmation, automatically close review, refresh the catalogue and persist/open a blank New Sale draft with a new operation ID. Show a saved invoice confirmation that persists on the blank form (including across remounts/restarts) until the user starts the next entry; no routine New sale click is required. Never clear an unknown/pending/rejected submission. If opening the next form fails, keep the confirmed invoice and offer only a retry of opening the blank form, not resubmission. Restarting with a confirmed current draft also advances after catalogue/persistence succeeds.


### Artifact-aligned presentation — 10 September 2026

The owner approved continuing the app toward the Claude artifact linked in DESIGN_SYSTEM.md, with fixes made through shared components. New Sale now shows a display-only total area with calculated and charged price, and a persistent phone invoice total/Review action above the tabs. Display-area rounding never enters billing. Desktop entry uses paired customer fields and a narrower invoice rail; the existing full payment/invoice review and automatic confirmed-sale-to-blank behavior remain.

Records/Payments share their date and table presentation. Payments now exposes collection time and actual invoice allocations in both desktop rows and mobile cards, with an all-date admin alert for unapplied receipts. The alert is read-only and links to the existing review view; it does not implement monetary resolution. Refresh labels identify last successful reads in Lagos time, not live/server-certified balance snapshots. Customer sorting (name/balance/oldest-debt), per-customer open-invoice counts and oldest-unpaid dates, a business-wide oldest-unpaid figure, and full-date server totals for Records (billed/collected/owed) are implemented in migration 009 and the Customers/Records screens; sorting is applied server-side before paging and the Records totals are a real day aggregate, not a sum of loaded rows. Migration 009 is deployed to development (confirmed 29 September 2026); signed-in visual verification is still pending. The remaining cash data described in DESIGN_SYSTEM.md remains planned. No business permissions, material prices, minimums, rounding rules or deployment status changed in this presentation pass.

### Approved closing-count rules — 29 September 2026

The owner answered the open closing questions:
- Staff and admin both see expected cash and the difference (counted minus expected) as soon as a closing count is saved. This is not a blind count.
- Anyone may recount before the day is finalized. Every count is kept with recorder and time, and the latest one is used.
- Staff record closing counts for today only. Admin may record a count for an earlier day; it is flagged as backfilled.
- Only admin finalizes. Finalizing requires a closing count. A day with no opening count can be finalized only with a note. Counts are refused on a finalized day until admin reopens it with a reason. Expenses, withdrawals and payments recorded for a finalized day are kept and mark the day Needs review. The saved snapshot never changes.

Implementation: migration 010 and the Cash tab (date navigation, closing count, day status, admin finalize/reopen). It is written and PGlite-tested but not yet deployed to development; see BACKEND_SETUP.md.
