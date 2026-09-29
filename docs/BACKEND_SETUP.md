# Backend setup status — 8 September 2026

Development project: `ucwtbyglnlsngvcejonu`. The owner has confirmed successful admin login. Public signup is disabled. The app contains only the project URL and publishable key in ignored local environment configuration; privileged credentials are not bundled.

## Implemented

- Active staff/admin profile verification and role themes, with server authorization on every sale write.
- Real customer search by name or phone, limited to 20 matches with a refinement hint. Selecting a customer preserves its identity; new customers are created atomically with a sale. Customer names are intentionally not unique.
- Real active materials and historical price versions from Supabase. Approved initial rates: Flex ₦180, SAV ₦200, Clear sticker ₦350, Window graphics ₦500 per square foot.
- Server-owned sales rules for the ₦1,000 invoice minimum and rounding each item upward to ₦10. UI reads these rules. Changing rules through an admin management screen is not implemented yet; direct client writes are denied.
- Sale entry with up to 200 items, preserved dimension inputs/unit, individual calculated/charged amounts, customer/payment validation, and invoice review in the existing adjustable sheet.
- Atomic `create_sale`: authorizes active account, checks business/customer/material/price, recalculates all amounts, creates items, optional customer and opening payment/allocation, audit event and permanent operation receipt together. Zero received creates no payment row.
- Same business/operation ID with identical actor/payload returns the original receipt. Changed requests using that ID are rejected. Transaction-scoped locking serializes simultaneous retries.
- Server invoice number, collector identity, device identity, declared occurrence time, server receipt time and Lagos business date. Delayed/device-time and historical-price flags are retained for future admin review.
- Android SQLite and web IndexedDB save account-scoped drafts and immutable submissions. UI saves draft edits, freezes the submission before network access and retains it until a confirmed receipt. Manual retries and foreground/30-second retries reuse the same ID; explicit business/access validation failures pause automatic retries for review. Confirmed receipts prevent resubmission after restart.
- Staff table reads restricted to today's Lagos date plus the six preceding dates; admin can read history. Direct financial writes/deletes are denied. Scoped old-customer-debt queries are now implemented (see migration 3 below): `customer_outstanding_sales(target_customer_id)` returns one customer's open, not-fully-paid invoices regardless of business date; `customer_debt_totals()` and `customer_balances(search_text,page_limit,page_offset)` power the Customers screen's count/total-debt cards and searchable list. All three are security-definer functions scoped to the caller's active business (and, for the first, to the single customer_id argument), so they cannot be used to dump unrelated historical data.

Applied migrations:

1. `202609070001_identity_catalog.sql`
2. `202609070002_atomic_sales.sql`
3. `202609070003_customer_debt_reads.sql`

(Migrations 004–009 are also deployed to development; see the dated sections below. Migration 009 was confirmed applied on 29 September 2026.)

## Subsequent payments — deployed to development on 8 September

`202609070004_subsequent_payments.sql` adds stable ID ordering to customer/debt RPCs, `payments.review_flags`, a private payment-operation receipt store and `record_payment(operation_id,payload)`. It supports customer oldest-first allocation and invoice-only receipts; all monetary JSON fields are strings. The authenticated collector/business are server-derived. A customer row lock serializes receipts with each other and existing-customer sale creation. Future financial correction/void writers must acquire the same customer lock before invoice locks. Excess actual money is kept once as receipt amount minus allocations and flagged for admin review; no refund or reassignment is implemented.

Local `src/features/payments/submission.ts` persists a `kind: payment` payload under `payment:<UUID>` before sending and confirms only after acknowledgement. Its caller must retain/recover the original UUID, immutable payload and collection time. `payment-service.ts` calls the new RPC and distinguishes review-required errors from retryable failures. These modules are connected to Payments, with customer/invoice entry points, fresh review, all-pending-payment recovery, saved receipts, collector detail and unapplied feedback. Migrations 004 and 005 were applied to development on 8 September after a dry-run. Migration 005 adds scoped exact JSON `payment_context`. Signed-in end-to-end/device and independent-session concurrency validation are outstanding.

Run isolated SQL checks without live credentials using the instructions in `scripts/test-database-local.mjs`. PGlite 0.5.8 was installed only in `/tmp/bomedia-payment-tests`; app dependencies are unchanged. The runner supplies minimal local auth roles/UID emulation, applies all six actual migrations and runs the six rollback SQL suites. This verifies PostgreSQL functions/RLS and sequential retries, not Supabase Auth/PostgREST integration or concurrent database sessions.

## Verification

- Local migrations 001–008 and all eight SQL suites pass, including injected audit failure rollback, exact kobo, deterministic waterfall, invoice-only excess, changed-payload retry rejection, reduced balances, cross-business/inactive/anonymous restrictions and direct-write denial. No remote concurrency result is claimed.
- TypeScript and lint pass; 20 local tests pass, including SQLite reopen, account isolation, rounding/payment validation, lost acknowledgement after a simulated server commit, and refusal to send if durable storage fails.
- Transactional PostgreSQL checks cover 25 items, exact inch/rounding thresholds, minimum orders, zero/positive receipts, selected customers, changed retries, tampered totals, missing methods/phones, orphan prevention, direct payment deletion denial, inactive accounts and cross-business reads. Test data is rolled back.
- `supabase/tests/customer_debt_reads.sql` passed against the deployed development schema in a rollback transaction: a 30-day-old partially-paid sale is invisible via direct `sales` table read outside the seven-day staff window but visible (with the correct remaining balance) via `customer_outstanding_sales`; a fully-paid old sale is correctly excluded; `customer_debt_totals` and `customer_balances` return correct aggregate/search results; cross-business isolation confirmed (another business's staff gets empty/zero results for the same customer_id and totals). All test data rolled back.
- The initial remote concurrency attempt hit the CLI’s temporary-login rotation limitation; its fixtures were removed. Authenticated API concurrency verification is pending explicit approval for the isolated temporary account test. No concurrency pass is claimed.
- Android and web exports pass. Browser login screen renders. Authenticated form interactions, native SQLite/SecureStore, adjustable sheet gestures and interrupted device sessions still need physical-device QA.

## Current limits

This is a development build and database, not a released daily accounting system. The user can now create real development-database records from the app.

Initial/restarted access still requires online profile verification. Android can fall back to cached catalogue data after access is verified; customer search requires connectivity. Starting another sale refreshes the catalogue online. Full offline entry/restart access and permitted customer caching remain unfinished. Web persists recovery data but is not an offline entry platform. Clearing browser/app storage or losing a device can lose unconfirmed work.

Only one active sale is presented at a time. Keep the entry workspace in one browser tab per account while multiple-tab ownership/recovery is still to be implemented. A submitted payload cannot be edited. Rejected business validations retain the submission for review; an admin resolution interface is not implemented.

Sales history (Records) and customer debt (Customers) read-only pages are implemented, with cancellable date/search-scoped reads and tab-focus/app-foreground/manual refresh. Sales ordering uses created_at plus ID; customer/debt RPC ID tie-breakers were deployed in migration 004. Authenticated return-after-sale refresh is not yet device-verified. See the dated session entries in HANDOFF.md. Remaining: realtime refresh, closing/review workflows, audited corrections, admin user/catalogue management, offline access policy, multi-tab handling, data retention/encryption review and device recovery tests. Current timing/price flags are stored, but no cash-day finalization or admin review screen exists yet.

## Authentication setup retained

Native credentials use SecureStore; web sessions use tab-scoped sessionStorage. No signup UI or self-provisioning endpoint exists. The first owner account/business/profile and agreed catalogue were provisioned through trusted administration. The owner chose their password privately and confirmed login.

Supabase config retains public signup disabled, email confirmation enabled, and the prior TOTP settings. The optional Supabase agent-skills package has not been installed. Supabase MCP OAuth was confirmed with read-only scopes; its tools were not loaded in this session. Development migrations/tests used the separately authorized Supabase CLI.

The failing CLI concurrency harness was removed after fixture cleanup, rather than leaving a test that rotates shared temporary credentials in parallel. The proposed replacement needs explicit approval: use the server key only in memory to provision an isolated temporary staff account, send two authenticated requests with the same operation ID, verify one invoice/payment/customer/audit/receipt, and remove all temporary records and the account. That privileged test has not run.

## Files changed in the live-sale stage

- Renamed `src/features/sales/sales-preview-screen.tsx` to `sales-screen.tsx`; updated `src/app/index.tsx` to load it.
- Removed unused `src/features/sales/preview-data.ts` (fictional customers and fixed sample prices). No custom logos/icons were changed.
- Added `src/features/sales/catalog.ts`, `sale-service.ts`, and `submission.ts` for permitted reads, server submission and durable retry behavior.
- Updated `components/customer-picker.tsx` to search the database and `domain/pricing.ts` to accept server-owned rounding/minimum rules.
- Extended `src/services/local/repository.ts` with operation lookup; implemented the web recovery store in `database.web.ts`.
- Added `supabase/migrations/202609070002_atomic_sales.sql`, `supabase/tests/atomic_sales.sql`, and `tests/submission.test.mjs`.
- Added the SDK-compatible `expo-crypto` dependency and updated the lockfile for stable UUIDs.
- Updated README, this status document and DATABASE_AND_SYNC_DESIGN.md to distinguish implemented behavior from remaining work.

## Files changed in the records/customers read-screens stage

- Added `supabase/migrations/202609070003_customer_debt_reads.sql` and `supabase/tests/customer_debt_reads.sql`.
- Added `src/features/records/{lagos-date.ts,records-service.ts,records-screen.tsx}` and `src/features/customers/{customers-service.ts,customers-screen.tsx}`.
- Moved `src/app/index.tsx` to `src/app/(tabs)/index.tsx`; added `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/records.tsx`, `src/app/(tabs)/customers.tsx`; updated `src/app/_layout.tsx` to route to the `(tabs)` group.
- No changes to existing tables, RLS policies, or the sale-entry flow.


Payment UI status: Payments lists this account's locally saved pending and confirmed receipts. Recovery is manual and preserves original UUID/payload; it is not a shared ledger or background worker. New payment review needs connectivity and an explicit method; draft inputs are not persisted before confirmation. Pending payments block another local payment. Browser multi-tab exclusion, full offline startup and admin resolution of excess remain open. Protected /payments renders the sign-in screen; no real payment was created during deployment checks.

Post-deployment schema check confirmed `record_payment` and `payment_context` exist; authenticated users can execute the write RPC, anonymous users cannot, and direct authenticated payment INSERT remains denied. This was a read-only permission check, not a real receipt submission.


8 September Android follow-up: authenticated customer/debt reads and customer payment review were exercised on Pixel_8 emulator after repairing its DNS. Confirmed no selected method by default and missing-method rejection; reviewed an unsaved amount without recording money. Recovery now keeps an acknowledged receipt confirmed if refreshing local history fails (SQLite regression test passed). Shared sheet drag baseline fixed and upward gesture verified; downward/close and actual receipt submission remain pending after a dev-server connection interruption. No database changes in this follow-up.


## Shared payment activity — deployed 8 September

Migration `202609080006_payment_activity.sql` adds read-only `payment_activity`. Business-scoped shared receipts include initial and debt collections, exact Cash/POS/Transfer totals, collector names, timestamps, allocations, flags and unapplied amounts. Staff history is server-limited to seven Lagos dates; the all-dates unapplied filter is admin-only. Amounts aggregate receipts once regardless of allocation count. Admin excess resolution remains unavailable.

Payments now offers Shared activity and This device. Shared activity reconciles on focus/foreground/manual refresh and after an observed payment receipt; it is not a realtime subscription. Offset pagination uses occurred_at/ID ordering, with possible shifts during concurrent inserts. Device history retains local pending/confirmed recovery. These figures are collections, not cash on hand: opening cash/expenses/withdrawals are now in the separate Cash tab (007); reconciliation remains pending.

006 dry-run and development push succeeded. All 20 Node tests, six isolated SQL suites, TypeScript/lint and Android/web exports passed. Signed-in Android shared receipt/collector/detail and admin empty queue verified; downward drag and Close review now verified on a read-only receipt. Existing remote receipt observed only; no new financial records created during QA.


## Cash foundation — 8 September 2026

Migration 007 is deployed to development: one current-day opening, attributed immutable expense/withdrawal entries, private idempotency receipts and exact shared cash summary. RPC-only active-account access; direct writes revoked. Staff summaries limited to seven Lagos dates. Missing opening yields no expected balance; full cash receipts including unapplied money count once; POS/transfer outflows never affect cash. Audit and entry are atomic. Local submitted cash requests persist in existing SQLite/IndexedDB storage before transmission.

24 Node tests, seven isolated SQL suites, TypeScript/lint and Android/web export pass. Authenticated Android server-read and unselected payment choices verified; no real cash entries submitted. Native interrupted save, independent concurrent requests and cash final confirmation remain unverified. This earlier duplicate-opening blocker is resolved by migration 008 below. Closing counts, corrections, finalize/reopen and late-entry close-review are not implemented. See HANDOFF for full evidence and retained approval boundary.


## Cash rejection recovery — deployed 8 September

008 adds process_cash_entry around the original writer, with shared operation locking and nested rollback before any terminal rejection is stored/audited. A prior accepted receipt is recovered unchanged; rejected requests reserve their original ID permanently and cannot become later writes. Active actor/payload matching remains mandatory. New client persists server rejection metadata as needs_attention and displays Not recorded without blocking new entries; unknown outcomes remain pending. Financial correction permissions are unchanged.

26 local tests, eight isolated SQL suites, TypeScript/lint and Android/web exports pass. Dry-run and development deployment succeeded. No native rejection journey, IndexedDB interruption or independent concurrent-session verification performed this stage; no live money entries created. Next: closing counts/admin finalization and late-entry review.


## 9 September evening — Mac verification follow-up

After Claude released the workspace, Codex verified TypeScript, Expo lint, all 34 Node tests and git diff --check on macOS. Android/web exports pass (12 routes; /tmp/bomedia-sept9-verification). This closes Cowork's lint/build verification gap; it does not verify native interaction, staff/dark variants, live response-loss recovery or independent concurrency. No application code or database deployment changed in this session.

## Customer debt sort + Records day totals — deployed to development (written 10 September, confirmed applied 29 September)

`202609100009_customer_debt_sort_and_day_totals.sql` (one transaction):
- Drops/recreates `customer_balances(search_text, sort_key, page_limit, page_offset)` — now also returns `open_invoice_count` and `oldest_unpaid_date`; `sort_key` is `name`|`balance`|`oldest`, applied server-side before limit/offset (`name` then unique customer ID as tie-breakers). Still security definer, business-scoped, intentionally not date-windowed.
- Drops/recreates `customer_debt_totals()` — now also returns the business-wide `oldest_unpaid_date`.
- Adds `records_day_totals(target_date date)` -> `billed_kobo`/`collected_kobo`/`outstanding_kobo`, matching the Records per-row math; non-admins are confined to the seven-day Lagos window (an older date returns zeros), admins see all dates.

Verification: `scripts/test-database-local.mjs` (PGlite 0.5.8) applies all nine migrations and passes all eight SQL suites, including the new `supabase/tests/customer_debt_sort_and_day_totals.sql`; `customer_debt_reads.sql` was updated to the new `customer_balances` signature. `tsc --noEmit` clean; 35 Node tests pass; `npm run check` (tsc + expo lint) passed on the Mac on 11 September. No commits/pushes/deployments/financial writes in that session.


## 13 September — migration 009 pagination fix (before deployment)

The then-undeployed customer_balances replacement now uses customer ID after name to break ties for all sort modes. A 30-identical-name regression checks both pages under name/balance/oldest ordering. All nine SQL suites pass against all nine migrations in isolated PGlite. No development deployment was performed; explicit owner go-ahead remains pending. This changes ordering reliability only, not permissions or business calculations.

## 29 September — migration 009 deployment confirmed

The owner approved development deployment on 28 September. It was then pushed with the linked CLI, but not by the 29 September session, which only confirmed it was applied. On 29 September `supabase migration list --linked` showed 202609070001–202609100009 all present both locally and remotely. Against the deployed development schema, `supabase/tests/customer_debt_sort_and_day_totals.sql` and `supabase/tests/customer_debt_reads.sql` both passed in rollback transactions, so no test data was left behind. `npm run check` passed and all 35 Node tests passed. A signed-in visual check of Customers and Records on desktop and phone has not been done yet.

## 29 September — cash closing (migration 010) — DEPLOYED to development 29 September

`202609290010_cash_closing.sql`:
- New `cash_counts` table. Counts are immutable, and an identity `sequence` fixes the order they were recorded in. New `cash_day_closes` table holds one active close per business/date (partial unique index); reopened closes stay as history with who reopened, when and why. Both tables have RLS enabled with no direct client grants.
- New `private.cash_day_figures(business,date)`: the single drawer calculation, including the latest count, the difference and receipt/outflow row counts. Used by both the live summary and the finalize snapshot.
- `record_cash_entry` replaced with the same signature. It adds action `closing_count`: cash only, zero allowed. Staff can count today only; admin may send `businessDate` for an earlier day, flagged `backfilled_count`; future dates and finalized days are refused. Every write for a drawer/day takes a `cashday:` advisory lock shared with finalize and reopen. Outflows recorded for a finalized date are kept and flagged `after_close`. `process_cash_entry` replaced only to add specific rejection wording.
- New admin-only `finalize_cash_day(date,note)` and `reopen_cash_day(date,reason)`, both audited. Finalize requires a count, and a note when no opening count exists. Reopen requires a reason.
- `cash_day_summary` replaced with the same signature and seven-day staff window. It adds counts, counted/difference, the close (snapshot, late entry count, expected-cash change, needsReview) and reopen history. Late entries are detected by the rise in row counts, so this does not depend on timestamps.

Verification: isolated PGlite 0.5.8 (installed in the session scratchpad, outside the repo) applies all ten migrations and passes all ten SQL suites. The new `supabase/tests/cash_closing.sql` covers: count before opening; difference; colleague recount used as latest; staff backfill, non-cash and future counts refused; direct inserts denied; staff finalize/reopen denied; finalize requiring a count, and a note when there is no opening; admin backfill with finalize; snapshot values; double finalize refused; count after finalize refused, with the specific terminal wrapper message; late expense flagged and review/impact shown while the snapshot is unchanged; reopen requiring a reason; refinalize and history; a late POS receipt visible to staff as Needs review; cross-business isolation. Existing cash suites are unchanged and pass.

Deployed on 29 September with the owner's explicit approval ("Yes, deploy to dev"). The dry-run listed only 202609290010, and the push applied it. Against the deployed development schema, `cash_closing.sql`, `cash_foundation.sql` and `cash_rejection_recovery.sql` all passed in rollback transactions, run one at a time with no data left behind. The client reader still defaults the closing fields for safety.

## 29 September — Cash day states (migration 011) — DEPLOYED to development 29 September

`202609290011_cash_day_states.sql` adds the read-only `cash_day_states(end_date, day_count ≤ 31)`. It returns `[{date, state}]`, where state is final, review, open or none. It clamps to today, keeps the seven-day staff window, is scoped to the business, and uses the same review rule as `cash_day_summary`. `supabase/tests/cash_day_states.sql` covers the states, staff clipping and clamping, the oversized-range rejection, admin history and cross-business isolation. All 11 migrations and 11 SQL suites pass in PGlite. Deployed with the owner's explicit approval. The dry-run listed only 202609290011, and `cash_day_states.sql` passed against dev in a rollback transaction. If the read fails, the Cash day strip is hidden.
