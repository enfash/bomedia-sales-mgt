begin;
-- JSON strings preserve kobo exactly and avoid the PostgREST row limit truncating a review.
create function public.payment_context(target_customer_id uuid,target_sale_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare customer public.customers%rowtype; invoices jsonb; balance numeric;
begin
 select * into customer from public.customers where id=target_customer_id and business_id=(select private.active_business());
 if not found then raise exception 'Customer unavailable' using errcode='42501'; end if;
 if target_sale_id is not null and not exists(select 1 from public.sales where id=target_sale_id and customer_id=customer.id and business_id=customer.business_id) then
  raise exception 'Invoice unavailable' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('saleId',s.id,'invoiceNumber',s.invoice_number::text,'balanceKobo',s.balance::text)
  order by s.business_date,s.created_at,s.id),'[]'),coalesce(sum(s.balance),0)
 into invoices,balance from (
  select s.*,s.total_kobo-coalesce((select sum(a.amount_kobo) from public.payment_allocations a where a.sale_id=s.id),0) as balance
  from public.sales s where s.business_id=customer.business_id and s.customer_id=customer.id and s.status='open'
   and (target_sale_id is null or s.id=target_sale_id)
 ) s where s.balance>0;
 return jsonb_build_object('customerId',customer.id,'customerName',customer.name,'balanceKobo',balance::text,'invoices',invoices);
end $$;
revoke all on function public.payment_context(uuid,uuid) from public,anon;
grant execute on function public.payment_context(uuid,uuid) to authenticated;
commit;
