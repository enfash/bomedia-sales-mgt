-- Deterministic read ordering and atomic subsequent receipts.
begin;

create or replace function public.customer_outstanding_sales(target_customer_id uuid)
returns table(sale_id uuid, invoice_number bigint, business_date date, total_kobo bigint, balance_kobo bigint, review_flags text[])
language sql stable security definer set search_path='' as $$
 select s.id, s.invoice_number, s.business_date, s.total_kobo,
  s.total_kobo - coalesce(alloc.paid, 0) as balance_kobo, s.review_flags
 from public.sales s
 left join (select sale_id, sum(amount_kobo) as paid from public.payment_allocations group by sale_id) alloc on alloc.sale_id = s.id
 where s.customer_id = target_customer_id and s.business_id = (select private.active_business())
  and s.status = 'open' and s.total_kobo > coalesce(alloc.paid, 0)
 order by s.business_date asc, s.created_at asc, s.id asc
$$;
revoke all on function public.customer_outstanding_sales(uuid) from public,anon;
grant execute on function public.customer_outstanding_sales(uuid) to authenticated;

create or replace function public.customer_balances(search_text text default null, page_limit integer default 20, page_offset integer default 0)
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
 order by c.name asc, c.id asc
 limit least(greatest(page_limit, 1), 100) offset greatest(page_offset, 0)
$$;
revoke all on function public.customer_balances(text,integer,integer) from public,anon;
grant execute on function public.customer_balances(text,integer,integer) to authenticated;

alter table public.payments add column review_flags text[] not null default '{}';
-- Unallocated money is still a receipt, never a second receipt or a negative debt.
-- Existing initial-sale payments remain fully allocated; no backfill changes money.
create table private.payment_operations (
 business_id uuid not null references public.businesses(id), operation_id uuid not null,
 actor_id uuid not null references public.profiles(id), payload jsonb not null, result jsonb not null,
 created_at timestamptz not null default now(), primary key(business_id,operation_id)
);
revoke all on private.payment_operations from public,anon,authenticated;

create function public.record_payment(operation_id uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 actor public.profiles%rowtype; prior private.payment_operations%rowtype;
 customer uuid; target uuid; device uuid; occurred timestamptz;
 paid bigint; remaining bigint; balance bigint; allocated bigint; payment uuid;
 invoice public.sales%rowtype; allocations jsonb:='[]'; receipt jsonb;
 flags text[]:='{}'; scope text;
begin
 select * into actor from public.profiles where id=auth.uid() and active for share;
 if not found then raise exception 'Active account required' using errcode='42501'; end if;
 if operation_id is null or payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Invalid payment submission'; end if;
 perform pg_advisory_xact_lock(hashtextextended('payment:'||actor.business_id::text||operation_id::text,0));
 select * into prior from private.payment_operations o
 where o.business_id=actor.business_id and o.operation_id=record_payment.operation_id;
 if found then
  if prior.actor_id<>actor.id or prior.payload<>payload then raise exception 'Payment ID already belongs to a different request'; end if;
  return prior.result;
 end if;
 scope:=payload->>'scope';
 if payload->>'version' is distinct from '1' or scope is null or scope not in ('invoice','customer') then raise exception 'Unsupported payment format'; end if;
 if coalesce(payload->>'amountKobo','') !~ '^[1-9][0-9]{0,15}$' then raise exception 'Enter a positive payment in whole kobo'; end if;
 paid:=(payload->>'amountKobo')::bigint; remaining:=paid;
 if coalesce(payload->>'method','') not in ('cash','pos','transfer') then raise exception 'Choose a payment method'; end if;
 customer:=(payload->>'customerId')::uuid; target:=(payload->>'saleId')::uuid;
 device:=(payload->>'deviceId')::uuid; occurred:=(payload->>'occurredAt')::timestamptz;
 if customer is null or device is null or occurred is null or not isfinite(occurred) then raise exception 'Customer, device and collection time required'; end if;
 if (scope='invoice' and target is null) or (scope='customer' and target is not null) then raise exception 'Payment scope does not match invoice selection'; end if;
 -- All receipts for a customer serialize here, including create_sale (migration 002).
 -- Future void/correction/allocation writers MUST take this same customer lock first.
 perform 1 from public.customers c where c.id=customer and c.business_id=actor.business_id for update;
 if not found then raise exception 'Customer unavailable' using errcode='42501'; end if;
 if scope='invoice' then
  perform 1 from public.sales s where s.id=target and s.customer_id=customer and s.business_id=actor.business_id;
  if not found then raise exception 'Invoice unavailable for this customer' using errcode='42501'; end if;
 end if;
 if abs(extract(epoch from now()-occurred))>600 then flags:=array_append(flags,'device_time_or_delayed_sync'); end if;
 if (occurred at time zone 'Africa/Lagos')::date<>(now() at time zone 'Africa/Lagos')::date then flags:=array_append(flags,'different_business_day'); end if;
 insert into public.payments(business_id,customer_id,amount_kobo,method,collected_by,device_id,occurred_at,business_date)
 values(actor.business_id,customer,paid,payload->>'method',actor.id,device,occurred,(occurred at time zone 'Africa/Lagos')::date)
 returning id into payment;
 for invoice in
  select s.* from public.sales s
  where s.business_id=actor.business_id and s.customer_id=customer and s.status='open'
   and (scope='customer' or s.id=target)
  order by s.business_date,s.created_at,s.id for update
 loop
  exit when remaining=0;
  select invoice.total_kobo-coalesce(sum(pa.amount_kobo),0) into balance
  from public.payment_allocations pa where pa.sale_id=invoice.id;
  if balance<=0 then continue; end if;
  allocated:=least(balance,remaining);
  insert into public.payment_allocations(payment_id,sale_id,amount_kobo) values(payment,invoice.id,allocated);
  allocations:=allocations||jsonb_build_array(jsonb_build_object('saleId',invoice.id,'invoiceNumber',invoice.invoice_number::text,'amountKobo',allocated::text,'balanceKobo',(balance-allocated)::text));
  remaining:=remaining-allocated;
 end loop;
 if remaining>0 then flags:=array_append(flags,'unapplied_receipt_requires_admin_review'); end if;
 update public.payments set review_flags=flags where id=payment;
 receipt:=jsonb_build_object('paymentId',payment,'customerId',customer,'scope',scope,'saleId',target,
  'amountKobo',paid::text,'allocatedKobo',(paid-remaining)::text,'unappliedKobo',remaining::text,
  'method',payload->>'method','collectedBy',actor.id,'collectedByName',actor.display_name,
  'occurredAt',occurred,'receivedAt',now(),'businessDate',(occurred at time zone 'Africa/Lagos')::date,
  'allocations',allocations,'reviewFlags',flags);
 insert into public.audit_events(business_id,actor_id,action,record_id,detail)
 values(actor.business_id,actor.id,'payment_recorded',payment,jsonb_build_object('operationId',operation_id,'receipt',receipt));
 insert into private.payment_operations values(actor.business_id,operation_id,actor.id,payload,receipt,now());
 return receipt;
end $$;
revoke all on function public.record_payment(uuid,jsonb) from public,anon;
grant execute on function public.record_payment(uuid,jsonb) to authenticated;
commit;
