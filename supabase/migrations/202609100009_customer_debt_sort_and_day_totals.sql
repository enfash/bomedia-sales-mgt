-- Customer-debt list enrichment + server-side Records day totals.
--
-- Two gaps the UI could not honour without server support:
--  1. The customer list needs each customer's open-invoice count and oldest unpaid
--     date, and a sort control (name / balance / oldest debt). Sorting one fetched
--     page client-side would misrepresent the list, so the ordering must be applied
--     in SQL before limit/offset.
--  2. The Records screen showed Billed/Collected/Owed by summing only the rows loaded
--     so far. This adds a real aggregate for a single business date so the totals are
--     complete regardless of paging.
--
-- Both reuse the established scoping: private.active_business() confines every read to
-- the caller's business, and private.is_admin() plus the seven-day Lagos window mirror
-- the sales_read/payments_read RLS policies so a security-definer function is never a
-- backdoor to history a staff member cannot otherwise read.
begin;

-- customer_balances gains open_invoice_count, oldest_unpaid_date and a sort_key. The
-- return signature changes, so the old three-argument function is dropped first.
drop function if exists public.customer_balances(text, integer, integer);

create function public.customer_balances(
  search_text text default null,
  sort_key text default 'name',
  page_limit integer default 20,
  page_offset integer default 0
)
returns table(
  customer_id uuid,
  name text,
  phone text,
  balance_kobo bigint,
  open_invoice_count bigint,
  oldest_unpaid_date date
)
language sql stable security definer set search_path='' as $$
 select
  c.id,
  c.name,
  c.phone,
  coalesce(bal.balance, 0)::bigint as balance_kobo,
  coalesce(bal.open_count, 0)::bigint as open_invoice_count,
  bal.oldest_date as oldest_unpaid_date
 from public.customers c
 left join (
  -- One row per customer aggregating only their still-outstanding open sales, so the
  -- count, oldest date and balance all describe the same set of invoices.
  select
   s.customer_id,
   sum(s.total_kobo - coalesce(alloc.paid, 0)) as balance,
   count(*) as open_count,
   min(s.business_date) as oldest_date
  from public.sales s
  left join (
   select sale_id, sum(amount_kobo) as paid
   from public.payment_allocations group by sale_id
  ) alloc on alloc.sale_id = s.id
  where s.status = 'open' and s.total_kobo > coalesce(alloc.paid, 0)
  group by s.customer_id
 ) bal on bal.customer_id = c.id
 where c.business_id = (select private.active_business())
  and (
   search_text is null
   or length(trim(search_text)) = 0
   or c.name ilike '%' || trim(search_text) || '%'
   or c.phone ilike '%' || trim(search_text) || '%'
  )
 -- Server-side ordering: the inactive CASE arms evaluate to null for every row and so
 -- have no effect, leaving name then unique customer ID to break ties. Only the selected key
 -- actually orders the set, which is what makes paging correct.
 order by
  case when sort_key = 'balance' then coalesce(bal.balance, 0) end desc nulls last,
  case when sort_key = 'oldest' then bal.oldest_date end asc nulls last,
  c.name asc, c.id asc
 limit least(greatest(page_limit, 1), 100) offset greatest(page_offset, 0)
$$;
revoke all on function public.customer_balances(text, text, integer, integer) from public, anon;
grant execute on function public.customer_balances(text, text, integer, integer) to authenticated;

-- Authoritative Billed / Collected / Still-owed for one business date. Definitions
-- match the Records screen's per-row derivation so a fully loaded day reconciles to
-- these figures exactly:
--   billed      = sum of every sale's total for the date
--   collected   = sum of all allocations against those sales (raw, not clamped)
--   outstanding = sum of per-sale max(0, total - allocated)
-- Non-admins only aggregate rows inside the seven-day window they may read; an older
-- date therefore returns zeros rather than leaking history.
create function public.records_day_totals(target_date date)
returns table(billed_kobo bigint, collected_kobo bigint, outstanding_kobo bigint)
language sql stable security definer set search_path='' as $$
 select
  coalesce(sum(s.total_kobo), 0)::bigint as billed_kobo,
  coalesce(sum(coalesce(alloc.paid, 0)), 0)::bigint as collected_kobo,
  coalesce(sum(greatest(s.total_kobo - coalesce(alloc.paid, 0), 0)), 0)::bigint as outstanding_kobo
 from public.sales s
 left join (
  select sale_id, sum(amount_kobo) as paid
  from public.payment_allocations group by sale_id
 ) alloc on alloc.sale_id = s.id
 where s.business_id = (select private.active_business())
  and s.business_date = target_date
  and (
   (select private.is_admin())
   or target_date between (now() at time zone 'Africa/Lagos')::date - 6 and (now() at time zone 'Africa/Lagos')::date
  )
$$;
revoke all on function public.records_day_totals(date) from public, anon;
grant execute on function public.records_day_totals(date) to authenticated;

-- customer_debt_totals also returns the single oldest outstanding invoice date in the
-- business, so the Customers page can show an "Oldest unpaid" card without a second
-- round trip. Return type changes, so the old two-column function is dropped first.
drop function if exists public.customer_debt_totals();
create function public.customer_debt_totals()
returns table(customer_count bigint, total_debt_kobo bigint, oldest_unpaid_date date)
language sql stable security definer set search_path='' as $$
 select
  (select count(*) from public.customers where business_id = (select private.active_business()))::bigint,
  coalesce((
   select sum(s.total_kobo - coalesce(alloc.paid, 0))
   from public.sales s
   left join (select sale_id, sum(amount_kobo) as paid from public.payment_allocations group by sale_id) alloc on alloc.sale_id = s.id
   where s.business_id = (select private.active_business()) and s.status = 'open' and s.total_kobo > coalesce(alloc.paid, 0)
  ), 0)::bigint,
  (
   select min(s.business_date)
   from public.sales s
   left join (select sale_id, sum(amount_kobo) as paid from public.payment_allocations group by sale_id) alloc on alloc.sale_id = s.id
   where s.business_id = (select private.active_business()) and s.status = 'open' and s.total_kobo > coalesce(alloc.paid, 0)
  )
$$;
revoke all on function public.customer_debt_totals() from public, anon;
grant execute on function public.customer_debt_totals() to authenticated;

commit;
