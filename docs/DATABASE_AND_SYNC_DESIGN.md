# BOMedia — database and synchronization design

7 September 2026 · Architecture and staged implementation

Current implementation status is maintained in [BACKEND_SETUP.md](BACKEND_SETUP.md). Identity/catalogue and atomic initial sale/payment submission are deployed to development; subsequent-payment SQL (004/005) and Payments review/recovery UI are deployed/connected for development, with authenticated end-to-end and independent concurrency testing still outstanding. Later ledger and offline workflows below remain planned.

## Design boundary

Postgres holds confirmed business records shared by all devices. Android keeps durable drafts, cached permitted data, and a queue of unconfirmed operations. Screens compose React Native Paper components; pricing, permissions, persistence, and synchronization are separate modules. Web uses the same calculation and service contracts, with desktop presentation. Proposed V1 web writes require connectivity; Android is the offline entry platform. The selected development project now contains the identity/catalogue and initial sale/payment migrations.

## Records and relationships

| Record | Responsibility and key constraints |
| --- | --- |
| Business | One BOMedia business, timezone Africa/Lagos, currency NGN. Business identifier scopes related records. |
| Profile | Auth user ID, business, display name, role, active status. Users cannot change their own role or active status. |
| Customer | Stable UUID, required name, optional phone/email, normalized search values. Names are not unique. Deactivate rather than erase referenced customers. |
| Material / roll width | Admin-owned catalogue; widths belong to materials. Deactivation preserves historical references. |
| Price version | Material, rate, effective dates and actor. Historical rates are immutable. |
| Sale | UUID, customer, server-assigned unique invoice number, business date, status, totals, customer snapshot and creator. |
| Sale item | Sale UUID, position, material/rate snapshot, entered billable dimensions and unit, quantity, optional roll width, pre-rounding calculation, rounded amount. |
| Payment | One receipt of money: customer, exact amount, method, actor, device, occurrence time, server receipt time and operation ID. |
| Payment allocation | Links payment to sale with allocated amount. A waterfall payment can have several allocations without duplicating collection totals. |
| Expense | Amount, method, category, description, actor, business date. Corrections retain original history. |
| Withdrawal | Amount, source/method, reason, actor, business date; distinct from operating expenses. |
| Cash day / count revision | One drawer/day record enforced by uniqueness. Opening amount, counted closing amount, recorder and timestamps; later count corrections create revisions. |
| Adjustment / audit event | Authorized reversal/correction linked to original record, reason, actor and timestamp. Audit entries are written by trusted mutations. |
| Operation receipt | Unique business + operation UUID, authenticated actor, payload digest, result IDs. Written atomically with the business mutation. |

Index business/date and customer on sales; payment occurrence date; allocation sale/payment IDs; active materials; customer search values. Paginate lists. Introduce more indexes based on actual query plans, not speculation.

## Pricing contract

Use exact decimal inputs and a shared calculation contract, verified again by the server. Preserve input values and unit. Inches divide area by 144; feet do not. Multiply area by quantity and the selected immutable rate. Round the item charge upward to a multiple of ₦10, sum rounded items, then apply the invoice-level ₦1,000 minimum.

Avoid rounding an intermediate area or an amount displayed to kobo before deciding the next ₦10. Preserve operands and calculation version so repeating decimal areas are reproducible; use scaled integer/rational arithmetic for the threshold decision. Financial ledger values use integer kobo or exact Postgres numeric with two decimal places, never floating point. Show calculated and charged amounts separately, both with copy actions. Actual payments/expenses are not rounded to tens.

At submission, validate positive dimensions, positive whole quantity, valid material/rate, nonempty items, customer name, explicit method for a positive payment, and phone on file if debt remains. A zero opening payment creates no payment row. Proposed online excess-payment rule: block excess before submission; offline money already received follows the exception process below.

## Controlled writes and access

Expose narrowly scoped operations for create sale, record customer/invoice payment, log expense, record withdrawal, open/count cash day, and admin corrections. Sale creation commits all items, optional customer creation and opening payment, allocations, audit event and operation receipt in one transaction.

Enable RLS and explicit grants on exposed tables. Restrict direct financial updates/deletes; controlled functions must authorize the caller and validate all parameters. Prefer security-invoker functions; any required security-definer function has a fixed safe search path, explicit active-role/business checks, narrowly granted execution and no arbitrary SQL. Safe aggregate views must not bypass permissions.

Staff can read the current Lagos date plus six preceding dates in Records, and access older outstanding sales through authorized customer-debt queries. Relevant paid allocations/history remain accessible to explain collected debt without exposing unrelated full historical lists. Database authorization cannot depend on which screen initiated a request. Shared collection totals and collector details intentionally include all staff. Admins read full history. Customer lifetime value/profit analytics are not implied by customer debt access.

Both roles create cash counts and withdrawals. Only admins correct money entries, void sales, change catalogue prices or manage accounts. Disable public signup; account provisioning uses a trusted server operation that verifies the requesting admin. Privileged keys never enter the app. Check the current profile on server writes so revoked permissions are not accepted solely from a stale cached role.

## Durable submission and retries

Proposed Android persistence: Expo SQLite behind a repository interface; validate the exact SDK API when implementing. Store draft edits transactionally. On Submit, freeze a versioned payload with a UUID and save it to an outbox before attempting the network request. Include dependencies such as a customer created offline. Do not mutate a queued payload after its first send.

Outbox states: pending, sending, confirmed, needs attention. Recover interrupted sending entries after restart. Retry transient failures with backoff and the same UUID. Authentication failures pause until reauthentication; business validation errors require review. Never label an entry confirmed from a timeout or network disconnect.

The server handles simultaneous retries using a unique operation receipt and transaction. Same ID + same payload returns the original result; same ID + changed payload is rejected. A lost response after commit therefore cannot create another sale or payment. Map the local operation to its server IDs before clearing pending display, avoiding double counting local plus confirmed records.

Drafts/pending entries survive logout or restart but remain isolated to the originating account. Do not promise recovery after device loss or app-data removal before sync. Credentials use platform-appropriate protected storage; local business data retention/encryption needs a concrete implementation review.

## Payment concurrency

Lock the customer and affected invoices in deterministic order while allocating payments. Customer waterfall uses oldest business date, creation time and stable ID for ties. Invoice payment can only allocate to its target sale. Enforce allocation totals against available payment and invoice balances inside the transaction; independent row checks alone cannot enforce these cross-record sums.

If offline payment arrives after another device settled the debt, preserve the actual receipt once, allocate only where its declared scope permits, and retain any unapplied remainder as an admin-review exception. Count the cash receipt in collections even if allocation is unresolved. Do not silently create negative invoice debt, discard money, refund, or move an invoice-specific payment elsewhere. The exact refund/reallocation resolution requires an audited admin action.

For online waterfall preview, use a balance/version check and refresh the preview if another payment changed it before confirmation. Offline preview explicitly states that allocation is pending and may change after sync.

## Shared data refresh

Proposed refresh strategy: initial snapshot on login, re-fetch after successful writes, on reconnect and app foreground, and after server change notifications. Notifications trigger reconciliation; they are not a guaranteed durable delivery queue. Periodic foreground refresh covers missed events. Query/cache keys include business and user scope and are cleared or isolated on account changes.

Every connected device converges on the same confirmed totals. Separate local pending amounts from confirmed shared totals, with last-sync context when disconnected. Derive sales balances from charges and effective allocations; derive collections from receipts/reversals, never from repeated allocation joins.

## Shared cash day

Opening cash + cash receipts − cash expenses − cash withdrawals, with explicit effective cash corrections/refunds when implemented, yields expected cash. Counted minus expected gives the difference. POS and transfers are separate. Payments against old invoices count on collection date.

Approved closing model: staff or admin records a closing count; admin finalizes the reconciliation. Finalization is a recorded snapshot, not a guarantee that offline devices contain no missing work. Surface known pending devices/operations and explicitly acknowledge unknown offline state. A later entry for that date marks the finalized day as needing review; it never silently rewrites the saved close. Admin can reopen/revise with a reason. This finalization policy is approved: staff/admins record counts, admins finalize; later activity flags the day for review. Distinguish original device recording time from server sync time, with device timestamps treated as reported rather than independently verified evidence.

Use server receipt time plus declared occurrence time/business date. Flag suspicious device clock drift and late entries for review; do not quietly push yesterday's cash into today. One unique drawer/day prevents simultaneous duplicate opening records.

## Recommended defaults needing review

- Honor cached historical rate versions for already recorded offline sales, retaining the version and flagging a price change; never silently reprice a receipt.
- Permit Android offline expenses/withdrawals through the same durable queue; require connectivity to open/finalize cash days and perform admin corrections.
- Require initial online login. Determine cached offline-access duration and pending-work recovery before authentication implementation; expired tokens do not authorize server writes.
- Use temporary clearly labelled pending-sync invoice references; allocate official invoice numbers on server confirmation. Do not promise gapless numbering.
- Keep refunds, sale voids with payments, and excess-payment resolution gated until their business rules are specified.

## Verification before release

Test 20+ items; item rounding boundaries; minimum order; missing phone with balance; required method; repeated customer identity; lost acknowledgement; process restart; concurrent retries; two staff paying the same debt; partial allocation; revoked user; stale prices; duplicate drawer opening; late sync after closing; and staff attempts to edit prices or access restricted history. Verify local/server calculation parity and RLS allow/deny paths. Test backup/restore separately before relying on the app for daily records.

## Implementation sequence

1. Approved design tokens and local calculation tests.
2. Schema migrations and authorization tests in a development project.
3. Auth, customer search and catalogue.
4. Durable sale draft/outbox and atomic submission.
5. Payments and concurrency tests.
6. Expenses, withdrawals, shared cash day and live refresh.
7. Device beta and recovery rehearsal.

Stages 1–4 now have implementations, with online initial sale/payment saving and durable retry recovery. Full offline-access policy, cached customer search, multi-tab coordination and physical-device verification remain incomplete. Later payment/ledger/closing workflows remain planned. See BACKEND_SETUP.md for precise status.

## Sources checked

Technical mechanisms checked against [Supabase RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security) and [database functions](https://supabase.com/docs/guides/database/functions). The queue, allocation, and closing policies above are BOMedia-specific design proposals, not built-in Supabase guarantees.


## Subsequent-payment implementation note — 7 September 2026

Migration 004 (applied to development on 8 September) implements `record_payment`. Lock order is active profile share lock, operation advisory lock, customer update lock, then invoices in business_date/created_at/ID order. Existing `create_sale` already locks an existing customer before creating its sale/payment. Any future correction, void or allocation writer must use this same customer-first protocol. Sequential refreshed-balance tests pass; independent simultaneous sessions still require validation.

A receipt retains the full actual amount; applied allocations can sum to less. The difference remains unapplied and triggers admin review. Invoice scope never spills to unrelated invoices, including if its target has already been paid or voided. Collection time determines Lagos business date; server receipt time and timing review flags are also stored. This does not implement closed-day snapshots or excess resolution. Durable local keys are `payment:<UUID>`; payloads include `kind: payment` to distinguish them from sale operations. A future queue dispatcher must select the handler by kind and retain the original UUID, never resend a payment as `create_sale`.


## Shared collections implementation — 8 September

Migration 006 is deployed to development. `payment_activity` is a read-only business-scoped JSON RPC; sums operate on receipts with pre-aggregated allocations to prevent double counting. Staff requests are seven-day collection history; admin-only review mode spans all dates with positive unapplied amounts. Collection method totals include the full actual receipt (including unapplied money). Pending local submissions are excluded until committed. Shared UI reconciles on focus/foreground/manual refresh; realtime subscriptions and cash-day accounting remain planned.


## Implementation update — 8 September 2026: Cash foundation

Migration 007 is implemented and deployed to development: cash_days opening per business/date, immutable cash_outflows, private.cash_operations, atomic record_cash_entry and scoped cash_day_summary returning exact JSON kobo strings. Submitted local cash requests use cash:UUID in the existing account-scoped outbox. Expected balance includes the full cash receipt even when allocation is pending, excludes POS/transfer, and remains null without opening. Closed-day snapshots and counts are still planned. Migration 008 supplies server-verified terminal rejection recovery; unknown-commit requests remain pending. Native final-save/recovery and real concurrent-session validation remain outstanding.


## Cash rejection transaction — 8 September 2026

process_cash_entry (008, deployed) shares the original cash writer advisory lock. Matching committed operations return first. The original writer runs in a nested transaction; caught validation failure rolls back its entire financial attempt before the rejection receipt/audit commit. Reserving the same ID in cash_operations prevents delayed legacy/new retries from later saving rejected requests. No absence-of-row check authorizes local deletion. Actor/payload mismatches and unexpected backend errors stay unresolved. Native/web storage retains rejected history using needs_attention plus validated status=rejected/operationId metadata. This terminal state is specific to cash; other needs_attention records must not be assumed resolved.


13 September implementation note (deployed to development, confirmed 29 September): migration 009 retains a unique customer-ID final tie-breaker after selected sort and name. Duplicate names therefore have deterministic ordering across offset pages for an unchanged data set. Concurrent inserts or changing balances may still move rows between requests; this does not provide snapshot pagination.

29 September 2026 implementation note: migration 010 (written and tested, not deployed) implements the approved closing model above. It uses immutable closing counts, with the latest by recording sequence used. The finalized snapshot is stored as JSON from the same figure function the live summary uses. There is one active close per day, and reopened closes are retained. Late activity is detected by comparing payment/outflow row counts and expected cash against the snapshot, never by rewriting it. Counts and finalize/reopen share a per-day advisory lock. Counts use the existing durable cash outbox with the same-ID retry. Finalize/reopen are online admin RPCs; a lost response is resolved by refreshing, because the server refuses a repeat.
