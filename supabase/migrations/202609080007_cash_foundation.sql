begin;
create table public.cash_days (
 business_id uuid not null references public.businesses(id),business_date date not null,
 opening_kobo bigint check(opening_kobo>=0),opened_by uuid references public.profiles(id),opened_at timestamptz,
 primary key(business_id,business_date)
);
create table public.cash_outflows (
 id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id),
 kind text not null check(kind in ('expense','withdrawal')),amount_kobo bigint not null check(amount_kobo>0),
 method text not null check(method in ('cash','pos','transfer')),reason text not null check(length(trim(reason)) between 1 and 500),
 recorded_by uuid not null references public.profiles(id),device_id uuid not null,
 occurred_at timestamptz not null,created_at timestamptz not null default now(),business_date date not null,review_flags text[] not null default '{}'
);
create index cash_outflows_business_date on public.cash_outflows(business_id,business_date);
create table private.cash_operations (
 business_id uuid not null references public.businesses(id),operation_id uuid not null,actor_id uuid not null references public.profiles(id),
 payload jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(business_id,operation_id)
);
alter table public.cash_days enable row level security;
alter table public.cash_outflows enable row level security;
revoke all on public.cash_days,public.cash_outflows from public,anon,authenticated;
revoke all on private.cash_operations from public,anon,authenticated;
-- Reads go through scoped JSON RPCs to keep bigint amounts exact in every client.
create function public.record_cash_entry(operation_id uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.profiles%rowtype; prior private.cash_operations%rowtype; amount bigint; action text;
 occurred timestamptz; device uuid; day date; entry uuid; flags text[]:='{}'; receipt jsonb;
begin
 select * into actor from public.profiles where id=auth.uid() and active for share;
 if not found then raise exception 'Active account required' using errcode='42501'; end if;
 if operation_id is null or payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Invalid cash entry'; end if;
 perform pg_advisory_xact_lock(hashtextextended('cash:'||actor.business_id::text||operation_id::text,0));
 select * into prior from private.cash_operations o where o.business_id=actor.business_id and o.operation_id=record_cash_entry.operation_id;
 if found then
  if prior.actor_id<>actor.id or prior.payload<>payload then raise exception 'Entry ID belongs to another request'; end if;
  return prior.result;
 end if;
 action:=payload->>'action';
 if payload->>'version' is distinct from '1' or action is null or action not in ('opening','expense','withdrawal') then raise exception 'Unsupported cash entry'; end if;
 if coalesce(payload->>'amountKobo','') !~ '^(0|[1-9][0-9]{0,15})$' then raise exception 'Invalid amount'; end if;
 amount:=(payload->>'amountKobo')::bigint;
 occurred:=(payload->>'occurredAt')::timestamptz;device:=(payload->>'deviceId')::uuid;
 if occurred is null or not isfinite(occurred) or device is null then raise exception 'Recording time and device required'; end if;
 day:=(occurred at time zone 'Africa/Lagos')::date;
 if abs(extract(epoch from now()-occurred))>600 then flags:=array_append(flags,'device_time_or_delayed_sync'); end if;
 if day<>(now() at time zone 'Africa/Lagos')::date then flags:=array_append(flags,'different_business_day'); end if;
 if action='opening' then
  -- Opening is an online current-day operation. Same-ID retries are handled before this check.
  if day<>(now() at time zone 'Africa/Lagos')::date then raise exception 'Opening cash must be recorded for today'; end if;
  if payload->>'method' is distinct from 'cash' then raise exception 'Opening counts physical cash'; end if;
  insert into public.cash_days(business_id,business_date,opening_kobo,opened_by,opened_at)
  values(actor.business_id,day,amount,actor.id,now()) on conflict do nothing;
  if not found then raise exception 'Opening cash already recorded; ask admin to review instead of adding another opening'; end if;
  entry:=gen_random_uuid();
 else
  if amount<=0 or coalesce(payload->>'method','') not in ('cash','pos','transfer') then raise exception 'Positive amount and explicit payment method required'; end if;
  if length(trim(coalesce(payload->>'reason',''))) not between 1 and 500 then raise exception 'Reason required (up to 500 characters)'; end if;
  insert into public.cash_outflows(business_id,kind,amount_kobo,method,reason,recorded_by,device_id,occurred_at,business_date,review_flags)
  values(actor.business_id,action,amount,payload->>'method',trim(payload->>'reason'),actor.id,device,occurred,day,flags) returning id into entry;
 end if;
 receipt:=jsonb_build_object('entryId',entry,'action',action,'amountKobo',amount::text,'method',payload->>'method','reason',payload->>'reason',
  'businessDate',day,'recordedBy',actor.id,'recordedByName',actor.display_name,'occurredAt',occurred,'receivedAt',now(),'reviewFlags',flags);
 insert into public.audit_events(business_id,actor_id,action,record_id,detail)
 values(actor.business_id,actor.id,'cash_'||action||'_recorded',entry,jsonb_build_object('operationId',operation_id,'receipt',receipt));
 insert into private.cash_operations values(actor.business_id,operation_id,actor.id,payload,receipt,now());
 return receipt;
end $$;
revoke all on function public.record_cash_entry(uuid,jsonb) from public,anon;
grant execute on function public.record_cash_entry(uuid,jsonb) to authenticated;

create function public.cash_day_summary(target_date date,page_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare business uuid:=private.active_business(); result jsonb;
begin
 if business is null or target_date is null or (not coalesce(private.is_admin(),false) and target_date not between (now() at time zone 'Africa/Lagos')::date-6 and (now() at time zone 'Africa/Lagos')::date) then raise exception 'Date outside permitted history' using errcode='42501'; end if;
 if page_offset is null or page_offset<0 then raise exception 'Invalid page'; end if;
 with opening as (
  select d.opening_kobo,u.display_name,d.opened_at from public.cash_days d join public.profiles u on u.id=d.opened_by where d.business_id=business and d.business_date=target_date
 ), collected as (
  select coalesce(sum(amount_kobo) filter(where method='cash'),0) cash from public.payments where business_id=business and business_date=target_date
 ), outgoing as materialized (
  select o.*,p.display_name from public.cash_outflows o join public.profiles p on p.id=o.recorded_by where o.business_id=business and o.business_date=target_date
 ), sums as (
  select coalesce(sum(amount_kobo) filter(where method='cash' and kind='expense'),0) expenses,
   coalesce(sum(amount_kobo) filter(where method='cash' and kind='withdrawal'),0) withdrawals,
   coalesce(sum(amount_kobo) filter(where method='pos'),0) pos,
   coalesce(sum(amount_kobo) filter(where method='transfer'),0) transfers from outgoing
 ), page as (select * from outgoing order by occurred_at desc,id desc limit 20 offset page_offset)
 select jsonb_build_object('date',target_date,'openingKobo',(select opening_kobo::text from opening),'openedByName',(select display_name from opening),
  'cashReceivedKobo',collected.cash::text,'cashExpensesKobo',sums.expenses::text,'cashWithdrawalsKobo',sums.withdrawals::text,
  'posOutflowKobo',sums.pos::text,'transferOutflowKobo',sums.transfers::text,
  'expectedCashKobo',((select opening_kobo from opening)+collected.cash-sums.expenses-sums.withdrawals)::text,
  'hasMore',(select count(*)>page_offset+20 from outgoing),
  'entries',coalesce((select jsonb_agg(jsonb_build_object('entryId',id,'action',kind,'amountKobo',amount_kobo::text,'method',method,'reason',reason,
    'recordedByName',display_name,'businessDate',business_date,'occurredAt',occurred_at,'receivedAt',created_at,'reviewFlags',review_flags) order by occurred_at desc,id desc) from page),'[]'))
 into result from collected cross join sums;
 return result;
end $$;
revoke all on function public.cash_day_summary(date,integer) from public,anon;
grant execute on function public.cash_day_summary(date,integer) to authenticated;
commit;
