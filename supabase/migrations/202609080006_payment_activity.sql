begin;
create function public.payment_activity(target_date date,review_only boolean default false,page_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare business uuid:=private.active_business(); admin boolean:=coalesce(private.is_admin(),false); result jsonb;
begin
 if business is null then raise exception 'Active account required' using errcode='42501'; end if;
 if review_only is null or page_offset is null or page_offset<0 then raise exception 'Invalid activity request'; end if;
 if review_only and not admin then raise exception 'Admin access required' using errcode='42501'; end if;
 if not review_only and (target_date is null or (not admin and target_date not between (now() at time zone 'Africa/Lagos')::date-6 and (now() at time zone 'Africa/Lagos')::date)) then
  raise exception 'Date outside permitted history' using errcode='42501';
 end if;
 with source as materialized (
  select p.*,c.name as customer_name,u.display_name as collector_name,
   p.amount_kobo-coalesce(a.allocated,0) as unapplied
  from public.payments p join public.customers c on c.id=p.customer_id join public.profiles u on u.id=p.collected_by
  left join lateral (select sum(amount_kobo) allocated from public.payment_allocations where payment_id=p.id) a on true
  where p.business_id=business and (review_only or p.business_date=target_date)
 ), eligible as materialized (
  select * from source where not review_only or unapplied>0
 ), page as (
  select * from eligible order by occurred_at desc,id desc limit 20 offset page_offset
 )
 select jsonb_build_object(
  'count',(select count(*)::text from eligible),
  'cashKobo',(select coalesce(sum(amount_kobo) filter(where method='cash'),0)::text from eligible),
  'posKobo',(select coalesce(sum(amount_kobo) filter(where method='pos'),0)::text from eligible),
  'transferKobo',(select coalesce(sum(amount_kobo) filter(where method='transfer'),0)::text from eligible),
  'unappliedKobo',(select coalesce(sum(unapplied),0)::text from eligible),
  'hasMore',(select count(*)>page_offset+20 from eligible),
  'receipts',coalesce((select jsonb_agg(jsonb_build_object(
   'id',p.id,'customerName',p.customer_name,'amountKobo',p.amount_kobo::text,'unappliedKobo',p.unapplied::text,
   'method',p.method,'collectedByName',p.collector_name,'businessDate',p.business_date,'occurredAt',p.occurred_at,
   'receivedAt',p.created_at,'reviewFlags',p.review_flags,
   'allocations',coalesce((select jsonb_agg(jsonb_build_object('invoiceNumber',s.invoice_number::text,'amountKobo',a.amount_kobo::text) order by s.business_date,s.created_at,s.id)
    from public.payment_allocations a join public.sales s on s.id=a.sale_id where a.payment_id=p.id),'[]')
  ) order by p.occurred_at desc,p.id desc) from page p),'[]')) into result;
 return result;
end $$;
revoke all on function public.payment_activity(date,boolean,integer) from public,anon;
grant execute on function public.payment_activity(date,boolean,integer) to authenticated;
commit;
