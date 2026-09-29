# BOMedia Sales Manager — AI handoff

Last updated: 29 September 2026, Africa/Lagos. Author: Claude Code (Opus 5.5, VS Code).
Current owner: no contributor holds edit ownership. Keep all uncommitted application code and custom assets. Read the newest session note at the bottom before continuing. Migration 202609100009 is DEPLOYED to development. Migration 202609290010 (cash closing) is DEPLOYED to development. Migration 202609290011 (cash day states) is DEPLOYED to development.

## Immediate continuation brief

29 September: the development project has migration 009 applied. `supabase migration list --linked` shows 001–009 both locally and remotely. Its SQL suite and `customer_debt_reads.sql` both pass against the deployed schema in rollback transactions. `npm run check` is clean and all 35 Node tests pass. README.md was rewritten as a current developer README.

Later on 29 September the last New Sale canvas gaps were closed: the desktop topbar now carries the draft status chip beside DEVELOPMENT, and the Customer section header shows an "Existing customer"/"New customer" check chip. The Area figure was already present. This compiles and passes checks but has NOT been viewed signed in.

Cash closing (29 September, later): the owner decided the closing rules (see PRODUCT_SPECIFICATION.md). Migration `202609290010_cash_closing.sql` is **DEPLOYED to development** with the owner's approval, and its three cash suites pass against dev. The Cash UI now includes the owner's redesigned day navigator. Migration `202609290011_cash_day_states.sql` (read-only day strip) is also **DEPLOYED to development** with approval; its suite passes against dev.

Next concrete task: (1) With the owner signed in, check at 1440/950/390 against the canvases: Cash (count, difference, recount, admin finalize/reopen, Needs review, backfill); New Sale topbar/customer chips; Customers sort/count/age; Records day totals. (2) Verify the native Qty field, phone footer and Cash sheets on Android. The privileged temporary-account concurrency test remains UNAPPROVED.


### Latest implementation — Claude (Cowork), 10 September evening

Owner chose the server-data-contract direction. New migration `202609100009_customer_debt_sort_and_day_totals.sql` gives the Customers page and Records the data the canvas needed but could not honour client-side:

- `customer_balances` now also returns **open_invoice_count** and **oldest_unpaid_date**, and takes a **sort_key** (`name` / `balance` / `oldest`) applied server-side *before* limit/offset, so paging stays correct under any sort. Return signature changed, so the old three-arg function is dropped and recreated.
- `customer_debt_totals` also returns **oldest_unpaid_date** (business-wide) for the new "Oldest unpaid" hero card. Also dropped/recreated.
- New `records_day_totals(target_date)` returns authoritative **billed / collected / outstanding** for one date. Definitions match the Records screen's per-row math exactly, so a fully loaded day reconciles to these figures. Guarded by the same seven-day Lagos window as the sales_read/payments_read RLS: an out-of-window date returns zeros for staff, real figures for admin.

UI wired to match the canvas' outstanding Customers items (sort control, open-invoice count column + oldest-unpaid subtitle, and the Oldest-unpaid hero card) and to replace Records' loaded-row summary with the server totals (the "loaded so far" qualifier is gone; the caption now says the totals cover the whole day while the list is still paged). Presentation only — no pricing, permission or business-rule change; all reads reuse `private.active_business()`/`private.is_admin()`.

Verified: isolated PGlite run passes all 9 migrations and all 8 SQL test suites (new `supabase/tests/customer_debt_sort_and_day_totals.sql` covers open counts, oldest dates, all three sort orders, day-total correctness and cross-business + staff-window isolation; the existing `customer_debt_reads.sql` was updated to the new `customer_balances` signature). `tsc --noEmit` clean; 35 Node tests pass.

UNVERIFIED / limits: `expo lint` cannot run in this VM (eslint module-resolver crash against the mount, not a code finding); `npm run check` (tsc + expo lint) was run on the Mac on 11 September and passed clean. No native/device check. No signed-in visual pass: Metro was not running this session and web auth is per-tab, so the owner needs to sign in for a live look. Migration 0009 was not deployed in that session (it is now deployed; see 29 September). No commits, pushes, deployments, financial writes or privileged concurrency test.

Next concrete task: (1) owner applies migration 0009 to development and reloads the app; (2) signed-in visual pass on Customers (sort/open-count/oldest, phone + desktop) and Records (server day totals) against the canvas; (3) then the remaining New Sale canvas gaps (topbar draft/DEV chips, Area figure in the calculation panel, "Existing customer" chip) and the still-open native Qty-field/phone-footer verification. Retain all earlier pending-approval boundaries, including the privileged temporary-account concurrency test.

### Latest implementation — Codex, 10 September

Owner approved correcting the audited Qty height mismatch and continuing toward the Claude reference: https://claude.ai/code/artifact/77cdd868-b632-4c96-96f6-b5fd28a7d550. The link was opened and all desktop/phone artboards plus its critique were inspected. This supersedes earlier statements that the link was unavailable and that the Qty audit had no implementation approval.

Qty now uses Paper's outlined TextInput shell with a custom input renderer, not a hand-drawn 56px outline. Live measurements: Width, Height and Qty visible outlines all 50px high at the same top coordinate. Shared components now own action sizes, date navigation, refresh state, table column alignment, container-sized grids/figures, the calculation strip and the phone footer. New Sale has paired customer fields, a wider entry area, narrower invoice rail, exact-source area/charge summary and fixed phone total/Review action. Payments exposes actual allocations/method chips/Lagos time and a protected all-date admin unapplied alert. See the dated note at the bottom for exact files, evidence and limits.

Latest checks: 35 Node tests; final TypeScript/lint; Android/web exports (12 routes) at `/tmp/bomedia-artifact-20260910-final`; git diff --check. No migration, deployment, dependency change or financial write by this contributor. Metro remains PID 92386 on port 8081. Native interaction remains unverified.

Next concrete task: verify native keyboard/touch/text scaling for the Paper-rendered Qty field and phone footer, then plan the server-backed customer debt ordering/age/open-count data needed by the reference. Do not fake those statistics or sort only one fetched page. Further UI refinements include compact invoice-item presentation and draft status in the shell header. Retain all earlier pending approval boundaries, including the privileged temporary-account concurrency test.

### Latest verification — Codex, 9 September evening

The outstanding Mac checks now pass: TypeScript, Expo lint, all 34 Node tests, git diff --check and Android/web exports (12 routes). No application code changed in this follow-up. Visual/native interaction limits from Claude remain open. The Claude canvas link was supplied and inspected on 10 September; see the latest implementation above.

### Implementation handoff, 9 September 2026 (Claude, evening)

**Done and verified this session, in order:**

1. **Live Submit sale to automatic blank New Sale is VERIFIED on web** with the owner's own real development sale. Invoice **#12** (customer "ne ade ventures", 1 item Flex 2x4 ft x5, total NGN 7,200.00, received NGN 7,000.00 by transfer, balance NGN 200.00, no review flags, saleId 7f46259a-9152-4ab7-8cb1-f7881beb4282). Outbox operation 56d0c6bb-2338-4c63-84db-6d4dc87858e9 is `confirmed`; the current draft advanced to a new id 2a858309-7e49-4601-b522-9e147799b9ba with blank customer/phone/dimensions, 0 items, quantity 1, no payment method; Records lists #12 exactly once. The owner submitted it personally; the agent only observed and inspected IndexedDB/Records. **This closes the previous handoff's next task.**

2. **Missing confirmation note — fixed.** The owner saw no "Invoice #12 saved" note after submitting. Root cause (verified live, see the session note): `AuthGate` remounted the entire tab tree on every web visibility change, discarding all in-memory UI state. `saveNextSaleDraft` now also writes a durable `last-confirmed-sale` record and the sales screen restores the note whenever it mounts onto an untouched blank draft, clearing it on first edit.

3. **AuthGate remount — fixed.** New `src/features/auth/access-policy.ts` separates a definitive denial from a transport failure and decides what stays mounted; `auth-gate.tsx` keeps a verified workspace mounted through routine re-verification and through transport failures, and only ejects on a definitive denial or a session change to another user/sign-out. Server RLS/RPC remain the sole authority, so nothing was weakened. Verified live: a hidden->visible cycle now produces **zero** DOM text changes (previously "Checking your access..." for ~0.85s), while the profile re-check still runs (two `/rest/v1/profiles` requests observed across the cycle).

4. **Design/UX review** — the owner asked that UI work go through Claude artifacts from now on. A design canvas was published with redesign proposals for all five screens (desktop 1440x900 and phone 390x844) plus a written twelve-point review of the current build. It reuses the existing tokens and shared components; it does not change any business rule. Ask the owner for the artifact link if it is not in the current conversation — it is in their claude.ai artifact gallery as "BOMedia Sales Screens".

**Fix-first items (a) and (b) from the design review are DONE** (9 September, evening — see the session note). Remaining next task, to choose with the owner:
   c. DONE for Cash, Customers and Payments (see the session note). Records' day totals (billed / collected / still owed for the selected date) remain: they must come from a server-side total, never from summing one fetched page, so they need a small RPC or an aggregate query before the UI can show them honestly.
   d. Remaining from the design canvas: New Sale's live invoice rail (running total visible while entering items). Records status chips, Balance column and phone cards are DONE; Customers still needs server support for open-invoice counts, oldest-unpaid dates and sorting (see the session note).
   Then the earlier plan resumes: closing counts and admin finalization under PRODUCT_SPECIFICATION.md.

**Owner preference now in force:** UI work goes through a Claude artifact/design canvas first, and pages are cross-checked against it for UI/UX principles. This sits alongside — not instead of — `docs/skills/bomedia-ui/SKILL.md`, which AGENTS.md still makes mandatory; where the two differ, the skill's project rules (Paper, shared tokens, role colours, verification evidence) win.

**Open question for the owner:** the claude.ai project description for this app asks for a bold, round-cornered, **dark-theme** data-rich dashboard with charts, materials-usage metrics, top buyers and a top-10 debtors list. None of that is in the approved product specification, and the design canvas deliberately follows the approved light Paper system instead. Ask before building any of it.

Browser: this session used the Claude desktop app's built-in browser pane at `http://localhost:8081/` (site access granted for localhost:8081); the owner signed in privately and the tab was signed in at handoff. Web auth is per-tab sessionStorage, so a new tab needs a fresh sign-in. Never read credentials. Metro on 8081 ran throughout, reachable from the browser but not from the Cowork Linux VM shell.

Authorization boundaries unchanged: the separate privileged temporary-account/service-key concurrency test remains UNAPPROVED and was not attempted. No production deployment, destructive cleanup, direct database corrections, or migrations. All valuable uncommitted source, docs and custom logos remain in place. Do not reset/stage/commit/push wholesale.

Mandatory UI guidance: `AGENTS.md` routes to `docs/skills/bomedia-ui/SKILL.md`; owner also explicitly requested `expo:building-native-ui`. Follow Paper/theme rules where generic Expo skill preferences differ. Native/physical-device, staff variant, extreme text, populated Cash rows and interrupted native recovery remain incomplete.


Continue the existing implementation in `/Users/enfash/Developer/Projects/bomedia-sales-mgt`; do not scaffold or reset it. The product decisions below are approved. The owner wants consistent UI and architecture, short progress updates, and small working stages. Check the current files and git diff before deciding what to change. There is substantial valuable uncommitted work, including original user changes. Do not discard, reset, indiscriminately stage, or overwrite it.

The app authenticates, searches real customers, reads real material prices and saves a full sale plus opening payment atomically to the DEVELOPMENT Supabase project. It now also has read-only Records (sales history) and Customers (search, count/debt totals, per-customer outstanding invoices) screens behind adaptive desktop-sidebar / narrow bottom-tab navigation, originally added by Claude and subsequently given focus/foreground refresh by Codex — see the dated session entry below for exact scope. It is not yet a complete accounting app: opening cash, expenses and withdrawals are implemented in migration 007 and the Cash tab; closing counts, finalization and corrections remain unimplemented. Subsequent/debt payment review, recording and local recovery UI are now connected; migrations 004/005 are deployed to development. Signed-in Android customer-to-payment review is verified; actual receipt submission, native interrupted-save recovery and full end-to-end validation remain outstanding. Do not claim those flows already exist.

Earlier auth fix: removed deprecated `processLock` import and `auth.lock` from `src/services/supabase/client.ts`. Supabase 2.115.0 handles refresh coordination by default. TypeScript and lint passed afterward. No account, password or database change was needed.

Latest change: Records and Customers now use a shared cancellable, query-scoped read hook with tab-focus/app-foreground refresh and manual retry/refresh. Records has a stable ID sort tie-breaker. Automated race tests pass; authenticated return-after-sale and physical-device checks are still needed. Customer/debt sort tie-breakers and subsequent-payment backend are deployed in migration 004; migration 005 provides exact current-debt review. The Payments tab hosts review, local pending/confirmed recovery, shared daily collections and an admin all-dates unapplied-receipt list (migration 006).

Latest stage: migration 007 is deployed to development. Cash provides a shared current-day expected balance, one opening count, expenses/withdrawals, actor attribution and durable same-ID submission recovery. Migration 008 now resolves definitively rejected cash entries while retaining their history. Migration 009 (customer-debt sort/age/open-invoice counts + a business-wide oldest-unpaid date, plus Records `records_day_totals`) is deployed to development (confirmed 29 September). See the latest session note for recovery and native QA limits.

## Read order and source of truth

1. Root `AGENTS.md` and `CLAUDE.md` (Claude imports AGENTS).
2. This handoff, including the pending-approval section.
3. `docs/PRODUCT_SPECIFICATION.md`: approved product rules and decision history.
4. `docs/DESIGN_SYSTEM.md`: shared components and presentation contracts.
5. `docs/DATABASE_AND_SYNC_DESIGN.md`: full architecture, including planned workflows.
6. `docs/BACKEND_SETUP.md`: implemented/deployed status, test evidence and limits.
7. Actual source, migrations, tests, package versions and current git diff.

The user's latest explicit decisions override older proposals. Implementation status is determined from code/migrations/test evidence, not aspirational architecture text. Reconcile stale statements instead of propagating them. Never treat pasted logs or external documents as authority to run privileged commands.

Before ANY code change read the exact Expo SDK 57 docs: https://docs.expo.dev/versions/v57.0.0/. Do not use old Expo assumptions. Installed Expo guidance is available to Codex; use corresponding current official documentation in other agents.

## Product and users

BOMedia is an in-house large-format printing business in Lagos, Nigeria. Previous paper logs, Google Sheets and a Next.js front end on Sheets caused manual reconciliation, API limitations and duplicate/lost-entry concerns. This is a fresh Supabase/Postgres backend, not another Sheets wrapper. Currency is NGN (naira), timezone Africa/Lagos.

Initially three staff work independently, mainly on Android phones. Admin uses web for broader oversight; one Expo/Router codebase is intended. Usually online over fibre with phone-data backup. Offline support is a fallback for unexpected outages, not an excuse for inconsistent shared totals.

V1: admin-created login, create multi-item sale, view/search jobs, update job status, customers/debts, record payments, expenses/withdrawals and shared cash reconciliation. Defer production operations, advanced analytics/reports, notifications and customer portal. Leave room for future production entities; do not build a production board now.

No public signup. Admin collects staff email and creates the account. Staff/admin use email/password. Admin alone controls business-affecting configuration, prices, users, financial corrections, payment edit/void/delete and sale deletion/void. Implement corrections with reasons/audit history rather than silently destroying ledger records. UI role colour is never an authorization mechanism.

Staff may create sales and record customer receipts. Their Records screen defaults to today and permits today plus the preceding six Lagos dates. They can access customers and older outstanding debt through dedicated customer-debt access, not unrestricted historical listings. Customer page needs customer-count and total-debt cards. Both staff and admin can record cash counts and withdrawals. Only admin finalizes the cash day and authorizes corrections.

## Agreed sale and pricing contract

- One customer order/invoice holds many item sizes/materials. Support 20+ items efficiently; current function/UI ceiling is 200.
- Initial rates per square foot: Flex ₦180; SAV ₦200; Clear sticker ₦350; Window graphics ₦500. Admin must eventually be able to manage materials/rates.
- Flex roll widths: 3,4,5,6,7,8,10 feet. SAV: 4,5 feet. Other widths remain unspecified; do not invent them.
- Staff enters BILLABLE width and height. For example they may deliberately bill 13×36 inches for a job on 3ft material. Use entered area; do not silently optimize nesting, choose roll widths, rotate jobs, or infer waste. Those features are deferred.
- FEET/INCHES is a compact segmented button control aligned to the RIGHT of its measurement label. Changing unit preserves the literal typed numbers. The calculation interprets those numbers under the chosen unit; do not rewrite 13 as 1.0833 in the field.
- Feet area: width×height×quantity. Inches area: width×height×quantity÷144. Quantity is a positive integer.
- Calculate exactly, then round EACH ITEM upward to the next ₦10. ₦276.25 → ₦280; an exact ₦280 remains ₦280. Never round an intermediate inch-area or display amount before deriving the charge.
- Display both calculated amount and charged amount. Tap the NUMBER itself to copy decimal naira; do not add separate copy buttons. The input operands retain the exact calculation; calculated display is to two decimals.
- Invoice subtotal sums rounded item charges. Apply a ₦1,000 minimum to the ENTIRE invoice, showing the minimum adjustment separately. It is not a ₦1,000 minimum per item.
- Payments and expenses are actual amounts to kobo; do not round them to tens.
- Customer name required; search/select a stable existing customer or explicitly choose new. Names need not be globally unique. Saved phone should be reused. Email optional. Phone required whenever a balance remains.
- Cash/POS/Transfer use BUTTONS with NOTHING PRESELECTED. Positive received amount requires explicit method. Zero received produces no payment row. Current initial-sale flow blocks received amount above invoice total.
- Review sale is an adjustable-height bottom sheet with a drag handle. Closing it preserves the draft. The final invoice preview lists all items, sizes, units, quantities, calculated/charged amounts, adjustment, total, amount received, payment method and balance before Submit.

## Payment/cash rules for upcoming implementation

Customer-level debt payment uses oldest-debt-first waterfall allocation. A payment opened from a particular invoice applies only to that invoice. Lock/revalidate affected records for concurrent payments. Preserve one receipt of money with allocations, not multiple receipts created by joins.

One shared physical cash drawer across all staff/devices. Confirmed balances must converge to the same server truth. Collector identity belongs to payment detail; do not create a different cash balance per staff member. Opening cash + cash receipts − cash expenses − cash withdrawals, with explicit corrections as implemented, gives expected cash. Counted cash minus expected cash gives variance. POS and transfers are separate collection methods, not physical cash.

Payments against old debts count on the collection date. Store declared device occurrence time separately from server receipt time. Late/offline entries must not silently rewrite a finalized cash-day snapshot. Flag the day for admin review, retaining the original close and audit trail. Actual cash-day/finalization logic is NOT implemented yet; existing sale timing flags are only a foundation.

Offline receipt allocation conflicts must preserve money once and leave unapplied amounts for admin review. Never silently drop, refund, double-allocate or move an invoice-specific payment to unrelated debt. Refund/excess resolution interfaces need explicit business rules and audited administration.

## Design and architecture that must remain consistent

Use Expo Router + React Native Paper. Route files under `src/app` should remain thin; business logic belongs in feature/domain/service modules. Reuse shared UI instead of creating independent screen palettes, spacing systems or money fields.

- `src/theme/tokens.ts`: central palettes, spacing, radius, dimensions, touch targets and sheet sizes.
- `src/theme/theme.ts`: Paper role/light/dark theme factory. Staff orange #cc5500; admin blue #2b3493. Status colours retain consistent meaning across roles.
- `src/components/ui/page.tsx`: scroll/safe-area/content width.
- `choice-buttons.tsx`: controlled selectors including nullable payment method; compact visual style must retain a usable touch target.
- `copyable-amount.tsx`: number-to-copy interaction with feedback.
- `review-sheet.tsx`: shared adjustable modal sheet, safe areas, keyboard handling, close/expand controls. Native gestures still require phone QA.
- Use shared typography, semantic Paper colours and tokens. Centralize UI changes at their source. Admin-owned business rules live on server with permission checks, not in client-editable settings.
- Use kebab-case files and `@/` source alias. Keep types/domain calculations independent where practical and test actual behavior.
- JSON monetary values are integer-kobo strings. Use exact BigInt rational arithmetic in local pricing and exact numeric quotient/remainder on Postgres. Do not introduce float-based money arithmetic.

Original custom logos/icons were preserved. Do not delete or replace them without user intent. Current small 40×40 app icon is temporary; a proper 1024×1024 export and Android adaptive assets remain release work. Inconsistent original asset names with spaces were intentionally retained. The initial starter deletions seen in git are expected, not missing files to restore.

## Implementation map

`src/app/_layout.tsx`: AuthGate, role theme/status bar, wraps a `(tabs)` Stack screen. `src/app/(tabs)/_layout.tsx` is a new bottom-tab navigator (New sale / Records / Customers) added this session — the previous single-screen Stack is gone; `src/app/(tabs)/index.tsx` loads `src/features/sales/sales-screen.tsx` (renamed from sales-preview-screen in an earlier session), `src/app/(tabs)/records.tsx` loads `src/features/records/records-screen.tsx`, `src/app/(tabs)/customers.tsx` loads `src/features/customers/customers-screen.tsx`. This tab set matches the PRODUCT_SPECIFICATION.md §8 navigation proposal for staff destinations (minus "More", not yet needed); final navigation approval is still open per that document, so treat this as the working default rather than a locked decision.

`src/features/records/`: `records-service.ts` reads `sales`/`sale_items`/`payment_allocations` directly (already RLS-scoped: staff get today plus six preceding Lagos dates, admin gets full history) with a Lagos-date navigator (`lagos-date.ts`) and offset pagination; `records-screen.tsx` lists sales for the selected date with loading/error/empty states, "Load more", "Refresh", and a detail sheet (reusing `ReviewSheet`) showing items and payments for a tapped sale.

`src/features/customers/`: `customers-service.ts` calls the three new `customer_*` RPC functions (migration 3 above); `customers-screen.tsx` shows customer-count and total-outstanding-debt cards, a debounced search over a paginated customer/balance list, and a detail sheet listing a selected customer's outstanding invoices. Pay debt and per-invoice actions now open the Payments tab; current balances are fetched again for review. No new UI primitives were introduced; both screens reuse `Page`, `ReviewSheet`, and `CopyableAmount`.

`src/features/auth/auth-gate.tsx`: email/password login, active profile verification, auth/AppState refresh handling. No signup. Missing config cannot record sales. Profile verification currently requires a connection on startup/re-entry; full offline access policy is unfinished.

`src/services/supabase/client.ts`: public environment config and session storage; deprecated custom lock removed. `session-storage.ts`: native SecureStore; `.web.ts`: tab-scoped sessionStorage. Never put server/service-role keys in Expo variables.

`src/features/sales/catalog.ts`: RLS-protected real material/version/rules loading and limited customer name/phone search. `components/customer-picker.tsx`: existing selection/new draft. Sample `preview-data.ts` removed.

`domain/pricing.ts`: exact item calculations, adjustable server-owned rounding/minimum values. `domain/money.ts`: string parsing, formatting and payment validation.

`sales-screen.tsx`: persistent draft form, editable items, review/payment/invoice sheet, frozen submission, confirmation and next sale. One active invoice displayed at a time. Material/rule snapshots remain with draft items.

`submission.ts`: enqueue immutable payload before send; return stored receipt if already confirmed; confirm locally only after server acknowledgement. `sale-service.ts`: 20-second abort-controller timeout, RPC call and review-required errors. Same ID on retries; never unlock an uncertain submitted invoice.

`src/services/local/schema.ts`, `repository.ts`, `database.ts`: SQLite version 1; account-scoped drafts and outbox. `database.web.ts`: IndexedDB recovery data. Native fallback can use cached catalogue after access verification. Periodic/foreground retry is screen-scoped; not a background OS sync worker. Business/access failures pause automatic retries during that mounted session.

`src/features/payments/`: payment review domain, server service, durable submission and Payments workspace. Routes pass customer/invoice IDs plus a fresh entry ID; account+entry key isolates form sessions. The workspace loads all account-scoped saved payments, requires amount and explicit method, fetches current server debt before review, previews allocation in the shared sheet, freezes one operation on confirmation, and offers same-ID manual recovery plus stored receipt detail. Pending payments block a new payment on that device/account. Unconfirmed submissions and confirmed receipts remain discoverable after reopening. No automatic background payment retry or cross-tab locking is claimed.

## Backend/deployment details

Supabase DEVELOPMENT project: `ucwtbyglnlsngvcejonu`, bomedia-sales-mgt, West EU (Ireland).
URL: https://ucwtbyglnlsngvcejonu.supabase.co
Public configuration already in ignored `.env.local`. Read configuration locally only if needed; do not copy keys into this handoff or output. Admin owner: elijahfasugba@gmail.com, display name admin. Owner chose password privately and confirmed successful app login. Never ask for their password in chat.

Applied migrations:
1. `supabase/migrations/202609070001_identity_catalog.sql`: businesses, profiles, customers, materials, material_widths, price_versions; private authorization helpers, RLS/grants.
2. `supabase/migrations/202609070002_atomic_sales.sql`: sales_rules, sales, sale_items, payments, payment_allocations, audit_events, private.sale_operations; exact pricing helper and public.create_sale.
3. `supabase/migrations/202609070003_customer_debt_reads.sql`: three security-definer read functions — `public.customer_outstanding_sales(target_customer_id)` (one customer's open, not-fully-paid sales regardless of business date), `public.customer_debt_totals()` (business-wide customer count and total outstanding debt), `public.customer_balances(search_text, page_limit, page_offset)` (paginated, searchable customer list with each customer's current balance). These expose only aggregated/derived balances scoped by business or by a single customer_id argument; they do not grant unrestricted historical table access. Applied to the development project and verified with `supabase/tests/customer_debt_reads.sql` (rollback transaction).

4. `supabase/migrations/202609070004_subsequent_payments.sql`: payment transaction/idempotency, review flags and deterministic debt/customer sort ordering. Applied 8 September.
5. `supabase/migrations/202609070005_payment_review.sql`: scoped exact JSON payment context, avoiding float conversion and row-limit truncation of review. Applied 8 September.
6. `supabase/migrations/202609080006_payment_activity.sql`: shared daily receipt/count/method totals and detail with collector/allocations; admin-only all-time unapplied list. Read-only RPC, applied 8 September.

`create_sale(operation_id uuid,payload jsonb)` checks active account/business, serializes same operation via transaction advisory lock, compares prior actor/payload, validates catalogue/customer/rules/totals, creates new customer if needed, complete sale/items and optional initial payment/allocation, audit and receipt in one transaction. Receipt returns string invoice number/totals. Reused ID with changed payload is rejected. Historical selected prices can be honored with flags; unavailable material/rules changes require review. Direct client financial writes/deletes are denied.

Financial table reads restrict staff to seven days, admin full business history. Dedicated old-debt retrieval is now implemented via the scoped `customer_outstanding_sales`/`customer_debt_totals`/`customer_balances` functions above (migration 3), not by loosening table RLS.

Supabase CLI already authenticated and linked. Observed executable: `/Users/enfash/.npm/_npx/aa8e5c70f9d8d161/node_modules/@supabase/cli-darwin-arm64/bin/supabase` (check availability; path may change). This CLI initializes/rotates a temporary database login even for linked queries. DO NOT run parallel CLI database commands: simultaneous tests failed with temporary-role password errors. Serial queries work. Use dry-run and transactional tests before applying new migrations; do not edit applied migrations to change deployed behavior.

`supabase/config.toml` disables signup and preserves prior confirmation/TOTP settings. A previous sparse config push applied defaults unexpectedly; corrected afterward. Do not blindly push partial auth config. Do not retrieve privileged credentials for ordinary read/UI work.

MCP: Supabase server added, OAuth verified with `projects:read,database:read` only. Its tools were not loaded in Codex's active tool list. Do not imply MCP write privileges. Optional Supabase agent-skills package has not been installed.

## Completed checks and precise limits

Passed: `npm run check` (TypeScript + lint), 11 local tests, a web export (`npx expo export --platform web`, all `(tabs)` routes built without errors), and a Playwright screenshot/console check against the running dev server on port 8081 showing the login screen renders with zero console errors. Also passed: `supabase/tests/identity_catalog.sql`, `supabase/tests/atomic_sales.sql`, and the new `supabase/tests/customer_debt_reads.sql`, all run via `supabase db query --linked -f <file>` in self-contained rollback transactions against the deployed development schema (no data left behind). Android export and native SecureStore/SQLite were not re-verified this session (no device attached). The authenticated Records/Customers tabs were not visually verified — no owner credentials are available in this environment (a login/password should never be requested in chat); this remains a real gap, same as prior sessions' sales-screen note.

Local tests exercise rounding boundaries/inches/minimum/payment rules, actual SQLite reopen and account separation, lost acknowledgement after simulated server commit, changed retry rejection and no network send when durable persistence fails.

`supabase/tests/atomic_sales.sql` passed against deployed development schema in a rollback transaction: 25 items, exact inches thresholds, minimum, selected customer reuse, zero receipt, positive allocation, identical retry, changed retry rejection, tampered total, required method/phone, no orphan customer on failure, denied direct payment deletion, inactive write rejection and cross-business reads. `identity_catalog.sql` tests identity/catalogue RLS.

NOT verified: real simultaneous authenticated RPC requests; physical Android UI/keyboard/gesture/storage recovery; full offline restart access; multi-tab conflicts; multi-device debt concurrency; production backup/restore. Exports establish compilation, not runtime correctness.

Current usability/recovery concerns to review before expanding features:
- Online profile check can block reopening while offline. Define/test allowed cached access instead of silently bypassing authorization.
- Customer search and starting the next sale require connectivity; Android offline functionality is incomplete.
- Only one active draft shown; multiple browser tabs can overwrite the current-draft pointer. Do not claim multi-tab safety. Review durable recovery/listing of every pending operation and archive draft snapshots before allowing concurrent workspaces.
- An uncertain submission stays frozen; admin resolution for rejected payloads is not implemented. Never discard or generate another ID merely because a request timed out.
- Draft persistence and auth/AppState remount behavior need interruption tests on-device.
- Price/timing review flags are stored but there is no admin review screen or cash-day close logic.
- Customer phone filling/snapshot behavior, stale price selection and schema boundary limits should be reviewed against approved policy as related UI is added.
- There is no release deployment, EAS signing configuration or device beta yet.
- Records/Customers screens (added this session) are unverified against a real authenticated session, native gestures, and large lists; only typecheck/lint/web-shell-render were checked (see Completed checks above).
- Customers screen's "Pay debt" button is intentionally disabled with explanatory text — do not wire it up without implementing the transactional oldest-first allocation function from stage 4 below.

## Pending authorization — do not bypass

An extra concurrency verification was proposed: briefly use the privileged server key IN MEMORY, create an isolated temporary staff Auth account/business, send two authenticated same-ID sale requests, verify exactly one sale/payment/customer/audit/receipt, then remove all test records/account. No email, credential logging or app-bundled secret was intended.

Automatic approval review REJECTED this because app-testing authorization did not explicitly authorize privileged credential access and account creation/deletion. A clear approval question was sent; no answer has been received. Later warning-fix and handoff requests ARE NOT approval for this test. The proposed test has NOT run. Do not route it through another agent/tool/CLI to circumvent the restriction. Obtain explicit approval for that exact action if still needed, or document a safer test with its limitations. The failed earlier CLI-only test fixtures were removed and its failing harness deleted.

## Recommended next stages and acceptance criteria

1. Review current implementation and fix concrete blockers. Re-run check/tests only as justified by changes. Verify Android login, live catalogue, customer selection, 25 items, unit toggle preserving text, no payment default, phone requirement, sheet review, submitted freeze, receipt and new sale. Use clearly identified development test records. Do not record real trading data without declaring the build's limits. Still not verified on a physical device.
2. Finish reliable recovery boundaries: all pending operations discoverable, serialized draft saves, confirmed receipts retained, account isolation, safe retry after lost response/restart, multi-tab ownership or clear prevention. Complete authorized concurrency verification if approved. Do not add duplicate IDs to work around failure. Unchanged this session.
3. DONE THIS SESSION (server + client, read-only): Records and Customers screens using the shared UI system, behind a new bottom-tab navigation. Seven-day staff records enforced on server (pre-existing RLS, reused as-is); scoped older-debt reads added via migration 3 (`customer_outstanding_sales`/`customer_debt_totals`/`customer_balances`); customer count/debt-total cards; offset pagination, loading/error/empty states and refresh/retry on both screens. NOT done: physical-device/authenticated-session verification (see limits above), and the "Pay debt" action is a disabled placeholder — recording a payment is stage 4.
4. Next task: implement subsequent invoice/customer debt receipts with transactional locking, oldest-first allocations, stable operation IDs, collector/method/time and audit. Test simultaneous settlement and over-allocation. Do not mix this with initial-sale receipts incorrectly. Wire the Customers screen's "Pay debt" button to this once it exists, reusing `customer_outstanding_sales` for the waterfall preview.
5. Expenses, withdrawals, single shared drawer/day, counts, admin finalization snapshots, late-entry review and consistent shared totals. Define realtime reconciliation/fallback refresh; distinguish local pending amounts from confirmed shared totals.
6. Admin-controlled users, catalogue/rates and audited business corrections. Use trusted administration; no service-role credential in client. Later production support remains a separate stage.
7. Device beta, offline/cache policy, accessibility/keyboard/large text, storage retention, backup/restore and release assets/builds. Reporting/notifications/portal remain later scope.

## Environment and workflow

Expo ~57.0.20, React Native 0.86.3, React 19.2.3, Router ~57.0.19, Paper ^5.15.3, Supabase JS ^2.115.0. Node >=22.13; local Node observed 24.19. Check package.json for authoritative installed constraints. Use `npm run check`, `npm test`; Expo SDK-compatible install commands. npm cache workaround used `/tmp/bomedia-npm-cache` because shared cache had permissions issues; do not recursively change ownership. Existing audit: 14 moderate transitive findings, no forced Expo downgrade. ESLint 9 lifecycle warning noted; coordinate upgrades with Expo config rather than upgrading arbitrarily.

A Metro process was running on 8081; verify before launching another. Never expose passwords/keys through logs. Preserve environment ignores, custom assets and all unrelated work. Do not commit or push merely to hand over.

## Required end-of-session update for EVERY AI

Update this file's date/author/current owner and implementation status BEFORE your final response, interruption handoff, context limit or model transfer. Add a concise session entry below. Include:

- User request and scope completed; exact files and schema changes.
- What is actually deployed versus only local/proposed.
- Tests run, outcomes and meaningful untested behavior.
- Any running servers/jobs, pending migrations or temporary fixtures needing cleanup.
- Known defects, failed approaches and why they failed.
- Pending user questions/permissions; distinguish proposed actions from authorized ones.
- Next concrete task and its acceptance criteria.
- New approved product/design/architecture decisions, reflected in the appropriate canonical docs.

Never include tokens, passwords, server keys or private login links. Do not claim completed work without verification. Append history but rewrite stale current-state sections so the next agent need not reconstruct contradictory statuses. If another AI is active, coordinate ownership and avoid concurrent edits to the same working tree.

## Session history

### 7 September 2026 — Claude (Sonnet 5)

Picked up from Codex's handoff below; read all five required docs and the git diff first, confirmed the baseline (`npm run check`, 11 tests) was green before changing anything.

Implemented stage 3 (read-only sales/history and customer pages):
- New migration `supabase/migrations/202609070003_customer_debt_reads.sql` (three security-definer functions: `customer_outstanding_sales`, `customer_debt_totals`, `customer_balances`) and its rollback test `supabase/tests/customer_debt_reads.sql`. Asked the user for explicit approval before running `supabase db push` against the live development project (auto-mode's classifier blocked it as a real infra action); approved, then applied and verified with the rollback test, plus re-ran the two existing SQL test files to confirm no regression. All test data rolled back; nothing was left in the database.
- New feature folders `src/features/records/` (`lagos-date.ts`, `records-service.ts`, `records-screen.tsx`) and `src/features/customers/` (`customers-service.ts`, `customers-screen.tsx`).
- Restructured navigation: moved `src/app/index.tsx` to `src/app/(tabs)/index.tsx`, added `src/app/(tabs)/_layout.tsx` (bottom tabs: New sale / Records / Customers), `src/app/(tabs)/records.tsx`, `src/app/(tabs)/customers.tsx`. Updated root `src/app/_layout.tsx` to point its Stack at the `(tabs)` group instead of a single screen.
- Fixed several `react-hooks/set-state-in-effect` lint errors by switching effect-triggered data loads to `useTransition` (for pending/loading state) and by keying detail-sheet content components on the selected id (`key={sale.id}` / `key={customer.id}`) instead of manually resetting state inside an effect — this mirrors the existing `key={profile.id}` remount pattern already used in `sales-screen.tsx`.

Verified: `npm run check` (typecheck + lint) clean, all 11 local tests pass, `npx expo export --platform web` built all `(tabs)` routes without error, and a Playwright screenshot/console-error check against the already-running dev server (port 8081, pre-existing process left untouched) showed the login screen renders correctly with zero console errors. Did NOT verify the authenticated Records/Customers tabs in a browser or on a device — no owner credentials are available here and none were requested.

Deliberately left unimplemented: the Customers screen's "Pay debt" button (disabled, with explanatory text) — payment recording/waterfall allocation is the next stage and needs its own transactional server function plus concurrency tests, not a quick client-side add.

Nothing was committed to git; all changes are in the working tree for the user to review. No running jobs or temporary fixtures were left behind other than the standard scratchpad files (playwright + a throwaway check script), which are outside the repo.

### 7 September 2026 — Codex → Claude / next AI

Implemented live catalogue/customer search, durable sale drafts, initial sale/payment transaction, retry receipts and validation tests. Removed fictional fixtures. Applied migration 002 to the agreed development project. Updated backend/architecture docs. Removed deprecated auth lock after user reported warning; check passed. Prepared this comprehensive handoff and mandatory cross-agent update rules. No Claude launch or direct message has occurred. Additional privileged concurrency test remains unapproved; no temporary test account/fixtures from failed checks remain. Next: validate authenticated Android sales/recovery and continue the staged plan above.

### Scheduled Codex return

A one-time Codex follow-up is scheduled for 7 September 2026 at 20:45 Africa/Lagos, shortly after the currently reported five-hour usage reset at 20:43:50. Automation ID: `resume-bomedia-after-usage-reset`. It will read the latest handoff and usage status. It may continue only if ownership is clearly released; otherwise it should announce readiness without editing Claude's active work. It does not authorize any privileged test or consume a reset credit. Claude should record current ownership and a final transfer note explicitly.

### 7 September 2026 — Codex review of Claude's completion summary

The user supplied Claude's completed stage-3 summary. Codex inspected the current Records/Customers source, migration 003, shared navigation and documentation. This was a read-only implementation review: no app code, database changes, deployments or new tests in this session. Claude's reported test results remain attributed to Claude; they were not rerun here. No jobs or temporary test records were created. The top ownership marker still says Claude is active; this review does not silently release that ownership or authorize overlapping edits.

Concrete follow-ups before enabling payment actions:

1. `records-screen.tsx` has no request-generation/cancellation check in `requestLoad`. Date navigation can start overlapping requests; a slower previous-date response can replace the newest result beneath the current date heading. Existing rows also remain visible while the selected date changes. Bind results and visible rows to the selected date and ignore obsolete responses. Test deliberately reversed response order.
2. Customers totals load only on mount; its customer list loads on search changes. Bottom tabs stay mounted, so returning after a new sale does not refresh customer balances/counts. Records similarly does not reload solely on refocus. Add focused/foreground or mutation-driven reconciliation, visible refresh status and an explicit refresh action; verify a sale changes the displayed totals when returning. Fetch current debt again before payment review/confirmation.
3. Add stable ID tie-breakers to paginated customer/sale ordering and to outstanding-invoice order before implementing oldest-first payment allocation. Business date plus created_at plus ID is the agreed waterfall order.

Next stage after those read-consistency fixes: transactional subsequent payments, with separate invoice-only and customer-waterfall scope, a mandatory initially-unselected payment method, durable operation IDs, one receipt with allocations, collector/timestamps/audit, and safe concurrency handling. Keep the Pay debt placeholder disabled until the server write path and recovery are ready. The privileged temporary-account concurrency test remains unapproved; Claude's approval for migration 003 does not extend to that test.


### 7 September 2026 — Codex: New Sale visual design pass

User asked whether Paper can deliver distinctive UI, accepted retaining Paper with custom shared components, then asked to continue. Scope was the New Sale presentation and invoice review, not the still-pending debt-payment implementation.

Changed: central neutral surface palettes plus small layout/typography tokens in `src/theme/tokens.ts`, wired by `theme.ts`; new shared `form-section.tsx` and `status-note.tsx`; optional emphasis/container contrast in `copyable-amount.tsx`; compact joined unit selector and shared choice styling in `choice-buttons.tsx`; new `features/sales/components/invoice-item.tsx` and `invoice-totals.tsx`; integrated those into `sales-screen.tsx` without changing its controller/save logic. `review-sheet.tsx` now places accessible expand/reduce and close icons in its header instead of a separate expand row. Width/height inputs share a responsive row. Status remains explicit about development and pending confirmation. Updated DESIGN_SYSTEM.md with actual design scope.

Verified: TypeScript/lint passed, 11 existing behavior tests passed, Android and web exports succeeded at `/tmp/bomedia-ui-polish`. After the final sheet-header adjustment, TypeScript/lint passed again and the updated sheet was visually exercised in the isolated preview. Browser screenshots inspected at 390px and 320px, staff light and admin light/dark; 320px document had no horizontal overflow. Expanded invoice sheet rendered correctly. No authenticated app sale, physical Android keyboard/gesture, or database mutation was tested. No dependencies, migrations, business rules, auth or permissions changed. Original assets and existing working-tree changes preserved; no commit.

A temporary isolated component preview lives in `/tmp/bomedia-ui-review`, using the actual shared components with fictional, non-saving values. Its Metro server uses port 8083; it is separate from the main app on 8081. It has no Supabase configuration and no app-auth bypass. The initial sandboxed server could not bind; the authorized local server subsequently started. Source aliases required explicit configuration in this temporary preview only. No project Metro config was changed.

Next: get the owner's visual feedback in the real Android New Sale flow. Read-consistency fixes from the preceding Codex review remain open (wrong-date request race, focus refresh, stable ordering). Then implement subsequent payments. Do not interpret a visual approval as approval for the still-blocked privileged test-account concurrency check. Full offline access/recovery and all other documented backend limits remain unchanged.


### 7 September 2026 — Codex: Records and Customers read consistency

User asked to continue after the visual pass. Implemented the two read-consistency issues identified in the earlier review. Added `src/services/latest-read.ts` (abort plus generation guard, with a 20-second abort timer) and `src/hooks/use-focused-page.ts` (query-key-bound snapshots, pagination, focus/foreground reload, cancellation on blur/background and during search debounce). Records now hides results belonging to another selected date, ignores obsolete responses, refreshes on return and explicitly exposes refresh progress. Customer list/totals refresh on return/foreground, with a combined manual refresh action and text identifying balances as a refreshed snapshot. Changed both feature screen/service files to use these paths and pass abort signals. Added a descending sales ID tie-breaker after created_at. Kept all permissions, sale submission logic, shared visual tokens and custom assets intact.

Tests: TypeScript/lint pass. All 14 local behavior tests pass (11 existing plus three tests for reversed response order despite ignored cancellation, cancellation before replacement/debounce/unmount, and failure/retry recovery). Android and web exports passed at `/tmp/bomedia-read-consistency` before the final addition of the request abort timer; TypeScript/lint and behavior tests were rerun after that small addition. Node's existing typeless-module test warning remains non-fatal.

Limits: No authenticated browser/device sale-to-tab-return test, native foreground test, or database write was performed. This is reconciliation on focus/foreground/manual refresh, not realtime cross-device subscription. Existing customer/detail sheets are snapshots and still need independent refresh/retry before payment review. Customer RPC pagination and outstanding-debt ordering still need server ID tie-breakers in a new migration; applied migration 003 was not edited. Offset pagination can still shift if another device inserts rows between pages. Full offline read access and Lagos midnight rollover remain follow-ups. Pay debt stays disabled.

No migrations, deployments, dependency changes, commits or new background jobs. The earlier isolated fictional UI preview on 8083 remains separate from the main app on 8081; existing servers were not stopped. Privileged temporary-account concurrency testing remains unapproved; no service-role credentials were accessed.

Next concrete task: add deterministic customer/debt RPC ordering in a new migration, then implement the atomic subsequent-payment server operation with invoice-only versus customer-waterfall scope and durable receipt recovery. Revalidate balances at payment review/confirmation, test concurrent receipts without crossing the pending privileged-account approval boundary, and exercise focus refresh in the owner's authenticated Android session. Preserve one receipt and explicit collector attribution.


### 7 September 2026 — Codex: local subsequent-payment foundation

User requested the next stage. Built and locally tested the server transaction and durable submission foundation before enabling UI. Exact changes:
- New `supabase/migrations/202609070004_subsequent_payments.sql`: deterministic customer/debt sort tie-breakers (replaces functions via new migration; applied 003 untouched), payment review_flags, private operation store and authenticated `record_payment`. One receipt, exact kobo, customer/invoice scope, oldest-first business_date/created_at/ID allocation, customer lock shared with create_sale protocol, immutable retry receipt, actor/business enforcement, timing/audit flags, excess preserved unapplied for admin review.
- New `supabase/tests/subsequent_payments.sql`: validation, exact amounts, tie order, retry/no duplicates, changed payload rejection, already-paid invoice no-spill, sequential reduced-balance/excess behavior, cross-business/inactive/anonymous/direct-write restrictions, injected late audit failure demonstrating whole-transaction rollback. Fixtures are isolated and rolled back.
- New `scripts/test-database-local.mjs`: reproducible isolated PGlite test runner using minimal auth emulation. PGlite 0.5.8 is installed under `/tmp/bomedia-payment-tests` only. First download timed out and an attempted run encountered the incomplete WASM; retry completed, and the full runner then passed twice (last run includes audit failure test). No app dependency changes.
- New `src/features/payments/submission.ts` and `payment-service.ts`: typed receipt/request, distinct payment local operation keys/kind, durable enqueue-before-send, same-ID recovery, server RPC adapter with timeout/review-required errors. Not connected to app UI.
- New `tests/payment-submission.test.mjs`: real SQLite reopen after lost acknowledgement, original operation/receipt retained including unapplied amount, no duplicate simulated server write, changed-payload rejection, account isolation and no send on local-save failure.
- Updated BACKEND_SETUP and DATABASE_AND_SYNC_DESIGN with local versus deployed status and lock/queue contracts.

Verification: TypeScript/lint passed; all 16 Node tests passed. PGlite applied migrations 001–004 and passed all four SQL suites (identity_catalog, atomic_sales, customer_debt_reads, subsequent_payments). No native/web export repeated because no UI/routes/dependencies changed; the new TypeScript modules typecheck but are not integrated. PGlite is a single-session PostgreSQL/WASM runtime: these are not concurrent-session or real Supabase Auth/PostgREST tests. No authenticated UI/device/payment flow tested.

Deployment: migration 004 is UNAPPLIED, no live project reads/writes or credentials accessed this session. Existing live schema stays at 003. Do not mistake a prepared function for an available server endpoint. The earlier privileged temporary-account/service-role concurrency proposal remains unapproved and was not attempted. No new pending approval question. No commits, asset changes or cleanup of pre-existing work.

Running jobs: temporary dependency install and local test processes completed; no database server left running. Earlier preview 8083 and main app 8081 were not touched.

Next concrete task: build the payment review/recovery UI using shared Paper controls/sheet and zero preselected method. Refresh debt before review, support customer-waterfall and invoice-only entry points, show full receipt/collector plus any unapplied amount, and list/recover all saved pending payments after reopening without generating replacement IDs. Then validate the integrated flow and deploy 004 to development under the appropriate permission boundary. Keep Pay debt disabled until that path is ready. Independent-session concurrency testing, closed-day handling, admin excess resolution and full offline access remain open.


### 8 September 2026 — Codex: payment review/recovery UI and development deployment

Continued the user's “go ahead” and “continue” instructions. Added `src/features/payments/payments-screen.tsx`, `review.ts`, thin `(tabs)/payments.tsx`, and a fourth Payments tab. Customer detail has Pay debt and Pay this invoice; Records detail has invoice-only payment. Added customerId to Records query mapping. Shared Paper ChoiceButtons (no default method), FormSection, CopyableAmount and adjustable ReviewSheet compose the payment flow; no new palette/spacing system.

Review fetches current scoped debt with new `payment_context` (migration 005), using exact kobo strings and one ordered JSON result rather than truncated PostgREST rows. Local review validates positive kobo, mandatory method and amount within current debt, previews oldest-first allocation, then explicitly confirms actual money received. Server `record_payment` revalidates balances and retains any race-related excess for admin review. Stable operation ID/payload are frozen on submit. Added repository `payments()` to SQLite and IndexedDB for account-scoped pending/confirmed history, immutable same-ID manual retry after reopen, collector/method/amount/allocation receipt detail and unapplied feedback. Pending local payments block starting another payment. Existing device identifier is reused. Collection time currently reflects preparing the review; closing/reopening review refreshes that time until submission freezes it. No public signup or business-permission changes.

Modified payment payload type to retain optional customer display name for local recovery; identity/business authority remains server-side. Added `tests/payment-review.test.mjs` and recovery-list assertions to payment-submission tests. Added `supabase/tests/payment_review.sql`. TypeScript `allowImportingTsExtensions` enables direct testing of the shared money implementation without a duplicate parser.

Verified: TypeScript/lint pass; 19 Node behavior tests pass. Isolated PGlite applies migrations 001–005 and passes all five SQL suites. Android/web exports passed at `/tmp/bomedia-payments-ui` (10 routes). Browser inspection initially timed out awaiting automatic approval; one permitted retry succeeded. Opening localhost:8081/payments renders the protected sign-in screen. No signed-in review/submission, real payment, physical Android keyboard/gesture or independent concurrent-session test was performed.

Deployment: dry-run showed exactly 004 and 005 pending. Applied both to linked DEVELOPMENT project ucwtbyglnlsngvcejonu; CLI completed successfully. No test customers/payments/accounts were created remotely, no auth settings changed and no privileged key retrieved. The separate earlier service-role/temporary-account concurrency test is still unapproved. Local tests emulate auth and cannot replace real Supabase session/concurrency QA.

Known limits: draft amount/method before confirmation are in-memory; submitted payments are durable. Payment retry is manual via Payments, not an OS background worker. Browser multi-tab exclusion is still not implemented; avoid parallel entry of the same collection. Fresh review requires network; an already-reviewed submission can be retained if the connection subsequently drops, but full offline startup/customer access remain unfinished. Local saved receipts are device/account history, not the future shared cash ledger or admin excess-resolution interface. Historical RLS, closed-day handling and full financial corrections remain as previously documented.

Existing custom assets and unrelated uncommitted work preserved; no commits/push to git. No new dev servers started; main app 8081 and old isolated preview 8083 left untouched. Opened in-app browser tab for 8081/payments. Dependency/test/build/deployment processes completed, apart from the short schema-permission verification documented immediately below when complete.

Next: owner verifies one small development payment from customer and invoice contexts on Android, confirms no preselected method and correct review/receipt, and exercises recovery with a lost connection. Then build shared receipt/cash activity and admin visibility of unapplied receipts before expenses/withdrawals and cash-day reconciliation. Do not claim production readiness or concurrency validation.

Post-deployment verification completed: linked read-only schema query confirmed both payment RPCs exist, authenticated execution is granted, anonymous execution is blocked and direct authenticated payment INSERT remains denied. No verification process is still running.

### 8 September 2026 — Codex: Android verification and recovery/sheet fixes

User asked to proceed with testing. Found existing Pixel_8 emulator (emulator-5554) and Expo Go. ADB initially could not start in the sandbox; authorized escalation allowed device inspection. App initially failed with UnknownHostException resolving the development Supabase host. Mac HTTPS worked. Restarted the same emulator with `-dns-server 1.1.1.1,8.8.8.8 -no-snapshot-load`, preserving installed apps/data (no wipe). Supabase DNS then resolved successfully. Reopened app; tapped Retry access check, and the existing authenticated session loaded New sale, Records, Customers and Payments. No passwords or privileged keys accessed.

Android checks: customer count/debt cards loaded; opened one existing customer's sheet and Pay debt; Cash/POS/Transfer all had selected=false; entered an unsaved ₦100 amount, and Review correctly rejected the missing method. Selecting Cash produced the correct customer/invoice allocation review from the deployed payment_context RPC. Inspected screenshot `/tmp/bomedia-payment-review-android.png` and expand control. Did not press Confirm payment received: no live customer receipt/sale was created. The input was only an unsaved UI test.

Found/fixed two issues:
1. `submitPaymentAndRefresh` in payments/submission.ts distinguishes acknowledgement success from subsequent history-read failure. Payments screen retains confirmed receipt and displays a list-refresh warning instead of incorrectly asking to retry the payment. Added real SQLite regression test proving confirmed status and no second server send. Workspace key now includes customer/sale IDs as well as account/entry, preventing state reuse for changed direct route targets.
2. Shared `review-sheet.tsx` rebuilt PanResponder and stateful gesture baseline during every drag. Native test moved only ~12px despite a ~426px gesture. Replaced with memoized responder and event-only refs for current fraction/start baseline. A narrow documented react-hooks/refs suppression covers PanResponder registering callbacks (refs are read only when events execute). Retest upward moved sheet top from y794 to y366 for a 430px swipe, matching the gesture. TypeScript/lint pass. This shared fix also applies to sale/customer sheets.

Validation: all 20 Node tests passed after recovery fix, TypeScript/lint passed after final sheet fix. Earlier Android/web exports and five SQL suites remain valid prior-stage evidence; no SQL changed or migrations applied this session. Signed-in Android customer-to-review is now verified, superseding the older blanket statement that no authenticated UI was inspected. Actual receipt submission, interrupted native persistence, invoice-only UI journey, physical phone, independent concurrency, and downward-drag/close verification remain unverified. During downward retest the development app reloaded to New sale with a cannot-connect-to-Expo-CLI warning referring to stale LAN address 192.168.100.33:8081, so do not count that gesture as passed.

Final environment action: set emulator `adb reverse tcp:8081 tcp:8081` and reopened `exp://127.0.0.1:8081` to avoid the stale LAN address; follow-up visual verification of that relaunch remains needed. Emulator process started by this session remains running (exec session 3554); ADB daemon/port forwarding remain active. Existing Metro 8081 and old isolated preview 8083 were not stopped. No persisted Android Private DNS settings modified; DNS overrides apply to emulator launch. Emulator XML scratch files under /tmp and /sdcard/bomedia-ui.xml are test artifacts. No Git commit or unrelated changes removed. Pending privileged temporary-account test approval remains unchanged.

Next: stabilize/verify emulator's localhost dev connection and finish downward gesture/close checks. Then test final save/reopen against a clearly identified test invoice/customer (do not assume existing customers are disposable), followed by shared receipt/cash activity and admin visibility of unapplied receipts. Full accounting and offline limits remain open.


### 8 September 2026 — Codex: shared payment activity and completed sheet checks

User requested continuation. Implemented and deployed `supabase/migrations/202609080006_payment_activity.sql`: `payment_activity(target_date,review_only,page_offset)` returns exact JSON kobo totals, receipt count, 20-row stable occurred_at/ID pages and receipt details (customer, collector, collection/server times, flags, allocations and unapplied amount). Totals aggregate receipts before allocation joins, so one receipt distributed across invoices is counted once. Scope is active business; staff daily access is today plus six preceding Lagos dates; all-date unapplied queue requires server-checked admin role. No financial write or resolution permissions added. Method totals include opening invoice receipts and later debt receipts, not pending local operations.

New `src/features/payments/activity-service.ts`, `shared-payment-activity.tsx`; integrated a Shared activity / This device history selector into payments-screen. Reuses focus/foreground/manual refresh hook, FormSection, Paper controls, CopyableAmount and ReviewSheet. Shared receipts show collector names and detailed allocations; admin can inspect all-date unapplied receipts but cannot resolve them yet. New payment entry stays above history; local recovery remains available in This device. UI clearly distinguishes collections from physical drawer balance.

Added `supabase/tests/payment_activity.sql`: tests multi-allocation receipt counted once, exact method/unapplied totals, another collector's name visible, recent payment against old debt showing its allocations, staff history/admin-queue denial, admin older-date/all-time access and cross-business isolation. Fixtures only in isolated PGlite; all rolled back.

Validation: TypeScript/lint, all 20 Node tests, all six SQL suites and Android/web exports passed (`/tmp/bomedia-shared-payments`, 10 routes). Migration dry-run identified only 006 pending; authorized development push applied it successfully. Existing remote financial records unchanged by this session; no payment Submit/Confirm, test account or privileged key use. Earlier privileged concurrency approval remains pending.

Android QA: emulator was stalled on localhost launch. Restarted Expo Go process without clearing data and reopened `exp://10.0.2.2:8081`; authenticated app resumed. Shared view fetched a previously existing confirmed receipt, showed cash amount/collector and detailed invoice allocation/collection/server timestamps. This observes existing data; do not attribute that receipt's creation to these read-only QA actions. Opened read-only receipt popup; downward drag moved sheet top y794→y1095, then Close review returned to activity. This completes downward/close verification left open in the previous session; upward/expand were already verified. Admin all-time unapplied view loaded zero receipts with correct empty state. No staff-login UI session or simultaneous-device convergence test performed; server role rules are covered by local SQL tests. No screenshot exported as a new deliverable in this stage.

Limits: shared collections are refreshed snapshots, not a live subscription or cash-drawer balance. Opening cash, expenses, withdrawals, cash-count/finalization and admin excess resolution remain unimplemented. Offset pagination may shift if new receipts arrive between pages; UI de-duplicates IDs and Refresh reloads the first page. Receipt detail is a snapshot. Independent-session payment concurrency, native interrupted-submission recovery, full offline startup and browser multi-tab exclusion remain open.

Environment: emulator/ADB and earlier reverse mapping remain active; emulator DNS override from prior session retained. Expo Go was restarted, Metro 8081 and old preview 8083 were not stopped. No new server processes, pending migrations, commits or unrelated file cleanup. All build/test/deployment commands finished. Emulator is left on Payments → Shared activity → admin unapplied empty list.

Next concrete stage: expenses/withdrawals and shared cash-day foundation, keeping a single drawer and collector attribution, with server permissions/audited immutable entries. First confirm the documented opening-cash/count/finalization rules from the canonical product spec and implement a narrow tested transaction plus shared activity. Cash totals must include full received cash once, including unapplied receipts. Do not present collections as cash on hand. Retain unfinished native recovery/concurrency QA in the test plan.


## 8 September 2026 — Codex: shared cash foundation

Implemented and deployed `202609080007_cash_foundation.sql` to development after a successful dry-run identifying only 007. Adds `cash_days`, immutable `cash_outflows`, private cash operation receipts, `record_cash_entry` and `cash_day_summary`. Active staff/admin can record one current-Lagos-day opening (zero allowed), expenses and withdrawals with explicit method/reason. RLS/direct-write revocations keep writes behind scoped server transactions; retries match actor plus exact payload and return the original receipt. Entries and audit records commit atomically. No corrections or finalization added.

Shared expected cash = opening + full cash receipts (including unapplied receipts, counted once) − cash expenses − cash withdrawals. No opening means NULL/unavailable, not zero. POS/transfer outflows remain outside the physical drawer. Reads enforce staff seven-date scope; the present screen displays today only. Timing/delayed-sync flags are stored, not resolved. Actual outflows may make expected cash negative.

Source changes: new `src/features/cash/{submission.ts,cash-service.ts,cash-screen.tsx}`, thin Cash route and fifth tab. Shared Paper controls, copyable amounts and review sheet reused. SQLite/IndexedDB repositories gain account-scoped `cashEntries()` on existing storage schema. Submitted requests are persisted before sending with immutable cash-prefixed IDs; same-ID retries and confirmed receipts survive reopening. Confirmation remains visible if refreshing local history fails. Shared signed-money formatting now handles negative amounts including less than one naira. No dependency, asset or existing financial-record deletion.

Validation: TypeScript/lint pass; all 24 Node tests pass (four new cash validation, exact signed amounts, disk failure and real-SQLite reopen/lost-response tests); all seven isolated PGlite SQL suites pass against migrations 001–007. New SQL tests cover missing opening, duplicate opening, changed retry rejection, exact drawer totals with split/unapplied receipts, POS/transfer separation, method/reason/zero validation, actor display, business isolation, old staff history, direct-write denial and absence of partial failed writes/audits. These are isolated fixtures, not independent concurrent remote sessions. Android/web exports pass, 12 routes, `/tmp/bomedia-cash-foundation`.

Signed-in Android verification: Cash tab reads the development server, shows existing ₦100 cash collection, no opening/expected cash unavailable, zero outflows and no preselected method. Existing saved app data preserved. An initial stale development reload reported NativeDatabase.prepareAsync NullPointerException; force-stopping/reopening Expo Go cleared it and both New sale and Cash loaded successfully. This is observed recovery, not a proven root-cause fix. No opening/outflow/payment was submitted during QA. Native final confirmation, review-sheet interaction for this particular form, interrupted cash save and browser IndexedDB recovery remain untested.

Limits / priority follow-up: a definitively rejected saved entry (especially two different opening IDs racing for one day) remains pending and blocks this device's next cash entry. Implement server-verified rejection resolution without discarding an uncertain committed request; do not recommend deleting local storage or generating replacement IDs. Cash unsent form fields are in memory, while submitted entries are durable. New review requires a successful loaded drawer snapshot; this is not a guaranteed fresh connectivity check or full offline entry policy. Cross-device values reconcile on focus/foreground/manual refresh, not realtime. No admin corrections, closing counts, finalize/reopen or immutable close snapshots yet. AuthGate offline/remount and multi-tab issues remain.

Pending approvals: prior privileged temporary-account/service-key concurrent HTTP test remains unapproved and was not attempted. No further deployment approval pending for 007. No commit or push. Existing Metro 8081 and Pixel_8 emulator left running (Expo URL exp://10.0.2.2:8081); prior preview 8083 untouched. No build/test job remains running.

Next concrete task: implement/test safe resolution of definitively rejected cash requests (preserve uncertain submissions), then closing counts and admin-only finalization with immutable snapshots and late-entry review. Verify native recovery using clearly designated test records with the owner; existing customer and financial records are not disposable fixtures.


## 8 September 2026 — Codex: terminal cash rejection recovery

Completed the next task requested by the owner. Added/deployed `202609080008_cash_rejection_recovery.sql` and `process_cash_entry`. This wrapper locks the active profile and uses the SAME business/operation advisory lock as `record_cash_entry`. It returns existing matching actor/payload receipts before attempting any write. For a new/retried request it executes the original writer inside a nested transaction; selected validation exceptions roll back every attempted financial write before a permanent rejection receipt plus audit event is stored. Unexpected backend/permission/transport failures do not become terminal rejection results. No read-then-delete race or deletion of local history.

Rejected IDs are reserved in private.cash_operations with their original actor/payload. Both new and legacy writers return that same result; changing payload or claiming another actor's ID remains denied. A stale client cannot later turn a terminal rejection into a financial entry. No permissions to edit/void existing money entries were added. Existing migration files were preserved.

Client: cash-service now calls process_cash_entry and validates rejected operation identity. Cash submission returns a confirmed receipt or a typed server rejection; SQLite and IndexedDB preserve the latter as existing-schema needs_attention with rejection metadata. Only validated terminal cash rejections stop blocking the next entry. Cash screen displays “Not recorded” plus the server explanation and keeps the historical card; no retry button on finalized rejection. Uncertain requests retain Retry saved entry. Local persistence failure keeps the request pending; local-list read failure leaves the form conservatively frozen for retry. No new dependencies/assets or unrelated changes.

Validation: TypeScript/lint and git diff --check passed; 26 Node tests passed, including rejection response loss/reopen, immutable payload, account scope, wrong-ID rejection and local disk failure. Eight isolated SQL suites pass through migrations 001–008; new suite covers existing committed receipt recovery, duplicate opening terminalization, legacy/new retry stability, changed-payload/different-actor rejection, new valid entry afterward, exactly one rejection audit, anonymous denial and unexpected backend error remaining unresolved. Sequential tests verify locking code paths but do not prove independent-session races. Android and web exports passed (12 routes; /tmp/bomedia-cash-recovery). Authorized dry-run identified only 008; development push succeeded.

Not tested this session: native interactive rejection/reopen journey, IndexedDB browser interruption, actual independent HTTP concurrency or two-device race. No live financial entries/test users created or removed, no credentials accessed, and no emulator interactions in this session. Prior privileged temporary-user/service-key test remains unapproved. No pending migration/approval or running build/test/deployment job. Existing Metro/emulator/preview processes left untouched. Nothing committed or pushed.

Next concrete task: closing counts and admin-only finalization with immutable closing snapshots, variance and late-entry needs-review semantics. All ledger writers must coordinate with finalization before shipping it; test entry/finalize ordering and never silently rewrite finalized totals. Keep native recovery and independent-session race checks in the test plan; use designated test records rather than existing customer money.


## 8 September 2026 — Codex: supplied UI conversation review

Reviewed the user's pasted ChatGPT discussion about desktop web versus mobile presentation, current design documentation, navigation source, shared Page, and working-tree change summary. Current source uses the same five bottom tabs across platforms and a shared form-width Page; a dedicated desktop shell is not implemented. The pasted discussion is reference material, not approval of its example colours, extra modules, or exact breakpoints. Existing role colours, business permissions and custom assets remain authoritative.

Changes this session: this continuity note only. No application code, canonical product decisions, migrations or deployments changed; no tests run for this read-only assessment. Existing deployment/test evidence and pending privileged concurrency-test approval remain unchanged. No jobs started or stopped; previously reported processes were not rechecked. Next concrete task: establish whether the owner wants the proposed web rules documented and implemented, then scope a desktop shell around the existing New sale, Records, Customers, Payments and Cash routes with shared business logic. Closing/finalization remains the previously pending backend stage.


## 8 September 2026 — Codex: mandatory BOMedia UI skill

Owner approved creating persistent UI rules. Added `docs/skills/bomedia-ui/SKILL.md` as a project-local skill, required explicitly by AGENTS.md for every UI design, implementation or review task, including agents without automatic skill discovery. Added the approved direction and accurate implementation distinction to DESIGN_SYSTEM.md. Rules cover responsive shells, real-route navigation, desktop tables/forms, mobile sheets, shared theme and domain logic, retained draft/recovery state and visual verification. Existing role colours and user assets are preserved.

Validation: bundled quick_validate.py could not run because this Python lacks PyYAML. Reviewed its checks and ran fallback checks for this simple two-field frontmatter, skill naming/description, absent TODO scaffolding, relative reference resolution and AGENTS routing; passed. Git diff --check passed. No application tests or visual QA were needed or run for these documentation changes. Automatic discovery was not installed/tested; mandatory project routing is explicit. No application code, database, migrations, deployments or assets changed. No jobs started/stopped, prior process status not rechecked, and privileged concurrency approval remains pending.

This supersedes the previous note's question about whether to document the rules: documentation is now requested and complete. Next concrete UI task is implementing the desktop shell around existing routes and adapting Records/Customers presentation under this skill; this session did not implement the redesign. Closing/finalization remains pending separately.


## 8 September 2026 — Codex: first desktop implementation, visual review pending

Owner said “okay go ahead” after creation of the mandatory UI skill. Read the skill and exact Expo v57 docs. Added shared AppShell with the preserved BOMedia logo, existing five labelled route links, active states, compact/full sidebar and page topbar. Same Tabs navigator remains in a stable tree position; desktop hides bottom tabs/header, narrow web/native retain them. Added useWorkspaceLayout and shared 900/1200 breakpoints/shell dimensions. Page accepts opt-in workspace width; Records/Customers render Paper tables on desktop with aligned money and existing row-detail flows; New Sale uses two columns at wide widths. Existing queries, permissions, exact calculations, durable submission/recovery and assets were not changed. Payments/Cash inner layouts and ReviewSheet remain unchanged.

Validation: TypeScript/lint passed after final source edit; all 26 Node tests passed; Android/web export passed to /tmp/bomedia-desktop-export (12 static routes). Git diff --check passed before documentation update. No SQL changes, migrations/deployments, live financial records, credentials or privileged tests. Existing uncommitted work preserved; nothing committed.

Visual blocker: opened localhost:8081 in this task's browser; it shows sign-in, so authenticated desktop/mobile/table/logo rendering, keyboard navigation, browser history, resize draft/selection/recovery retention, role/dark variants and native regression have NOT been visually verified. User was asked to sign in privately in the browser panel and reply “signed in.” Do not bypass AuthGate or imply visual approval. Existing Metro PID 92386 was observed on 8081 and retained; export/check jobs finished. No other prior process state rechecked; privileged temporary-account concurrency approval remains pending.

Next concrete task: after sign-in, inspect New Sale, Records and Customers at wide desktop, intermediate and narrow sizes; verify links, history, long values and resize state retention without submitting financial entries. Fix any issues before claiming this UI stage verified. Later improve Payments/Cash desktop composition and desktop review presentation as needed. Closing/finalization backend remains separate pending work.


## 9 September 2026 — Codex: signed-in audit and adaptive UI refinement

User signed in, then explicitly requested continued work using expo:building-native-ui, an audit before edits, genuinely adaptive mobile/tablet/desktop, permanent desktop sidebar, structured headers/contextual actions/filters/tables. Read that skill plus project UI rules and Expo v57 documentation. Audited current source and signed-in admin dark New Sale/Customers/Records/Cash before changes; Payments source showed narrow stacked content. Existing Paper/role rules retained over generic Apple-only skill preferences.

Implemented: logo light backing without altering asset; removed duplicate Records/Customers headings; table column spacing and keyboard row semantics; FocusedScene hides inactive web content from sequential focus without unmounting. Added shared WorkspaceToolbar and MetricGrid, 760px tablet threshold/roomy page option, structured desktop title/description and contextual New sale/Find customer links. Records date/refresh and customer search/refresh are grouped. Cash uses summary/entry columns at wide desktop, wrapping tablet metric groups, outgoing desktop table and explicit empty device state. Payments uses desktop shared receipt table with unapplied indicator and existing server date/admin filtering. Financial services, business rules and recovery state machine unchanged; no invented sorting/filters, no new native dependencies. ReviewSheet remains unchanged.

Verified in signed-in browser before tab closure: 1440px New Sale side-by-side empty draft, Customers at 1440/950/390 with actual balances, search retained through resize, customer detail opened by keyboard and retained across resize, Escape/Close dismiss, Records at 950 showing existing seven-digit naira value and invoice detail, browser Back returns to New Sale. Found hidden Payments controls reachable by keyboard on Customers and fixed with FocusedScene; retest opens customer detail using Tab/Enter. A transient nested-button warning caused by a passive detail Card role was corrected before proceeding. No Confirm financial actions, new server records or test accounts. Search test cleared. No sale draft values altered.

Latest validation: TypeScript/lint passed after final roomy-page edit; all 26 Node tests passed. Android/web export succeeded at /tmp/bomedia-adaptive-export before the final two Page workspace boolean changes, which then passed type/lint checks. No migrations/deployments or commits. Existing unrelated working changes preserved.

Current visual blocker: original browser tab disappeared during resumed session; replacement tab 2 at localhost:8081 requires sign-in because auth is tab-scoped. Asked owner to sign in again privately; no credential access/bypass. New structured headers/toolbars and Cash/Payments refinements are not yet visually verified. Browser viewport override reset; replacement tab retained for continuation. Existing Metro PID 92386 on 8081 retained; all check/export jobs finished. Other earlier process status not rechecked. Pending privileged concurrency approval unchanged.

Next concrete task: after owner signs into retained preview, verify latest layouts at mobile/tablet/desktop, header actions/date/search controls, table long values, fresh receipts and Cash empty states using read-only flows. Check focused navigation and state retention after final structure changes. Light/staff variants, physical device/keyboard/gestures and pending-operation resize recovery remain outstanding. Do not claim release readiness. Backend closing/finalization and richer desktop review dialog remain separate future work.


## 9 September 2026 — Codex: latest signed-in responsive visual checks

Owner's “sign in” message corresponded to an authenticated Cash page in retained browser tab 2. Sign-in blocker resolved. No application code changed this session. Read-only browser inspection of current implementation: admin light Cash at 1440×900 (summary/entry columns, permanent sidebar, structured header, empty local/shared states), 820×1000 (grouped metrics and stacked sections, bottom navigation), 390×844 (single-column metrics, compact navigation). Payments desktop at 1440 and 950 showed header action/date controls, switched to 8 September and loaded an existing receipt in its table, opened receipt detail and retained selection at 390px; Close review worked. Find customer header action navigated to Customers; inspected current search/refresh toolbar and exact balances; Records header New sale action returned to the existing empty draft. No draft values changed or financial entries submitted.

No layout failure observed in these samples. Prior dark/keyboard/search retention evidence still applies to the earlier audit; latest light layouts now have browser evidence. Remaining limits: physical native devices, staff presentation, extreme text scaling/longest labels, populated Cash outgoing rows and unknown/confirmed/rejected operation resize recovery are not covered by this read-only run. Finalization/backend and desktop dialog improvements remain separate work.

Updated DESIGN_SYSTEM.md with this evidence. No new tests/builds needed for documentation-only changes; preceding TypeScript/lint, 26 tests and exports retain their stated scope. No migrations, deployments, new processes, credentials, privileged tests or commits. Viewport override reset and signed-in tab 2 kept as deliverable on New Sale. Existing server left running; no process status changes. Pending privileged concurrency approval unchanged. Next concrete task: owner visual review, then native/accessibility and populated-table QA before release claims.


## 9 September 2026 — Codex: automatic blank form after confirmed sale

Owner reported confusing manual New sale step after submission and requested automatic reset. Changed sales-screen so durable confirmation closes review and calls openBlankSale, refreshing catalogue and saving a new blank draft before unlocking entry. Page key changes only with draft ID, resetting scroll and child controls. Success StatusNote identifies invoice and flags. Confirmed-but-unadvanced draft on startup also advances safely. Failure to refresh catalogue/save next draft keeps confirmed receipt with retry-opening wording; no resubmission is enabled. Pending/uncertain writes retain prior recovery. Added saveNextSaleDraft in sales/submission.ts to require existing confirmed operation and fresh draft identity; receipts remain in operation storage. Product/design docs updated.

Validation: 27 Node tests pass, including new SQLite regression covering refusal to replace pending draft, failure to save next draft, confirmed-receipt retention and restart persistence. TypeScript/lint passed after correcting narrow newDraft return type and helper declaration order. Android/web export completed to /tmp/bomedia-auto-next-sale (see tool evidence); export started before the declaration-order-only lint fix. No database migrations/deployment/financial records.

Browser inspection found the owner's active unsubmitted draft with selected customer and one item. Left it untouched and did not press Submit, reload, or clear it. Live submit-to-blank transition and native behaviour remain untested; verified helper persistence with isolated tests instead of creating real sales. Existing signed-in browser retained. No new server jobs or commits; build/check jobs finished, prior Metro retained. Pending privileged concurrency approval unchanged. Next: owner exercises next legitimate sale and confirms auto-blank UX; retain native/recovery and full accounting limits from earlier notes.


## 9 September 2026 — Codex: automatic reset recovery follow-up

Owner requested continuation. Read-only browser check showed New Sale with empty customer/phone/dimensions and zero items, quantity default 1. Did not observe the actual submission transition, so this is blank-form evidence only; no user draft values or real financial records changed. Kept signed-in tab 2 as deliverable without resizing/reloading.

Added one SQLite integration regression to tests/submission.test.mjs: simulated server commit followed by lost response cannot replace active draft; same-ID recovery confirms exactly one server write; next blank draft persists with a different identity; a subsequent old-ID replay uses its receipt without another server call; another account cannot advance that sale. All 28 Node tests pass. No application code changed; prior type/lint/export evidence remains valid. No migrations, deployments, background jobs or commits. Pending privileged concurrency approval unchanged.

Automatic next-sale implementation and isolated recovery checks are complete for this change. Live observed submit-to-blank transition, real native interrupted-session recovery and release QA remain unverified. Next concrete product work remains closing counts/admin finalization under the canonical approved rules; verify scope before expanding beyond this UI-fix request.


## 9 September 2026 — Codex: explicit ownership handoff

Owner reported 7% remaining usage and requested another AI continue until reset. Updated the top continuation brief with current implementation, exact files, latest 28-test evidence, browser/session caveats, next live-verification steps and authorization boundaries. This is the final Codex work in this session; no further implementation is running. No new application edits, tests, migrations, deployments, real sales or commits in this handoff-only stage. Git status inspected and existing extensive uncommitted work preserved. Metro listener on 8081 checked during handoff; retained. No Codex test/export jobs pending. Other historical emulator/preview processes not rechecked. Next AI should claim ownership in this document on resumption.


## 9 September 2026 — Claude (Cowork, Fable 5.1): live auto-blank verification, durable confirmation note

Took ownership from Codex's explicit handoff. Read AGENTS.md, HANDOFF.md, the relevant sales-screen/submission/auth-gate source and git status first. Opened `http://localhost:8081/` in the desktop app's built-in browser pane; the owner signed in privately and chose to submit a real sale himself while the agent observed. No credentials were read; no test accounts, privileged keys, migrations or deployments.

Evidence (web, admin, dev project):
- Pre-submit baseline: blank draft id `56d0c6bb-2338-4c63-84db-6d4dc87858e9`, 0 items, quantity 1, method null, IndexedDB outbox empty, page loaded 09:18Z with no reload afterwards.
- Owner submitted at 10:31:22Z: customer “ne ade ventures” (existing), 1 item Flex 2×4 ft ×5, total ₦7,200.00, received ₦7,000.00 (balance ₦200.00), no review flags. Outbox operation `56d0c6bb…` is `confirmed` with result `saleId 7f46259a-9152-4ab7-8cb1-f7881beb4282`, invoice number **12**.
- Post-submit: current draft is a new id `2a858309-7e49-4601-b522-9e147799b9ba`, blank customer/phone, 0 items, quantity 1, method null, no payload; Records (Today) lists “Invoice #12 · ne ade ventures ₦7,200.00 · Open” exactly once, above #11 and #10. No console errors. The browser pane was returned to New sale.
- Not observed: the review sheet closing animation itself and the success StatusNote — the owner reported seeing a blank form with no “Invoice #12 saved” note.

Root-cause check for the missing note (read-only, live tab): overriding `document.visibilityState`/`hidden` and dispatching `visibilitychange` hidden→visible made the page text go “New sale…” → “Checking your access…” (≈0.3 s) → “Opening your sales workspace…” → back to the form within ≈0.85 s. `AuthGate` sets `revision` on every AppState `active` and nulls the profile on every `onAuthStateChange` event, and renders the checking page instead of children while loading, so the whole tab tree remounts on every visibility change on web. Any in-memory state (success note, open sheet, unsaved payment entry, list snapshots) is lost; durable drafts/operations are not.

Changes (client only):
- `src/features/sales/submission.ts`: `saveNextSaleDraft` writes a `last-confirmed-sale` draft record `{operationId, receipt, advancedAt}` before saving the new current draft; new `LAST_CONFIRMED_SALE` constant, `LastConfirmedSale` type and `loadLastConfirmedSale(repo)` (returns null on missing/corrupt/incomplete data; feedback only, never the receipt source).
- `src/features/sales/sales-screen.tsx`: `Ready.lastConfirmed`; `isUntouched(draft)` and `confirmedNote(receipt)` helpers; the loader reads the last confirmed sale only when the current draft is untouched; `SaleForm` initialises `success` from it; `update()` clears the note on first edit. Existing reset/recovery logic untouched.
- `tests/submission.test.mjs`: new test — pending sale is not reported, confirmed advance persists across SQLite reopen, other account sees nothing, corrupt and incomplete records are ignored.
- `docs/DESIGN_SYSTEM.md` and `docs/PRODUCT_SPECIFICATION.md`: one sentence each describing the persistent confirmation note.

Validation: `tsc --noEmit` passed; all 29 Node tests pass (`npm test`, Node 22.23 in the Cowork Linux VM). The dev app hot-reloaded and still renders the blank New sale with no console errors. LIMITS: `expo lint` could not run in the Cowork VM (“Cannot find native binding” — node_modules were installed on macOS arm64); run `npm run check` on the Mac before claiming lint clean. No Android/web export was rerun (no routes/dependencies changed). The restored note has not been seen on a live sale yet because invoice #12 advanced before the record existed. `git diff --check` not run.

Environment note: running `git status` from the Cowork Linux VM left an empty stale `.git/index.lock` that the VM could not unlink by default; it was removed after the owner granted delete permission (no other deletions). Prefer `git --no-optional-locks status` from that VM. Metro on 8081 kept running; built-in browser tab left signed in on New sale. No emulator, preview or other processes touched or rechecked. No commits/pushes; no unrelated files changed. Pending privileged concurrency-test approval unchanged. Owner was asked and approved fixing the note now; the AuthGate remount change above is proposed, not yet approved.
\n

## 9 September 2026 — Claude (Cowork, evening): AuthGate remount fix and design review

Continued after the confirmation-note fix, with the owner's approval for the fix and a new standing instruction that UI work go through Claude artifacts.

**AuthGate.** New `src/features/auth/access-policy.ts` holds the decision logic as pure functions: `classifyProfileResult` (verified / denied / unavailable — PGRST116 "no row" and inactive/unknown role are denials, everything else is unavailable), `resolveAccess` (a verified profile survives routine re-checks and transport failures, keeping object identity when nothing changed so consumers keyed on it do not reload; a denial always ejects; an unavailable first check still blocks), and `keepProfileForSession`. `auth-gate.tsx` uses them plus a `verified` ref readable inside the auth callback: `onAuthStateChange` keeps the profile when the same user id is re-emitted (SIGNED_IN on focus, TOKEN_REFRESHED), the verification effect only shows the blocking "Checking your access…" screen when nothing is verified yet, and messages are now specific ("Your account is not active for this business. Contact your admin." vs "Access could not be verified. Check your connection and retry."). No permission, query, or business rule changed; the server still authorizes every read and write.

New `tests/access-policy.test.mjs` covers all of it: classification of active/inactive/unknown-role/no-row/transport, identity preservation on an unchanged re-check, denial ejecting a previously verified user, transport failure keeping a verified workspace but blocking a first check, and session-event retention.

Validation: `tsc --noEmit` clean; **34 Node tests pass** (28 previous + 1 last-confirmed-sale + 5 access-policy). Live browser check on the signed-in tab: simulating a hidden→visible visibility cycle produced zero DOM text transitions and the form stayed put, where the same script earlier showed "Checking your access…" for about 0.85 s; two `/rest/v1/profiles` calls were still observed across the cycle, so re-verification is intact. LIMIT: `expo lint` still cannot run in the Cowork Linux VM ("Cannot find native binding" — node_modules are macOS arm64), so run `npm run check` on the Mac. Native/Android AppState behaviour for this change is untested.

**Design review.** Captured the signed-in build at 1440 px (New sale, Records, Customers, Payments, Cash) and 390 px, read the tokens and shared components, then published a design canvas — "BOMedia Sales Screens" — with proposed layouts for all five screens at desktop and phone plus a twelve-point written review. It reuses `tokens.ts` exactly (admin #2b3493, surfaces #f6f5f2/#ffffff/#efeee9, 16 px card radius, 232 px sidebar, 8 px spacing step) and keeps every existing shared component and business rule. Main findings: the material field defaults to the most expensive rate; disabled actions never say what is missing; no screen has a dominant figure; New Sale's right column is empty until an item exists; Records reserves a Review column that is almost always em-dashes; status and method are bare text rather than chips; two input styles in one form; the environment marker is stated three times; icon-only date arrows too far apart; tables do not become cards on a phone; empty states read like faults; unapplied money is a filter rather than an alert. Nothing was implemented from it this session.

Note for the next agent: the canvas proposes a sort control on Customers. Do not ship it as a client-side sort of one fetched page — it needs the server ordering that migration 004 already established for the debt waterfall.

Environment: no migrations, deployments, financial records, credentials, privileged tests, commits or pushes. Metro 8081 and the signed-in browser tab retained; browser viewport emulation reset. `git status` from the Cowork VM leaves a stale empty `.git/index.lock` the VM cannot unlink by default (removed earlier this session after the owner granted delete permission) — prefer `git --no-optional-locks status` from that VM. Pending privileged concurrency approval unchanged.
\n

## 9 September 2026 — Claude (Cowork, evening): material rates and blocked-action copy

Implemented items (a) and (b) of the design review's fix-first list. Presentation only — no domain, pricing, permission, query, migration or deployment change.

- `src/components/ui/choice-buttons.tsx`: options accept an optional `caption`, rendered after the label ("Flex · NGN 180.00/sq ft") and appended to the accessibility label.
- `src/features/sales/sales-screen.tsx`: `materialOptions` maps the live catalogue to those captions using the existing `formatNaira`/`nairaToKobo` helpers, so the rate is read at the moment of choosing. The separate "Rate per square foot" row is replaced by one line stating that rates are per square foot and admin-set. `newDraft` no longer preselects `catalog.materials[0]` — the catalogue is alphabetical, so every new item used to start on Clear sticker at NGN 350/sq ft rather than the everyday Flex at NGN 180. New derived `itemBlocker` and `reviewBlocker` strings drive both the disabled state and a live-region line under each button; the generic "The calculated amount and rounded charge will appear here." placeholder is gone because the blocker says it precisely.

Verified in the signed-in browser on the live development app: all four materials render with their real rates from the catalogue (Clear sticker NGN 350.00, Flex NGN 180.00, SAV NGN 200.00, Window graphics NGN 500.00), Review sale is `aria-disabled=true` with "Add at least one item before reviewing this sale.", and the item button reads "Enter a width, height and quantity to see the charge.". `tsc --noEmit` clean; 34 Node tests pass.

UNTESTED: the no-material-selected state was not observed live. The owner's current draft (2a858309-...) predates the change and still carries a materialId, and that draft was deliberately left untouched, so the blank material state and its "Choose a material to price this item." blocker will first appear on the next new sale. Also still untested: native/Android rendering of the longer material labels (they may wrap on a narrow phone — check before release), `expo lint` (cannot run in the Cowork Linux VM; run `npm run check` on the Mac), and the caption's effect on the compact FEET/INCHES variant is nil since units pass no caption.

No commits or pushes. Metro 8081 and the signed-in browser tab retained. Pending privileged concurrency approval unchanged.
\n

## 9 September 2026 — Claude (Cowork, evening): dominant figure on Cash, Customers and Payments

The owner reviewed the design canvas, said it reads more clearly than the current build, and asked for it to be implemented. This is the first stage: the review's "one dominant figure per screen" finding, on the three screens whose data the deployed RPCs already return. No query, migration, permission, deployment or business-rule change; no new colour tokens.

- New `src/components/ui/key-figure.tsx` (see DESIGN_SYSTEM.md for the contract). `CopyableAmount` gained a `hero` size (`displaySmall`, weight 700, tabular numerals, -1 letter spacing); existing `emphasis` callers are untouched.
- `cash-screen.tsx`: expected cash leads, with opening/received/expenses/withdrawals as its breakdown and the actor who counted the opening; the missing-opening case now states the action instead of reading like a fault; POS and transfer outflows moved to their own "Outside the drawer" FormSection.
- `customers-screen.tsx`: the two equal-weight cards became one figure — total outstanding debt, noting the customer count. The totals-error path keeps its Retry button.
- `shared-payment-activity.tsx`: leads with all-methods received for the date, summed from the server's own cash/POS/transfer kobo strings with BigInt (no float, no re-query), breaking down by method with what each does with the money; unapplied money is now an attention StatusNote above the figure.

Verified in the signed-in browser against live development data: Cash showed the unavailable state with its action sentence and zero movements; Customers showed NGN 1,544,300.00 "Owed across 3 customers"; Payments showed NGN 79,080.00 = 0 + 1,080 + 78,000 across 5 receipts, matching the method rows. Reloaded at 390x844: the mobile shell renders, KeyFigure stacks its breakdown under the figure, and there is no horizontal overflow on any of the three. `tsc --noEmit` clean; 34 Node tests pass.

Note on a false alarm: resizing the emulated viewport to 390 WITHOUT reloading left the desktop topbar mounted and produced a 42 px overflow from the "Find customer" header action. After a reload at the same width the shell switches correctly and overflow is zero, so this is a measurement artifact of viewport emulation, not a layout defect — do not "fix" the header action on the strength of a no-reload resize.

UNTESTED: physical Android, dark and staff-role variants of the new component, and a populated Cash movements list. `expo lint` still cannot run in the Cowork Linux VM; run `npm run check` on the Mac. No commits or pushes; Metro 8081 and the signed-in tab retained; browser viewport emulation reset. Pending privileged concurrency approval unchanged.
\n

## 9 September 2026 — Claude (Cowork, evening): full-width workspace, Records and Customers

Owner feedback on the first design stage: the arrangement and money traceability are right, but the content area was pinned to 1200 px and centred on a large monitor, and Records and Customers did not yet match the canvas. Both addressed. No migration, deployment, permission or business-rule change.

**Width.** `Page` stops capping and centring `workspace` screens; they now fill the window with a new `tokens.layout.workspaceGutter` (24) on roomy widths. Measured at 1680 px: the Records table runs from the sidebar edge to exactly 24 px from the right edge. Forms and sign-in keep `formWidth` centred.

**Records.** `records-service.fetchSalesForDate` embeds `payment_allocations(amount_kobo)` in the existing sales select — one query, existing RLS, no new endpoint — and derives paidKobo, balanceKobo and a PaymentState with exact BigInt kobo. New shared `status-chip.tsx` (tones mapped to existing Paper role containers; no new colours). The table is now Invoice / Customer with inline flag chip / Time (Lagos) / Total / Balance / status chip, and the em-dash-filled Review column is gone. Phone layout is one card per invoice, balance shown only when owed. A day summary gives Billed, Collected and Still owed.

Verified live at 1680 px against real data: Billed NGN 519,480.00 = 7,200 + 1,080 + 511,200; Collected NGN 78,080.00; Still owed NGN 441,400.00 = 200 + 0 + 441,200; #12 Part paid, #11 Paid, #10 Part paid; #12 timed 11:31 Lagos for a 10:31Z sale. Reloaded at 390 px: cards render, no horizontal overflow, the paid invoice correctly omits its zero balance.

IMPORTANT LIMIT on those day totals: they are sums of the rows LOADED, not a server-side aggregate. While `hasMore` is true the caption says "Totals cover the N invoices loaded so far. Load the rest to complete them." Do not remove that qualifier without adding a real server total — a number that silently changes as you page is worse than no number.

**Customers.** Initials avatar and a per-row "Record payment" action (same route the detail sheet's Pay debt used); settled customers show a Settled chip. Verified live: three rows, three buttons, initials BE / NA / TT. NOT implemented from the canvas, deliberately: open-invoice count, oldest-unpaid date and the sort control. `customer_balances` returns only id, name, phone and balance, and sorting one fetched page would misrepresent the list — all three need server work first.

`tsc --noEmit` clean; 34 Node tests pass. `expo lint` still cannot run in the Cowork Linux VM; run `npm run check` on the Mac. Untested: physical Android, dark and staff variants, a Records page large enough to trigger "Load more", and a void sale (the `void` chip path has no live example). No commits or pushes; Metro 8081 and the signed-in tab retained; viewport emulation reset. Pending privileged concurrency approval unchanged.


## 9 September 2026 — Codex: scheduled takeover and Mac verification

Heartbeat checked current usage (available) and confirmed Claude's explicit release of all edits/jobs in the latest handoff. Read AGENTS, continuity documents, project UI skill, working-tree summary and selected current source. Completed the requested Mac validation that could not run in Cowork: npm run check (TypeScript and Expo lint) passed; all 34 Node tests passed; git diff --check passed; Android and web export succeeded with 12 routes at /tmp/bomedia-sept9-verification. Existing nonfatal Node module-type/bundler environment warnings remain. No application source, assets, dependencies or financial records changed; only continuity/backend verification documentation updated.

No migration/deployment, account creation, credential retrieval, privileged concurrency test, commit or push. No browser/emulator interactions or live visual review performed. Export success is not native runtime or responsive-layout verification. Existing server/emulator processes were not stopped or rechecked; all checks started here have completed.

Next: obtain the owner's approved “BOMedia Sales Screens” Claude artifact link before implementing the remaining canvas-driven UI (New Sale invoice rail). Records full-date totals and Customers ordering/count/oldest-debt require server support; loaded-row totals currently remain qualified. Closing counts/admin finalization is a separate pending stage. Do not infer approval for the unrelated dark analytics/dashboard proposal. Previously rejected privileged concurrent-account test remains unapproved. Ownership released after this verification session; no concurrent Codex work remains.
\n

## 9 September 2026 — Claude (Cowork, evening): nested-button fix on Customers

Owner reported a React invalid-DOM error from the Customers table: `<button> cannot contain a nested <button>`, traced to `customers-screen.tsx` inside `DataTableRow`.

Cause: Paper's `DataTable.Row` unconditionally renders a `TouchableRipple` — a `<button>` on web — regardless of whether `onPress` is passed (verified in `node_modules/react-native-paper/lib/module/components/DataTable/DataTableRow.js`). The per-row "Record payment" button added earlier in the session was therefore always nested. Removing the row's `onPress` did NOT fix it; the row element itself has to stop being a button.

Fix: the Customers desktop table no longer uses `DataTable` at all. Header and rows are plain `View`s carrying the same metrics (minHeight `touchTarget`, `spacing.medium` horizontal padding, 1px `outlineVariant` bottom border, matching column flexes), with the customer name as its own `Pressable` (opens the debt sheet, primary colour, underlined) and the action button in its own cell. The phone card follows the same split: the card is a container, its top block is a `Pressable`, and "Record payment" is a sibling. `DataTable` import dropped from the file.

Audited the other three list screens: Records, Payments and Cash rows contain only text and `StatusChip` (a View plus Text), so their `DataTable.Row` usage — including whole-row `onPress` — is correct and was left alone. The rule is now written into DESIGN_SYSTEM.md.

`tsc --noEmit` clean; 34 Node tests pass. NOT yet re-verified in the signed-in browser: the pane opened a fresh tab and web auth is per-tab, so the owner needs to sign in again for a visual confirmation that the warning is gone and both row controls work. A static check of the rebuilt markup found no `button` inside `button`.
\n

## 9 September 2026 — Claude (Cowork, evening): design-vs-build audit

Owner asked whether the implementation actually matches the published canvas. Extracted the artboards back out of the live artifact and diffed them against the working files: all seven `.dc.html` artboards are byte-identical, so the canvas has not been edited since publish and it remains the reference. Only `canvas.json` differs (the frame-height correction). Audit result below — treat this as the outstanding design backlog.

MATCHES the canvas: full-width workspace; Cash hero plus breakdown and the separate "Outside the drawer" section; Customers hero total with initials avatars and a per-row Record payment action; Payments unapplied alert plus hero received with method breakdown; Records status chips, Time and Balance columns, inline review flag, day totals and phone cards; New Sale material rates on the buttons and blocker copy under disabled actions.

DOES NOT match yet, by screen:
- **New Sale (largest gap).** The invoice rail is still empty until the first item — the canvas shows subtotal, minimum adjustment and total live from the start, which was finding 4 of the review and is the single biggest remaining item. The canvas folds the draft status and DEVELOPMENT marker into topbar chips; the app still renders a full-width eyebrow and a status band (finding 8). The canvas puts width, height, quantity and the FEET/INCHES control on one row; the app has a width/height row, a separate unit row and a separate quantity field (finding 7 is only half done). The canvas calculation panel shows Area / Calculated / Charged with Add item inline; the app shows Calculated and Item charge with the button below and no area. The customer section's "Existing customer" confirmation chip is absent.
- **Records.** The date navigator is still two far-apart icon buttons with a centred label; the canvas groups them into one segmented control showing the real date under "Today" with the forward arrow dimmed on today (finding 9 — untouched). No "Invoices today" count card (the count is caption text) and no "Updated HH:MM" beside Refresh.
- **Customers.** No "Oldest unpaid" card, no per-row oldest-unpaid subtitle, no open-invoice count column, no sort control. All four need server support; see the earlier session note.
- **Payments.** The receipt table shows Date where the canvas shows Time, and has no "Applied to" column; method renders as plain uppercase text rather than a tinted tag.
- **Cash.** The movements table has no time column and does not stack the actor under the description.
- **Phone.** No sticky invoice-total bar above the tabs and no minus/plus quantity steppers.

Nothing was implemented in this audit; it is a status check only.
\n

## 9 September 2026 — Claude (Cowork, evening): live invoice rail and grouped date navigator

Closed the two design-backlog items that needed no server work. Presentation only; no domain, pricing, permission, query, migration or deployment change.

- `src/features/sales/sales-screen.tsx`: new `runningTotals` derivation (`totals ?? zeroes`) and `InvoiceTotals` now renders unconditionally in the invoice column, so subtotal and total are visible and live from an empty invoice. Verified live: an empty New Sale shows "Items subtotal NGN 0.00 / Invoice total NGN 0.00" under the empty-state text. The minimum-adjustment row stays conditional on purpose (see DESIGN_SYSTEM.md).
- `src/features/records/lagos-date.ts`: new `readableLagosDate` — "Wed, 9 Sept 2026" from a yyyy-mm-dd business date, formatted in UTC because the string is already a Lagos calendar date.
- `src/features/records/records-screen.tsx`: the date navigator is one bordered pill holding both chevrons and a 132px label column showing Today / Yesterday / the date, with the readable date as a subtitle in every state. Verified live at 1680: the control measures 214px wide with 132px between the arrows, against 440px of separation before; the forward arrow reports `aria-disabled=true` on today. At 390px the whole strip fits with no horizontal overflow.

`tsc --noEmit` clean; 34 Node tests pass; no nested buttons anywhere on the page.

Environment gotcha worth knowing: after an edit through the Cowork mount, Metro can serve the PREVIOUS bundle for a while. The first reload after this change still rendered the old navigator and the DOM proved it (a 440px-wide label element). A second reload about a minute later picked it up. When a change appears not to have landed, reload again before hunting for a bug in the code.

Remaining design backlog (unchanged otherwise, see the audit note above): New Sale's topbar chips, the single-row width/height/quantity/unit layout, the Area figure in the calculation panel and the "Existing customer" chip; Records' invoice-count card and "Updated HH:MM"; Payments' Time and "Applied to" columns and tinted method tags; Cash's movement times; the phone's sticky total bar and quantity steppers; and the Customers items that need server support.
\n

## 9 September 2026 — Claude (Cowork, evening): material cards match the canvas

Owner compared the live material picker with the canvas: the rate must sit UNDER the material name as a second line, not run together on one line after a middot. Correct — the earlier single-line treatment was a compromise I made because Paper's `Button` renders its child inside a `Text` with `numberOfLines={1}`, which silently clamps a second line.

Fix: `ChoiceButtons` gains `layout="card"` — an even two-column grid of `Pressable` cards, label on line one, caption on line two, built from the existing tokens (radius.card, outlineVariant border, touchTarget minimum, 45% flex basis). Selected is a filled primary card with onPrimary text. The chip layout and the compact FEET/INCHES variant are untouched. New Sale passes `layout="card"` for materials, and the rate caption drops the trailing ".00" ("NGN 180 / sq ft") since the decimals add nothing inside a two-line card; the exact rate still drives every calculation.

Verified live at 1680 px light: four cards in a 2x2 grid, each 323 px wide and ~60 px tall, each rendering two lines. At 390 px with dark emulated: same 2x2 grid at 158 px per card, no horizontal overflow, unselected cards dark surface with light text, the selected card the dark-theme primary with dark onPrimary text — legible both ways. `tsc --noEmit` clean; 34 Node tests pass.

Lesson for the next agent: when a design shows a two-line control, do NOT reach for Paper's Button — check whether the component clamps to one line before deciding the design "cannot" be matched.
\n

## 9 September 2026 — Claude (Cowork, evening): one-line dimension row

Owner asked for Width, Height and Quantity on a single row, Quantity shortened to "Qty", and the dimension labels to carry the active unit — "Width (ft)"/"Height (ft)" under FEET, "Width (in)"/"Height (in)" under INCHES — to save vertical space.

Done in `sales-screen.tsx`: the three fields are one wrapping row with `spacing.small` between them; labels are template strings on the draft's `unit`. `tokens.layout.dimensionMinWidth` dropped 120 to 104 and a new `quantityWidth` (88) keeps Qty narrow. No change to the pricing contract: the typed digits are never rewritten when the unit changes, and area is still interpreted under the chosen unit.

NOTE — this overrides an approved product decision. PRODUCT_SPECIFICATION.md specified "Label fields Billable width and Billable height", whose purpose was to stop anyone reading the field as the material's roll width. That line now records the owner's 9 September decision and states that the billable-not-roll meaning must stay in the section description ("Enter the dimensions you want to bill."). Do not delete that description without replacing the meaning somewhere.

Verified live at 390 px: all three inputs share one row (widths 110/110/88, identical top offset, no horizontal overflow). Toggling INCHES re-labels both dimensions to "(in)" and back to "(ft)" on FEET. `tsc --noEmit` clean; 34 Node tests pass. Untested: physical Android keyboard behaviour on the narrower Qty field.
\n

## 9 September 2026 — Claude (Cowork, evening): multiplication signs and quantity steppers

Owner asked for a × between Width, Height and Qty to show the three multiply into the charge, and for increment/decrement controls inside the Qty field.

Done in `sales-screen.tsx`: a decorative × sits between each field (`accessibilityElementsHidden` / `importantForAccessibility="no"` — the three labelled fields already read correctly to a screen reader, and announcing "times" between them would be noise). Qty gains `TextInput.Icon` chevrons left and right with `forceTextInputFocus={false}`, so a press steps the value without opening the keyboard. New `stepQuantity(delta)` parses the current value, falls back to 1 when it is blank or invalid, and clamps to a minimum of 1; the decrement icon is disabled at 1 and both are disabled on a frozen draft. Quantity remains a positive integer, matching the pricing contract; typing is unchanged. `dimensionMinWidth` 92→84, `quantityWidth` 88→124.

Verified live at 1680: all three fields on one row (245/245/65) with two × between them, no overflow. Steppers exercised: 1 → 2 → 3 → 2 → 1, decrement then reports `aria-disabled=true` at 1 and a further press leaves it at 1.

RESOLVED (same session, owner's suggestion) — see the note below; the row now holds one line at 390px. The paragraph that follows describes the state before that fix and is kept for the reasoning.

SUPERSEDED LIMIT — the row did NOT stay on one line at 390px; Qty wrapped to a second line. This is a measured constraint, not an oversight: the unfocused "Width (ft)" and "Height (ft)" labels are 98px and 103px wide by themselves, so two dimension fields plus the 124px stepper field cannot share the ~326px a 390px phone leaves without clipping a label. Wrapping gracefully was chosen over clipping. If one line on the phone matters more than the full labels, the fix is to shorten them below the tablet breakpoint (for example "W (ft)" / "H (ft)") — that is an owner decision, not something to change unilaterally, since the labels were themselves an owner decision earlier today.

`tsc --noEmit` clean; 34 Node tests pass. Untested: physical Android — whether the chevrons are comfortable to hit at 36px and whether suppressing keyboard focus behaves the same natively.
\n

## 9 September 2026 — Claude (Cowork, evening): one × instead of two, one line on a phone

Owner asked whether dropping the × before the Qty field would buy back the width needed for a single row on a phone. It did.

Removed the second separator, so the row reads Width × Height  Qty. The remaining × still states that the size is a multiplication; the pair carries the meaning and the freed width is what makes the phone layout work.

Then tuned `quantityWidth` against the labels rather than by eye. At 124 the row fit on one line at 390px but both labels clipped by 2px (`scrollWidth` 98 vs `clientWidth` 96). 114 cleared "Width (ft)" but still clipped "Height (ft)" (103 vs 101). 106 clears both: measured "Width (ft)" 98/98 and "Height (ft)" 103/103, no clipping, all three fields sharing one row at 97/97/65 with no horizontal overflow. `quantityWidth` is therefore a measured constant — widening it, or lengthening either dimension label, clips at 390px. Re-measure `scrollWidth` against `clientWidth` on the labels before touching either.

Desktop rechecked at 1680: one row, 262/262/65, a single ×, steppers still increment and decrement (1 → 2 → 1). `tsc --noEmit` clean; 34 Node tests pass. Physical Android still untested.
\n

## 9 September 2026 — Claude (Cowork, evening): tightened Qty, canvas brought up to date

Owner said the stepper buttons were eating the Qty box and unbalancing the row, and asked that the canvas be used to get it right. Both done, canvas first.

**Canvas (artifact "BOMedia Sales Screens", version 3).** The published artboards were stale — they still showed "Billable width"/"Billable height", a 120px Quantity field, no steppers and two × separators. `Main.dc.html` and the phone frame in `Mobile.dc.html` now draw the agreed row: Width (in) × Height (in) then a 104px Qty with an 18px chevron either side of the number, one × only. Added the missing `.lbl` class to Mobile's helmet, which the new markup needs. The canvas is the reference again; re-extract and diff it before trusting it in future.

**App.** `TextInput.Icon` chevrons drop from size 20 in their default wells to size 18 in 28px wells with `marginHorizontal: 0`, and `quantityWidth` 106 → 104 to match the canvas. Measured at 390px: one row at 98/98/65 with 28px steppers, neither dimension label clipped, no horizontal overflow. At the pane's own 938px: 199/199/65, same row. Steppers still step (17 → 18 → 17 during the check).

Housekeeping: those checks left the live draft's quantity at 17, so it was stepped back down to 1 and the decrement now reports disabled. The owner's draft is otherwise untouched.

`tsc --noEmit` clean; 34 Node tests pass. Physical Android still unverified — 28px-wide chevrons are below the 44px touch guideline in width (they are 34px tall), so check they are comfortable on a real phone before release; widening them means re-measuring the labels at 390px, per DESIGN_SYSTEM.md.
\n

## 9 September 2026 — Claude (Cowork, evening): purpose-built Qty stepper, and a measurement mistake corrected

Owner reported the Qty value was not centred and a double-digit number overlapped the right chevron, with a screenshot showing "108" running under it.

Real cause: Paper's `TextInput` computes the value's horizontal padding from its own default icon width. Overriding `TextInput.Icon` to 28px to fit a compact field left that padding untouched, so the number sat off-centre and overflowed the trailing icon. No amount of width tuning fixes that — the adornment maths has to go.

Fix: new shared `src/components/ui/stepper-field.tsx`. A 56px outlined container holds two 30px chevron `Pressable`s either side of a plain React Native `TextInput` with `textAlign: 'center'`, plus a floating label and a 2px primary focus border so it matches the outlined fields beside it. `sales-screen.tsx` uses it for Qty; `stepQuantity` and the disabled-at-one behaviour are unchanged. Verified at 390px: the value is centred at 1, 3, 4 and 5 digits, never overlaps either chevron (a 5-digit value scrolls inside its own 38px well), and the row still holds one line with both dimension labels rendering in full.

CORRECTION worth reading before touching these tokens. Earlier in this session I "fixed" label clipping by shrinking `quantityWidth` from 124 to 114 to 106. That was chasing a phantom: Paper renders the outlined label twice and transform-scales the floating copy, so `scrollWidth` (98) against `clientWidth` (73) reports clipping where the 0.75 scale means there is none. A screenshot at 390px shows "Width (ft)" and "Height (ft)" complete at every value tried. `quantityWidth` is back to 104, matching the canvas, and the design-system note now warns against that measurement.

The × between Width and Height is kept — it fits comfortably and states the arithmetic. Owner offered to drop it if it caused the crowding; it did not, the adornment padding did.

Housekeeping: testing left the draft quantity at 1000; it was set back to 1 and the decrement reports disabled again. `tsc --noEmit` clean; 34 Node tests pass. Untested: physical Android — chevrons are 30px wide against a 44px guideline (48px tall), and the plain RN TextInput's keypad behaviour has only been seen on web.


## 10 September 2026 — Codex: read-only Qty height audit requested by owner

Owner explicitly requested explanation before any UI edits. No application code or UI values changed. Inspected current StepperField, adjacent Paper inputs, shared UI and later Claude handoff entries. Browser DOM confirms Width/Height wrappers each 56px with visible outlines 50px high, top y464; custom Qty outline 56px high, top y458. Thus Qty's visible box is 6px taller, with aligned bottoms, because it copies Paper's overall height but not the outlined control's inset. Qty is already a reusable component, but rebuilds the field with RN TextInput and locally specified border, label, typography and stepper dimensions. Its hardcoded 56px outline is not the same geometry as Paper's 56px wrapper.

Reported additional local literals in StepperField (30px controls, 20px icons, 16/24 typography, label offsets), ChoiceButtons card layout (2px gap, spacing+2, 45% basis), StatusChip padding, ReviewSheet duplicated bounds and resize increment. Central token values are configuration, not inherently bad hardcoding. No claim of exhaustive repository audit. Existing newer uncommitted work preserved. No tests required for this read-only UI assessment; no migrations/deployments/jobs/financial records. Browser retained without changing draft. Next: owner reviews findings before authorizing implementation; do not apply fixes based on this audit alone.


## 10 September 2026 — Codex: shared-component fixes and artifact alignment

**Authority/reference.** Owner explicitly approved the Qty correction and asked to continue toward the linked Claude artifact using shared components. Read the mandatory project docs/UI skill, the Expo UI skill, exact Expo 57 documentation and Expo networking skill for refresh metadata/read-only alert work. No parallel agent work, commits or wholesale staging. Existing dirty/untracked work and assets preserved.

**Exact changes.**
- `src/components/ui/stepper-field.tsx`: Paper TextInput owns outline/label/focus/typography/height via `render`; native input stays in its own lane between chevrons. Shared width/control/icon tokens replace local geometry. No `height: 56` patch.
- `src/theme/tokens.ts`, `choice-buttons.tsx`, `status-chip.tsx`, `review-sheet.tsx`: shared compact spacing, control widths, invoice rail width and sheet increment; remove local 45% choice basis/padding tweaks/duplicated sheet percentages. Card choices measure container width and fit balanced one/two/four columns.
- New `action-button.tsx` centralizes the touch-target minimum and is used by sales/review/item actions, choices, shell and new refresh controls. New `summary-strip.tsx`, `date-navigator.tsx`, `refresh-control.tsx`, `workspace-table.tsx` provide reusable composition. `metric-grid.tsx` now exports `AdaptiveGrid` and compatibility `MetricGrid`, fitting columns from measured width; `key-figure.tsx` also measures its container and gives both split columns shrinkable space. This fixed a real 950px Payments overflow found during QA.
- `page.tsx` gains an in-layout footer (outside scroll content); new `sales/components/invoice-action-bar.tsx` provides mobile total and Review. `sales-screen.tsx` uses compact status chips, tablet-width content, larger desktop entry/narrower rail, and new `item-calculation.tsx` with area/calculated/charged/Add or Update. `customer-picker.tsx` uses the shared adaptive grid plus selection chip. `invoice-item.tsx` uses shared action sizing. `app-shell.tsx` shows one desktop environment marker.
- `sales/domain/pricing.ts`: extract rational item area shared by billing and display; `formatItemArea` rounds only the display to two decimals. No rounded area enters charge calculation. Added meaningful pricing tests covering the artifact's 13×36 inches×2 = 6.50sqft, repeating inch area/charge independence, half-up display and large exact integers. Existing money/pricing/submission tests remain passing.
- `records/lagos-date.ts` centralizes named date and Lagos time. Records and Payments share date and table components; record/payment details and narrow cards remain. New `payments/components/payment-allocation-summary.tsx` shows actual invoice number/count and unapplied amount. Existing records totals remain explicitly qualified to loaded rows.
- `use-focused-page.ts` records last successful replacement-read time; append and failed reads retain earlier timestamp. Records, Payments, Customers and Cash use shared refresh presentation. Customer timestamp conservatively uses the older list/total read. Pending cancellation/foreground/focus behavior remains.
- `status-note.tsx` accepts a contextual action. Payments reads the existing admin-protected all-date unapplied view for its alert, avoids that query for staff, and refreshes it with the daily list. Its all-date review totals are labelled correctly. No resolution/write action added. Cash Outside-the-drawer description now correctly says POS/transfer outflows, not collections.
- Updated DESIGN_SYSTEM.md and PRODUCT_SPECIFICATION.md with implemented presentation, shared-field/container policies and remaining reference gaps.

**Verification.** `npm test`: 35/35 pass. Final `npm run check`: TypeScript and Expo lint clean. Final Android/web export succeeds, 12 static routes, `/tmp/bomedia-artifact-20260910-final`; `git diff --check` passes. No SQL changes, so no migrations/deployments/SQL reruns. Pre-existing Node module-type and Metro NO_COLOR notices remain non-failing.

Signed-in browser: inspected admin dark mobile 390 (quantity 1/10/11/10000), desktop 1440, compact desktop 950; later admin light at 435/950/1440 and tablet 820. Measured all three input outlines 50px at y617 in desktop test. Stepping 10→11 worked and five digits stayed in the number lane. Real existing 9 September payment rows showed collection times/methods/invoice allocations; subsequent user-created data was only read. Receipt selection survived desktop950→tablet820, sheet expand/close worked. Final 950 light Payments summary no longer overflows. Records desktop uses real rows and labelled state/balances. Read-only table checks did not submit payments/sales/cash. Test dimensions were entered only into the previously empty local sale draft; empty `fill` did not clear Paper inputs in the browser tool, so keyboard select-all/backspace was used for restoration. Final DOM verification at 390px confirmed customer/phone/width/height all blank and Qty 1, with zero invoice items. Material selection was not changed by this contributor. No item was added.

**Limits/remaining.** No physical iOS/Android keyboard/touch/large-text validation, no staff-role UI session, no live failed-refresh timing injection, and no nonzero unapplied admin alert fixture (existing all-date read returned no outstanding alert). Native exports are build evidence only. Complete customer sort/age/open-invoice counts, full server day totals and cash opening timestamps/noncash collection totals still need backend work. Compact invoice-item rail and draft-status-in-topbar refinement remain. Do not claim pixel-for-pixel artifact parity or fabricate its sample values. No pending approval was newly requested for code; optional preview-coordination question received no answer at time of writing. Older privileged-account/concurrency approval remains withheld.

**Jobs/handoff.** Final export/check jobs completed. Existing Metro PID92386 continues serving port8081; do not stop it casually. Temporary unauthenticated QA browser tab was closed. Temporary viewport overrides were reset and the signed-in New Sale preview retained. Next task is native Qty/footer verification, followed by the server data contract work described above.


## 10 September 2026 — Claude (Cowork): last hardcoded values on Customers moved to tokens

Picking up the tail of the approved de-hardcoding pass. The Qty height fix and the shared `WorkspaceTable`/`ActionButton`/token work were already in the tree from the preceding Codex session; this entry covers only what was still outstanding from the audit list.

**Changed.**
- `src/theme/tokens.ts`: added `controls.rowActionWidth: 180` and a new `avatar: { compact: 32, comfortable: 36 }` group.
- `src/features/customers/customers-screen.tsx`: the action column's `width: 180` (header and cell) now reads `tokens.controls.rowActionWidth`; both `Avatar.Text` sizes come from `tokens.avatar`, and their `labelStyle` uses Paper's `theme.fonts.labelMedium` / `labelLarge` instead of bare `fontSize: 12` / `13`, so the initials sit on the type ramp.

**Deliberately not changed.** Customers keeps plain `View` rows rather than adopting `WorkspaceTable`. Every `WorkspaceTable` row is a `DataTable.Row`, which Paper always wraps in a `TouchableRipple` — a `<button>` on web — and the Customers row carries its own "Record payment" button. Converting it would reintroduce the nested-button error the owner reported earlier in the week. The comment above the header row states this; leave it there.

**Verification.** `npx tsc --noEmit` clean. `npm test`: 35/35 pass. No live browser check this turn — the dev build needs a fresh sign-in per tab and the owner was not asked to sign in for a token rename with no visual delta. The Qty geometry is no longer declared anywhere in our code (Paper's `TextInput` owns it via the `render` slot), so the 56-vs-50 divergence cannot recur by construction; the outstanding verification is still native touch/keyboard on a physical Android, per the entries above.

**Standing boundaries unchanged.** The privileged temporary-account / service-role-key concurrency test remains UNAPPROVED and must not be attempted, nor routed through another agent, tool or CLI. No credentials, tokens or private login links in any document or output. No reset, discard, indiscriminate staging, commit or push of the working tree; no production deployment, destructive cleanup or direct database correction.

**Next task.** Native Qty/footer verification on a physical Android, then the server data contract work the previous entry describes (customer sort/age/open-invoice counts, full server day totals, cash opening timestamps and noncash collection totals). `expo lint` cannot run from the Cowork VM — run `npm run check` on the Mac.

## 10 September 2026 — Claude (Cowork, evening): customer/records server data contract

Owner picked the server-data-contract direction from four options. Goal: give the Customers page and Records the server support the published canvas needed, without faking statistics or sorting a single fetched page.

**Migration `supabase/migrations/202609100009_customer_debt_sort_and_day_totals.sql`.** One transaction, reusing the established scoping helpers.
- `public.customer_balances(search_text, sort_key, page_limit, page_offset)` — dropped and recreated (return type changed). Adds `open_invoice_count` and `oldest_unpaid_date` from a single per-customer aggregate over still-outstanding open sales (`status='open' and total_kobo > allocated`), so count, oldest date and balance all describe the same invoice set. `sort_key` is `name` (default), `balance` or `oldest`; ordering uses inactive-CASE arms so only the selected key orders the set, with `c.name` as the stable tie-breaker, applied before limit/offset so paging is honest under any sort. Still security definer, still scoped by `private.active_business()`, still intentionally NOT date-windowed (its purpose is to surface old debt via the customer).
- `public.customer_debt_totals()` — dropped and recreated to also return `oldest_unpaid_date` (business-wide min outstanding date) for the new hero card.
- `public.records_day_totals(target_date date)` — new. Returns `billed_kobo` (sum of every sale's total for the date), `collected_kobo` (sum of allocations against those sales, raw), `outstanding_kobo` (sum of per-sale `max(0, total - allocated)`). Definitions deliberately match `records-service`'s per-row derivation so a fully loaded day reconciles exactly. Non-admins only aggregate rows inside the seven-day Lagos window (`business_date between today-6 and today`), mirroring the sales_read/payments_read RLS — an older date returns zeros rather than leaking history; admins see all dates.

**Service layer.** `customers-service.ts`: `fetchCustomerBalances` gains a `sort` arg and passes `sort_key`; `CustomerBalance` carries `openInvoiceCount`/`oldestUnpaidDate`; `DebtTotals` carries `oldestUnpaidDate`. `records-service.ts`: new `fetchDayTotals(date)` calling `records_day_totals`.

**UI.**
- `customers-screen.tsx`: a Paper `SegmentedButtons` sort control (Name / Balance / Oldest debt); the list key now encodes sort+search (`sort + '' + search`) so changing sort invalidates and refetches from offset 0. Desktop table gains an "Open" count column and an "Oldest unpaid <date>" subtitle under the customer name; phone card shows "N open invoices · oldest <date>". New "Oldest unpaid" hero card beside Total outstanding debt, using the business-wide date (or "None outstanding"). No `DataTable.Row` reintroduced — plain Views + a single name `Pressable`, per the nested-button rule. `readableLagosDate` reused for all dates.
- `records-screen.tsx`: a second `useFocusedPage(date, readDayTotals)` supplies the summary; the three cards now show server billed/collected/owed and the "loaded so far" qualifier is replaced by "Totals above cover the whole day; the list shows the first N invoices." Refresh refreshes both the list and the totals. Removed the now-unused `sumKobo`.

**Verification.** Isolated PGlite (`scripts/test-database-local.mjs`): all 9 migrations and all 8 SQL test suites pass, including the new `supabase/tests/customer_debt_sort_and_day_totals.sql` (per-customer count/oldest, settled customer nulls, out-of-window debt still surfaced via the list, all three sort orders, business-wide debt totals with oldest date, day totals for two dates, staff out-of-window zeros vs admin real figures, cross-business isolation). `customer_debt_reads.sql` updated to the new `customer_balances` signature. `tsc --noEmit` clean. `npm test`: 35/35.

**Limits / not done.** `expo lint` cannot run in this VM (eslint-plugin-import resolver crash against the mount — an environment failure, not a code finding); the owner ran `npm run check` on the Mac on 11 September and it passed clean (tsc + expo lint). No native/physical-device check. No signed-in visual pass this session: Metro was not running and web auth is per-tab, so the owner must sign in to see it live and cross-check against the canvas. Migration 0009 is written and tested but **NOT deployed** — deploy it to development and reload before the UI reads the new fields; until then the RPCs return the old shape and the new columns will be undefined. No commits, pushes, deployments, financial writes, or privileged concurrency test. All earlier pending-approval boundaries retained.

**Jobs/handoff.** No long-running jobs started. Working tree otherwise preserved (still a single "Initial commit"; ~90 modified/untracked files intact). Edit ownership released.


## 13 September 2026 — Codex: deterministic tied customer pagination

Scheduled follow-up confirmed usage available after one failed usage read, and Claude's explicit edit release. Read continuity documents, current migration/test and working diff. Fixed the undeployed migration 202609100009: customer_balances now orders by selected sort, customer name, then unique c.id. Names are not unique, so the previous name-only tie-breaker did not guarantee stable pages. This restores the ID tie-breaker used before the signature replacement. No UI, business permissions, prices or data-service contracts changed.

Extended customer_debt_sort_and_day_totals.sql with 30 identically named, settled customer fixtures inserted in descending ID order; each Name/Balance/Oldest query fetches pages of 20 and checks the combined sequence against ascending unique IDs. All nine migrations apply and all nine SQL suites pass in isolated PGlite 0.5.8 installed only under /tmp/bomedia-sort-check. All fixtures roll back. git diff --check passed. No app tests/builds/visual checks rerun for this SQL-only change; no independent concurrent-session claim.

No remote database calls, migration deployment, live records, credentials, privileged concurrency test, commits or pushes. Migration 009 remains pending owner approval per Claude's handoff. Existing Metro/emulator jobs were not inspected or changed; no newly started job remains active. App dependencies/custom assets/unrelated working changes preserved. No contributor retains edit ownership after this note.

Next: obtain the recorded owner go-ahead for migration 009, deploy the reviewed local migration to development, then verify signed-in Customers sorting/count/age and Records totals against the approved canvas on desktop and mobile. Current UI expects the new database contract and is not fully usable with the old RPC signature. Retain the unapproved privileged concurrency-test boundary.


## 14 September 2026 — Codex: scheduled readiness check

Usage is available; ownership remains released. Re-read AGENTS, current handoff and working diff summary. No new owner approval for migration 009 was found, so the next deployment step remains pending. No application edits, tests, remote database calls, deployments or jobs started/stopped; this continuity note is the only change. Previous test evidence and untested UI/native limits remain unchanged. Next action remains owner go-ahead for development migration 009 followed by signed-in verification. No edit ownership retained; privileged concurrency-test approval remains withheld.


## 17 September 2026 — Codex: scheduled approval-boundary check

Usage is available and edit ownership remains released. AGENTS, latest handoff and working diff summary checked; migration 009 still awaits owner go-ahead. No new authorization found. This note is the only edit; no tests, application changes, database calls, deployments, credentials, commits or jobs started/stopped. Previous validation and untested limits remain unchanged. Next action: owner approval for development migration 009, then deployment and signed-in verification. No active edit ownership retained; privileged concurrency test remains unapproved.


17 September evening readiness recheck: usage available; no new ownership or approval change. Migration 009 remains awaiting owner go-ahead. No application/database changes, tests, deployments, reset credits or jobs; only this continuity annotation. Prior limits and next action unchanged.


18 September 2026 — Codex scheduled check: usage available; ownership released; migration 009 deployment approval still pending. Checked AGENTS, handoff and working diff summary. Only this continuity note changed. No application edits, tests, remote calls, deployments, credits consumed or jobs started/stopped. Prior evidence and untested limits unchanged. Next action remains owner go-ahead for development deployment, then signed-in verification; privileged concurrency test remains unapproved.


20 September 2026 — Codex scheduled check: usage available, ownership released, and no new approval for development migration 009 found. Checked AGENTS, current handoff and working diff summary. Only this continuity note changed; no application edits, tests, database calls, deployments, credits consumed or jobs started/stopped. Prior validation and untested limits remain unchanged. Next action remains owner go-ahead for migration 009, then deployment and signed-in verification. Privileged concurrency test remains unapproved; no active edit ownership retained.

21 September 2026 — Codex scheduled check: usage available (96% of five-hour and 79% of weekly allowance remaining); edit ownership released. Checked AGENTS, handoff and working diff summary. Migration 009 still awaits the owner's development-deployment go-ahead; no new approval received. Only this continuity note changed. No application changes, tests, database calls, deployments, reset credits or jobs started/stopped. Previous validation and untested limits remain unchanged. Next: approved development deployment of migration 009, then signed-in desktop/mobile verification. Privileged concurrency test remains unapproved; no edit ownership retained.

24 September 2026 — Codex scheduled readiness check: usage available (95% five-hour and 80% weekly allowance remaining); ownership remains released. Checked AGENTS, current handoff, git status/diff summary and route/package diffs. No new owner approval for migration 009 deployment was received, so deployment and dependent signed-in verification remain pending. Only this continuity note changed; no application edits, tests, database calls, deployments, reset credits or jobs started/stopped. Previous test evidence and untested limits remain unchanged. Next concrete action: owner go-ahead for development migration 009, then deployment and signed-in Customers/Records verification. Privileged concurrency test remains unapproved; no edit ownership retained.

25 September 2026 — Codex follow-up to the 24 September evening heartbeat: checked AGENTS, handoff and current diff summary. Ownership remains released; development migration 009 still awaits owner go-ahead. Current usage could not be refreshed because this session exposes no usage-limit tool; earlier percentages are historical. No reset credit consumed. Only this continuity note changed; no app edits, tests, database calls, deployment or jobs started/stopped. Prior validation and untested limits unchanged. Next action remains owner-approved development deployment and signed-in Customers/Records verification. Privileged concurrency test remains unapproved; no edit ownership retained.

26 September 2026 — Codex scheduled check: usage refreshed successfully (97% five-hour and 99% weekly remaining), with no reset credit consumed. Read AGENTS, latest handoff and current git diff summary. Ownership remains released, but no owner go-ahead for development migration 009 has arrived. Only this continuity note changed; no app changes, tests, database calls, deployments or jobs started/stopped. Previous validation and untested limits remain unchanged. Next task remains approved development deployment followed by signed-in Customers/Records verification. Privileged concurrency test remains unapproved; no edit ownership retained.

27 September 2026 — Codex scheduled check: usage available (99% five-hour and weekly remaining); no reset credit consumed. Checked AGENTS, latest handoff and git diff summary. Ownership remains released; migration 009 development deployment still awaits owner go-ahead. Only this continuity note changed. No app edits, tests, remote database calls, deployments or jobs started/stopped; prior evidence and untested limits unchanged. Next action: approved development deployment, then signed-in Customers/Records verification. Privileged concurrency test remains unapproved; no edit ownership retained.

28 September 2026 — Claude (Cowork): OWNER APPROVED development deployment of migration 009 (explicit answer "Yes, deploy to dev", 11:5x Lagos). Re-ran isolated PGlite 0.5.8 (installed outside the repo): all nine migrations apply and all nine SQL suites pass against today's tree. Deployment NOT yet performed by Claude: the Cowork VM's proxy blocks api.supabase.com, and Terminal on the Mac is a click-only app for computer use, so the owner runs the linked CLI himself: `npx supabase db push --dry-run` (expect only 202609100009 listed) then `npx supabase db push`, from the repo root, against the linked development project. After the push, next: signed-in Customers (sort Name/Balance/Oldest, open count, oldest-unpaid card) and Records (server day totals) verification on desktop and 390px, cross-checked against the canvas; then update BACKEND_SETUP.md's "NOT yet deployed" lines. Only this note changed; no app edits, commits, remote calls or jobs. Privileged concurrency test remains unapproved.

29 September 2026 — Claude Code (Opus 5.5, VS Code on the Mac). Owner asked for a helpful README and to continue from the log.
- README.md rewritten: purpose, implemented vs pending features, quick start with `.env.example` (public values only), checks table including the PGlite SQL runner, project layout, conventions (exact money, server authority, shared UI), database CLI workflow, docs read-order and release to-dos. The old "initial cleanup history" section was dropped; that history lives in this file.
- Migration 009: checked before pushing. `npx supabase migration list --linked` (CLI 2.118.0) showed 202609100009 already applied remotely, so it was pushed after the 28 September approval, but not by this session. No push was run here. Against the development DB, `supabase/tests/customer_debt_sort_and_day_totals.sql` and `supabase/tests/customer_debt_reads.sql` both passed in rollback transactions (run one at a time, no data left behind). Local: `npm run check` exit 0; `npm test` 35/35 pass.
- Docs reconciled: BACKEND_SETUP.md (status line, section heading, tie-breaker wording, new 29 September section), DATABASE_AND_SYNC_DESIGN.md and PRODUCT_SPECIFICATION.md no longer say 009 is undeployed; this file's header/brief are updated.
- Untested: signed-in visual check of Customers/Records (Metro is listening on 8081, PID 16729, which this session did not start or change; it needs the owner's sign-in and no browser was used here). No native/device check. No app code, migrations, commits, pushes, financial writes or new jobs. The privileged concurrency test remains unapproved. No edit ownership retained.

29 September 2026 (continued) — Claude Code. Owner said "continue". I read the canvas artifact 77cdd868 (saved copy only, not republished). New Sale's canvas asks for the draft status as a small chip in the desktop topbar beside DEVELOPMENT (critique 8) and a check chip "Existing customer" in the Customer section header. The Area figure was already in `item-calculation.tsx`.
- `src/components/layout/app-shell.tsx`: new route-keyed `useTopbarStatus` context; the topbar renders the current route's chip before the Development chip.
- `src/components/ui/status-chip.tsx`: optional decorative `icon` prop.
- `src/features/sales/sales-screen.tsx`: draft/submission chip goes to the topbar on desktop and stays in the page on phones; the Customer section gets a trailing check chip.
- `src/features/sales/components/customer-picker.tsx`: the old in-column chip is replaced by a short note shown only for a new customer.
- DESIGN_SYSTEM.md updated (reconciled stale "needs backend work" line for migration 009).
Evidence: `npm run check` exit 0; `npm test` 35/35; web export succeeds with 12 static routes (scratchpad, outside repo); `git diff --check` clean. NOT verified: any signed-in render (no browser session available to this contributor), dark/staff variants, native. No business rules, data services, migrations, deployments, commits or financial writes changed. No edit ownership retained.

29 September 2026 (cash closing) — Claude Code. The owner said "continue". I asked the three open closing questions; the owner chose: show the difference to staff, anyone recounts before finalization (latest used), and admin can backfill earlier days.
- New `supabase/migrations/202609290010_cash_closing.sql` and `supabase/tests/cash_closing.sql` (details in BACKEND_SETUP.md). The first test run exposed that same-transaction timestamps made "latest count" ambiguous, so counts are ordered by an identity sequence instead.
- Client: `cash/submission.ts` adds action `closing_count` (cash only, zero allowed) and an optional `businessDate`. `cash-service.ts` adds typed closing fields, a pre-010-safe reader, and `finalizeCashDay`/`reopenCashDay`. The new `cash/components/cash-closing.tsx` (ClosingCount, DayStatus with finalize/reopen sheets) is wired into `cash-screen.tsx` with date navigation, backfill mode, action labels and the topbar day chip. `cash-activity.tsx` gets the new label and date-neutral wording. `tests/cash-submission.test.mjs` gains closing-count validation asserts.
- Canvas drafted first: https://claude.ai/code/artifact/18901ee8-dd4d-4c62-bdc0-7ec73d98c5d5.
- Evidence: PGlite applies all ten migrations and passes all ten SQL suites; `npm run check` exit 0; `npm test` 35/35; web export with 12 static routes (scratchpad); `git diff --check` clean.
- NOT done or verified: migration 010 deployment (awaiting approval), any signed-in render, native, and real concurrent sessions. A same-ID retry of finalize after a lost response is refused by design; the UI refreshes the day instead. A staff count made before midnight but synced after it is rejected, like openings, and admin must backfill it. No commits, pushes, remote database writes or financial writes. No edit ownership retained.

29 September 2026 (deploy + day navigator) — Claude Code. The owner approved deploying 010 ("Yes, deploy to dev"). The dry-run listed only 202609290010, the push succeeded, and `cash_closing`, `cash_foundation` and `cash_rejection_recovery` all passed against dev in rollback transactions, run one at a time. Mid-turn the owner shared an edited version of the Cash closing canvas (https://claude.ai/artifact/42vV6qfFSzNzLzBBS44MAt, the same artifact as 18901ee8…) with a redesigned day navigator and seven-day state strip. Implemented:
- `src/components/ui/date-navigator.tsx` rewritten with a new API `{date, today, minDate?, onChange, disabled?}`: calendar badge, relative and full date, month picker, Jump to today. Call sites updated in Records, Payments and Cash.
- New `src/components/ui/day-strip.tsx`; new tokens `calendarBadge`, `dayState` (light/dark), `layout.dayDot` and `layout.dayTileHeight`; date helpers in `records/lagos-date.ts` with the new `tests/lagos-date.test.mjs`.
- New migration 011 `cash_day_states` and its SQL suite; `cash-service.ts` `readCashDayStates`; Cash wraps the navigator, refresh and strip in one surface card.
Evidence: PGlite runs all 11 migrations and 11 suites; `npm run check` exit 0; `npm test` 37/37; web export with 12 routes; `git diff --check` clean. Later, with the owner's approval, 011 was deployed: the dry-run listed only 202609290011 and `cash_day_states.sql` passed against dev (rollback). Not verified: signed-in rendering of any of this, the picker on native, and the strip against live data. No commits or pushes to git. No edit ownership retained.

29 September 2026 (DayNavigator) — Claude Code. The owner supplied `docs/design/cash-day-navigator-reference.html` with an exact spec, then asked for the same navigator on /records as one shared component. Owner decisions: staff keep the seven-day read-only range; the accent follows the role; dot colours have dark variants; commit only this task's files.
- Added `src/components/ui/day-navigator.tsx` and `src/components/ui/date-picker-sheet.tsx`. `date-navigator.tsx` now uses the shared picker and remains on Payments. Window, next and previous helpers (`dayWindow`, `canGoNext`, `canGoPrevious`) are in `records/lagos-date.ts`, with tests in `tests/day-window.test.mjs`. Replaced the `dayState`/`dayDot`/`dayTileHeight` tokens with `tokens.cashDay`, and deleted `day-strip.tsx`. Cash maps `cash_day_states` to the four statuses; Records uses the navigator without statuses.
- Evidence: `npm run check` exit 0; `npm test` 40/40; web export with 12 routes; `git diff --check` clean. An isolated esbuild/react-native-web preview outside the repo (sample data, no auth bypass), screenshotted with Playwright Chromium, matches the reference box sizes at 1200px; the differences are listed in DESIGN_SYSTEM.md. Not verified: the signed-in Cash and Records screens, native rendering and gestures, and dark mode visually.
- Git: two commits on a new branch (see the session report). Only this task's files were committed, and those files also carry earlier uncommitted work from today. Everything else remains uncommitted. No edit ownership retained.

