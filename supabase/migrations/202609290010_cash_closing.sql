begin;
-- Closing counts and admin finalization for the shared drawer (owner decisions, 29 September 2026):
-- staff and admin record counts and see the difference; anyone may recount before finalization and
-- the latest count is used; staff count today only, admin may backfill an earlier date (flagged).
-- Only admin finalizes (a saved snapshot) and reopens with a reason. Later activity for a finalized
-- date never rewrites the snapshot; it marks the day as needing review.
create table public.cash_counts (
 id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id),
 business_date date not null,counted_kobo bigint not null check(counted_kobo>=0),
 recorded_by uuid not null references public.profiles(id),device_id uuid not null,
 occurred_at timestamptz not null,created_at timestamptz not null default now(),review_flags text[] not null default '{}',
 -- Recording order. Writes for one drawer/day are serialized, so this is the order counts were saved,
 -- even when timestamps tie; "latest count" never depends on clock resolution or random IDs.
 sequence bigint generated always as identity unique
);
create index cash_counts_business_date on public.cash_counts(business_id,business_date,sequence desc);
create table public.cash_day_closes (
 id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id),
 business_date date not null,snapshot jsonb not null,note text check(note is null or length(note) between 1 and 500),
 finalized_by uuid not null references public.profiles(id),finalized_at timestamptz not null default now(),
 reopened_by uuid references public.profiles(id),reopened_at timestamptz,
 reopen_reason text check(reopen_reason is null or length(reopen_reason) between 1 and 500),
 check((reopened_at is null)=(reopened_by is null) and (reopened_at is null)=(reopen_reason is null))
);
-- At most one active (not reopened) close per drawer/day; reopened closes stay as history.
create unique index cash_day_closes_active on public.cash_day_closes(business_id,business_date) where reopened_at is null;
alter table public.cash_counts enable row level security;
alter table public.cash_day_closes enable row level security;
revoke all on public.cash_counts,public.cash_day_closes from public,anon,authenticated;

-- One definition of the drawer arithmetic, used by the live summary and by the finalized snapshot.
-- Row counts let a later reader detect entries added after finalization without trusting clocks:
-- payments and outflows are never deleted, so any increase is a late entry.
create function private.cash_day_figures(business uuid,target date) returns jsonb
language sql stable security definer set search_path='' as $$
 with opening as (
  select d.opening_kobo,u.display_name from public.cash_days d join public.profiles u on u.id=d.opened_by where d.business_id=business and d.business_date=target
 ), collected as (
  select coalesce(sum(amount_kobo) filter(where method='cash'),0) cash,count(*) receipts from public.payments where business_id=business and business_date=target
 ), outgoing as (
  select coalesce(sum(amount_kobo) filter(where method='cash' and kind='expense'),0) expenses,
   coalesce(sum(amount_kobo) filter(where method='cash' and kind='withdrawal'),0) withdrawals,
   coalesce(sum(amount_kobo) filter(where method='pos'),0) pos,
   coalesce(sum(amount_kobo) filter(where method='transfer'),0) transfers,count(*) entries
  from public.cash_outflows where business_id=business and business_date=target
 ), latest as (
  select c.id,c.counted_kobo,c.occurred_at,u.display_name from public.cash_counts c join public.profiles u on u.id=c.recorded_by
  where c.business_id=business and c.business_date=target order by c.sequence desc limit 1
 ), expected as (
  select (select opening_kobo from opening)+collected.cash-outgoing.expenses-outgoing.withdrawals v from collected cross join outgoing
 )
 select jsonb_build_object('openingKobo',(select opening_kobo::text from opening),'openedByName',(select display_name from opening),
  'cashReceivedKobo',collected.cash::text,'cashExpensesKobo',outgoing.expenses::text,'cashWithdrawalsKobo',outgoing.withdrawals::text,
  'posOutflowKobo',outgoing.pos::text,'transferOutflowKobo',outgoing.transfers::text,'expectedCashKobo',(select v::text from expected),
  'countedKobo',(select counted_kobo::text from latest),'countId',(select id from latest),'countedByName',(select display_name from latest),
  'countedAt',(select occurred_at from latest),'differenceKobo',((select counted_kobo from latest)-(select v from expected))::text,
  'receiptCount',collected.receipts,'outflowCount',outgoing.entries)
 from collected cross join outgoing
$$;
revoke all on function private.cash_day_figures(uuid,date) from public,anon,authenticated;

-- Replaces migration 007's writer: adds closing_count and serializes every drawer write for a date
-- with finalization. Existing opening/expense/withdrawal behaviour is unchanged, except that an
-- outflow for a finalized date is kept and flagged after_close.
create or replace function public.record_cash_entry(operation_id uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.profiles%rowtype; prior private.cash_operations%rowtype; amount bigint; action text;
 occurred timestamptz; device uuid; day date; today date:=(now() at time zone 'Africa/Lagos')::date;
 backfill boolean:=false; entry uuid; flags text[]:='{}'; receipt jsonb;
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
 if payload->>'version' is distinct from '1' or action is null or action not in ('opening','expense','withdrawal','closing_count') then raise exception 'Unsupported cash entry'; end if;
 if coalesce(payload->>'amountKobo','') !~ '^(0|[1-9][0-9]{0,15})$' then raise exception 'Invalid amount'; end if;
 amount:=(payload->>'amountKobo')::bigint;
 occurred:=(payload->>'occurredAt')::timestamptz;device:=(payload->>'deviceId')::uuid;
 if occurred is null or not isfinite(occurred) or device is null then raise exception 'Recording time and device required'; end if;
 day:=(occurred at time zone 'Africa/Lagos')::date;
 if action='closing_count' and payload->>'businessDate' is not null then
  day:=(payload->>'businessDate')::date;
  if day>today then raise exception 'Closing count cannot be for a future date'; end if;
  if day<today then
   if actor.role<>'admin' then raise exception 'Closing count must be recorded for today'; end if;
   backfill:=true;flags:=array_append(flags,'backfilled_count');
  end if;
 end if;
 if abs(extract(epoch from now()-occurred))>600 then flags:=array_append(flags,'device_time_or_delayed_sync'); end if;
 if day<>today and not backfill then flags:=array_append(flags,'different_business_day'); end if;
 perform pg_advisory_xact_lock(hashtextextended('cashday:'||actor.business_id::text||day::text,0));
 if action='opening' then
  -- Opening is an online current-day operation. Same-ID retries are handled before this check.
  if day<>today then raise exception 'Opening cash must be recorded for today'; end if;
  if payload->>'method' is distinct from 'cash' then raise exception 'Opening counts physical cash'; end if;
  insert into public.cash_days(business_id,business_date,opening_kobo,opened_by,opened_at)
  values(actor.business_id,day,amount,actor.id,now()) on conflict do nothing;
  if not found then raise exception 'Opening cash already recorded; ask admin to review instead of adding another opening'; end if;
  entry:=gen_random_uuid();
 elsif action='closing_count' then
  if day<>today and not backfill then raise exception 'Closing count must be recorded for today'; end if;
  if payload->>'method' is distinct from 'cash' then raise exception 'Closing counts physical cash'; end if;
  if exists(select 1 from public.cash_day_closes c where c.business_id=actor.business_id and c.business_date=day and c.reopened_at is null) then
   raise exception 'Cash day already finalized; ask admin to reopen it before recounting';
  end if;
  insert into public.cash_counts(business_id,business_date,counted_kobo,recorded_by,device_id,occurred_at,review_flags)
  values(actor.business_id,day,amount,actor.id,device,occurred,flags) returning id into entry;
 else
  if amount<=0 or coalesce(payload->>'method','') not in ('cash','pos','transfer') then raise exception 'Positive amount and explicit payment method required'; end if;
  if length(trim(coalesce(payload->>'reason',''))) not between 1 and 500 then raise exception 'Reason required (up to 500 characters)'; end if;
  if exists(select 1 from public.cash_day_closes c where c.business_id=actor.business_id and c.business_date=day and c.reopened_at is null) then
   flags:=array_append(flags,'after_close');
  end if;
  insert into public.cash_outflows(business_id,kind,amount_kobo,method,reason,recorded_by,device_id,occurred_at,business_date,review_flags)
  values(actor.business_id,action,amount,payload->>'method',trim(payload->>'reason'),actor.id,device,occurred,day,flags) returning id into entry;
 end if;
 receipt:=jsonb_build_object('entryId',entry,'action',action,'amountKobo',amount::text,'method',payload->>'method','reason',coalesce(payload->>'reason',''),
  'businessDate',day,'recordedBy',actor.id,'recordedByName',actor.display_name,'occurredAt',occurred,'receivedAt',now(),'reviewFlags',flags);
 insert into public.audit_events(business_id,actor_id,action,record_id,detail)
 values(actor.business_id,actor.id,'cash_'||action||'_recorded',entry,jsonb_build_object('operationId',operation_id,'receipt',receipt));
 insert into private.cash_operations values(actor.business_id,operation_id,actor.id,payload,receipt,now());
 return receipt;
end $$;

-- Replaces migration 008's wrapper only to give closing-count rejections specific wording.
create or replace function public.process_cash_entry(operation_id uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.profiles%rowtype; prior private.cash_operations%rowtype; result jsonb; failure text;
begin
 select * into actor from public.profiles where id=auth.uid() and active for share;
 if not found then raise exception 'Active account required' using errcode='42501'; end if;
 if operation_id is null or payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Invalid cash request';end if;
 perform pg_advisory_xact_lock(hashtextextended('cash:'||actor.business_id::text||operation_id::text,0));
 select * into prior from private.cash_operations o where o.business_id=actor.business_id and o.operation_id=process_cash_entry.operation_id;
 if found then
  if prior.actor_id<>actor.id or prior.payload<>payload then raise exception 'Entry ID belongs to another request';end if;
  return prior.result;
 end if;
 begin
  return public.record_cash_entry(operation_id,payload);
 exception when sqlstate 'P0001' or sqlstate '22P02' or sqlstate '22007' or sqlstate '22008' then
  get stacked diagnostics failure=message_text;
 end;
 result:=jsonb_build_object('status','rejected','operationId',operation_id,'message',
  case when failure like 'Opening cash already recorded%' then 'Opening cash is already recorded for this day. This extra opening was not recorded.'
       when failure='Opening cash must be recorded for today' then 'This opening is for a previous day and was not recorded. Ask admin to review the day.'
       when failure like 'Cash day already finalized%' then 'This day is already finalized, so the count was not recorded. Ask admin to reopen the day if a recount is needed.'
       when failure='Closing count must be recorded for today' then 'This closing count is for a previous day and was not recorded. Ask admin to record it for that day.'
       else 'This entry was not recorded because its details were rejected. Review the details with admin before making a new entry.' end,
  'resolvedAt',now());
 insert into private.cash_operations values(actor.business_id,operation_id,actor.id,payload,result,now());
 insert into public.audit_events(business_id,actor_id,action,record_id,detail)
 values(actor.business_id,actor.id,'cash_entry_rejected',operation_id,jsonb_build_object('result',result));
 return result;
end $$;

create function public.finalize_cash_day(target_date date,close_note text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.profiles%rowtype; figures jsonb; closing uuid; clean text:=nullif(trim(close_note),'');
begin
 select * into actor from public.profiles where id=auth.uid() and active for share;
 if not found or actor.role<>'admin' then raise exception 'Admin account required' using errcode='42501'; end if;
 if target_date is null or target_date>(now() at time zone 'Africa/Lagos')::date then raise exception 'Invalid business date'; end if;
 if length(clean)>500 then raise exception 'Note must be up to 500 characters'; end if;
 perform pg_advisory_xact_lock(hashtextextended('cashday:'||actor.business_id::text||target_date::text,0));
 if exists(select 1 from public.cash_day_closes c where c.business_id=actor.business_id and c.business_date=target_date and c.reopened_at is null) then
  raise exception 'Cash day already finalized';
 end if;
 figures:=private.cash_day_figures(actor.business_id,target_date);
 if figures->>'countedKobo' is null then raise exception 'Record a closing count before finalizing'; end if;
 if figures->>'openingKobo' is null and clean is null then raise exception 'Add a note explaining the missing opening count'; end if;
 insert into public.cash_day_closes(business_id,business_date,snapshot,note,finalized_by)
 values(actor.business_id,target_date,figures,clean,actor.id) returning id into closing;
 insert into public.audit_events(business_id,actor_id,action,record_id,detail)
 values(actor.business_id,actor.id,'cash_day_finalized',closing,jsonb_build_object('businessDate',target_date,'note',clean,'snapshot',figures));
 return jsonb_build_object('closeId',closing,'businessDate',target_date,'finalizedAt',now(),'finalizedByName',actor.display_name,'note',clean,'snapshot',figures);
end $$;

create function public.reopen_cash_day(target_date date,reason_text text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.profiles%rowtype; closing uuid; clean text:=nullif(trim(reason_text),'');
begin
 select * into actor from public.profiles where id=auth.uid() and active for share;
 if not found or actor.role<>'admin' then raise exception 'Admin account required' using errcode='42501'; end if;
 if clean is null or length(clean)>500 then raise exception 'Reason required (up to 500 characters)'; end if;
 perform pg_advisory_xact_lock(hashtextextended('cashday:'||actor.business_id::text||target_date::text,0));
 update public.cash_day_closes c set reopened_by=actor.id,reopened_at=now(),reopen_reason=clean
 where c.business_id=actor.business_id and c.business_date=target_date and c.reopened_at is null returning c.id into closing;
 if closing is null then raise exception 'Cash day is not finalized'; end if;
 insert into public.audit_events(business_id,actor_id,action,record_id,detail)
 values(actor.business_id,actor.id,'cash_day_reopened',closing,jsonb_build_object('businessDate',target_date,'reason',clean));
 return jsonb_build_object('closeId',closing,'businessDate',target_date,'reopenedAt',now(),'reopenedByName',actor.display_name,'reason',clean);
end $$;
revoke all on function public.finalize_cash_day(date,text),public.reopen_cash_day(date,text) from public,anon;
grant execute on function public.finalize_cash_day(date,text),public.reopen_cash_day(date,text) to authenticated;

-- Same signature and permission window as migration 007; adds counts, difference, finalization and review state.
create or replace function public.cash_day_summary(target_date date,page_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare business uuid:=private.active_business(); figures jsonb; closing public.cash_day_closes%rowtype; closer text;
 late bigint; change bigint; result jsonb;
begin
 if business is null or target_date is null or (not coalesce(private.is_admin(),false) and target_date not between (now() at time zone 'Africa/Lagos')::date-6 and (now() at time zone 'Africa/Lagos')::date) then raise exception 'Date outside permitted history' using errcode='42501'; end if;
 if page_offset is null or page_offset<0 then raise exception 'Invalid page'; end if;
 figures:=private.cash_day_figures(business,target_date);
 select c.* into closing from public.cash_day_closes c where c.business_id=business and c.business_date=target_date and c.reopened_at is null;
 if found then
  select display_name into closer from public.profiles where id=closing.finalized_by;
  late:=(figures->>'receiptCount')::bigint+(figures->>'outflowCount')::bigint-(closing.snapshot->>'receiptCount')::bigint-(closing.snapshot->>'outflowCount')::bigint;
  change:=(figures->>'expectedCashKobo')::bigint-(closing.snapshot->>'expectedCashKobo')::bigint;
 end if;
 with outgoing as materialized (
  select o.*,p.display_name from public.cash_outflows o join public.profiles p on p.id=o.recorded_by where o.business_id=business and o.business_date=target_date
 ), page as (select * from outgoing order by occurred_at desc,id desc limit 20 offset page_offset)
 select figures||jsonb_build_object('date',target_date,
  'hasMore',(select count(*)>page_offset+20 from outgoing),
  'entries',coalesce((select jsonb_agg(jsonb_build_object('entryId',id,'action',kind,'amountKobo',amount_kobo::text,'method',method,'reason',reason,
    'recordedByName',display_name,'businessDate',business_date,'occurredAt',occurred_at,'receivedAt',created_at,'reviewFlags',review_flags) order by occurred_at desc,id desc) from page),'[]'),
  'counts',coalesce((select jsonb_agg(jsonb_build_object('entryId',c.id,'amountKobo',c.counted_kobo::text,'recordedByName',u.display_name,
    'occurredAt',c.occurred_at,'receivedAt',c.created_at,'reviewFlags',c.review_flags) order by c.sequence desc)
    from public.cash_counts c join public.profiles u on u.id=c.recorded_by where c.business_id=business and c.business_date=target_date),'[]'),
  'close',case when closing.id is null then null else jsonb_build_object('closeId',closing.id,'finalizedAt',closing.finalized_at,'finalizedByName',closer,
    'note',closing.note,'snapshot',closing.snapshot,'lateEntryCount',late,'expectedChangeKobo',change::text,
    'needsReview',late>0 or coalesce(change,0)<>0) end,
  'reopenHistory',coalesce((select jsonb_agg(jsonb_build_object('closeId',c.id,'finalizedAt',c.finalized_at,'finalizedByName',f.display_name,
    'reopenedAt',c.reopened_at,'reopenedByName',r.display_name,'reason',c.reopen_reason) order by c.reopened_at desc)
    from public.cash_day_closes c join public.profiles f on f.id=c.finalized_by join public.profiles r on r.id=c.reopened_by
    where c.business_id=business and c.business_date=target_date and c.reopened_at is not null),'[]'))
 into result;
 return result;
end $$;
commit;
