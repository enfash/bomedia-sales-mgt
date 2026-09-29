-- Scoped customer-debt and business-wide summary reads.
-- Staff already read sales/payments directly for the current Lagos date plus six
-- preceding days (see 202609070002 sales_read/payments_read policies). These functions
-- expose only aggregated/derived balances so staff can find an older unpaid invoice
-- through its customer, and both roles can see customer count/total debt, without
-- granting unrestricted historical table access.
begin;

create function private.sale_balance(target_sale_id uuid) returns bigint
language sql stable set search_path='' as $$
 select s.total_kobo - coalesce((select sum(pa.amount_kobo) from public.payment_allocations pa where pa.sale_id = s.id), 0)
 from public.sales s where s.id = target_sale_id
$$;
revoke all on function private.sale_balance(uuid) from public;

-- One customer's outstanding invoices, regardless of business date. Scoped to a single
-- customer_id argument so it cannot be used to list unrelated historical sales.
create function public.customer_outstanding_sales(target_customer_id uuid)
returns table(sale_id uuid, invoice_number bigint, business_date date, total_kobo bigint, balance_kobo bigint, review_flags text[])
language sql stable security definer set search_path='' as $$
 select s.id, s.invoice_number, s.business_date, s.total_kobo,
  s.total_kobo - coalesce(alloc.paid, 0) as balance_kobo, s.review_flags
 from public.sales s
 left join (select sale_id, sum(amount_kobo) as paid from public.payment_allocations group by sale_id) alloc on alloc.sale_id = s.id
 where s.customer_id = target_customer_id and s.business_id = (select private.active_business())
  and s.status = 'open' and s.total_kobo > coalesce(alloc.paid, 0)
 order by s.business_date asc, s.created_at asc
$$;
revoke all on function public.customer_outstanding_sales(uuid) from public,anon;
grant execute on function public.customer_outstanding_sales(uuid) to authenticated;

-- Business-wide customer count and total outstanding debt, for the customer page cards.
create function public.customer_debt_totals()
returns table(customer_count bigint, total_debt_kobo bigint)
language sql stable security definer set search_path='' as $$
 select
  (select count(*) from public.customers where business_id = (select private.active_business()))::bigint,
  coalesce((
   select sum(s.total_kobo - coalesce(alloc.paid, 0))
   from public.sales s
   left join (select sale_id, sum(amount_kobo) as paid from public.payment_allocations group by sale_id) alloc on alloc.sale_id = s.id
   where s.business_id = (select private.active_business()) and s.status = 'open' and s.total_kobo > coalesce(alloc.paid, 0)
  ), 0)::bigint
$$;
revoke all on function public.customer_debt_totals() from public,anon;
grant execute on function public.customer_debt_totals() to authenticated;

-- Searchable, paginated customer list with each customer's current outstanding balance.
create function public.customer_balances(search_text text default null, page_limit integer default 20, page_offset integer default 0)
returns table(customer_id uuid, name text, phone text, balance_kobo bigint)
language sql stable security definer set search_path='' as $$
 select c.id, c.name, c.phone, coalesce(bal.balance, 0)::bigint
 from public.customers c
 left join (
  select s.customer_id, sum(s.total_kobo - coalesce(alloc.paid, 0)) as balance
  from public.sales s
  left join (select sale_id, sum(amount_kobo) as paid from public.payment_allocations group by sale_id) alloc on alloc.sale_id = s.id
  where s.status = 'open' and s.total_kobo > coalesce(alloc.paid, 0)
  group by s.customer_id
 ) bal on bal.customer_id = c.id
 where c.business_id = (select private.active_business())
  and (search_text is null or length(trim(search_text)) = 0 or c.name ilike '%' || trim(search_text) || '%' or c.phone ilike '%' || trim(search_text) || '%')
 order by c.name asc
 limit least(greatest(page_limit, 1), 100) offset greatest(page_offset, 0)
$$;
revoke all on function public.customer_balances(text,integer,integer) from public,anon;
grant execute on function public.customer_balances(text,integer,integer) to authenticated;

commit;
