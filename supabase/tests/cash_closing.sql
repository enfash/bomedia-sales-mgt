begin;
-- Business A: staff S1, staff S2, admin A. Business B: staff for isolation.
insert into auth.users(id) values ('71000000-0000-0000-0000-000000000001'),('71000000-0000-0000-0000-000000000002'),('71000000-0000-0000-0000-000000000003'),('71000000-0000-0000-0000-000000000004');
insert into public.businesses(id,name) values ('81000000-0000-0000-0000-000000000001','Closing test A'),('81000000-0000-0000-0000-000000000002','Closing test B');
insert into public.profiles(id,business_id,display_name,role) values
 ('71000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','Staff One','staff'),
 ('71000000-0000-0000-0000-000000000002','81000000-0000-0000-0000-000000000001','Staff Two','staff'),
 ('71000000-0000-0000-0000-000000000003','81000000-0000-0000-0000-000000000001','Admin','admin'),
 ('71000000-0000-0000-0000-000000000004','81000000-0000-0000-0000-000000000002','Staff B','staff');
insert into public.customers(id,business_id,name,created_by) values ('91000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','Walk-in','71000000-0000-0000-0000-000000000001');
-- Today's cash receipt 250000 and a POS receipt that must not affect the drawer.
insert into public.payments(id,business_id,customer_id,amount_kobo,method,collected_by,device_id,occurred_at,business_date) values
 ('b1000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001',250000,'cash','71000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001',now(),(now() at time zone 'Africa/Lagos')::date),
 ('b1000000-0000-0000-0000-000000000002','81000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001',40000,'pos','71000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001',now(),(now() at time zone 'Africa/Lagos')::date);

-- Staff: count before opening, opening, expense, recount by a colleague, backfill refused, finalize refused.
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ declare p jsonb; r jsonb; rejected boolean; today date:=(now() at time zone 'Africa/Lagos')::date; begin
 p:=jsonb_build_object('version',1,'action','closing_count','amountKobo','5000','method','cash','reason','','deviceId','51000000-0000-0000-0000-000000000001','occurredAt',now());
 r:=public.record_cash_entry('c1000000-0000-0000-0000-000000000001',p);
 if r->>'action'<>'closing_count' or r->>'businessDate'<>today::text then raise exception 'Count receipt wrong: %',r; end if;
 r:=public.cash_day_summary(today);
 if r->>'countedKobo'<>'5000' or r->>'differenceKobo' is not null or r->>'expectedCashKobo' is not null then raise exception 'Count without opening must have no difference: %',r; end if;
 perform public.record_cash_entry('c1000000-0000-0000-0000-000000000002',p||'{"action":"opening","amountKobo":"100000"}');
 perform public.record_cash_entry('c1000000-0000-0000-0000-000000000003',p||'{"action":"expense","amountKobo":"30000","reason":"Ink"}');
 -- Expected = 100000 + 250000 - 30000 = 320000. Latest count 5000 → difference -315000.
 r:=public.cash_day_summary(today);
 if r->>'expectedCashKobo'<>'320000' or r->>'differenceKobo'<>'-315000' then raise exception 'Difference wrong: %',r; end if;
 rejected:=false;begin perform public.record_cash_entry('c1000000-0000-0000-0000-000000000004',p||jsonb_build_object('businessDate',today-1));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Staff backfill allowed'; end if;
 rejected:=false;begin perform public.record_cash_entry('c1000000-0000-0000-0000-000000000004',p||'{"method":"pos"}');exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Non-cash count allowed'; end if;
 rejected:=false;begin perform public.finalize_cash_day(today,null);exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Staff finalize allowed'; end if;
 rejected:=false;begin perform public.reopen_cash_day(today,'x');exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Staff reopen allowed'; end if;
 rejected:=false;begin insert into public.cash_counts(business_id,business_date,counted_kobo,recorded_by,device_id,occurred_at) values('81000000-0000-0000-0000-000000000001',today,1,'71000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001',now());exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Direct count insert allowed'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ declare r jsonb; today date:=(now() at time zone 'Africa/Lagos')::date; begin
 perform public.record_cash_entry('c2000000-0000-0000-0000-000000000001',jsonb_build_object('version',1,'action','closing_count','amountKobo','319500','method','cash','reason','','deviceId','51000000-0000-0000-0000-000000000002','occurredAt',now()));
 r:=public.cash_day_summary(today);
 if r->>'countedKobo'<>'319500' or r->>'countedByName'<>'Staff Two' or r->>'differenceKobo'<>'-500' or jsonb_array_length(r->'counts')<>2 then raise exception 'Recount not latest: %',r; end if;
 if r->'close'<>'null'::jsonb then raise exception 'Unexpected close: %',r; end if;
end $$;
reset role;

-- Admin: backfill, finalize rules, snapshot, late entry review, recount lock, reopen, refinalize.
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000003',true);
set local role authenticated;
do $$ declare p jsonb; r jsonb; f jsonb; rejected boolean; today date:=(now() at time zone 'Africa/Lagos')::date; begin
 p:=jsonb_build_object('version',1,'action','closing_count','amountKobo','7000','method','cash','reason','','deviceId','51000000-0000-0000-0000-000000000003','occurredAt',now());
 rejected:=false;begin perform public.record_cash_entry('c3000000-0000-0000-0000-000000000001',p||jsonb_build_object('businessDate',today+1));exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Future count allowed'; end if;
 r:=public.record_cash_entry('c3000000-0000-0000-0000-000000000002',p||jsonb_build_object('businessDate',today-3));
 if r->>'businessDate'<>(today-3)::text or not (r->'reviewFlags' ? 'backfilled_count') then raise exception 'Backfill not flagged: %',r; end if;
 rejected:=false;begin perform public.finalize_cash_day(today-4,'nothing');exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Finalize without count allowed'; end if;
 rejected:=false;begin perform public.finalize_cash_day(today-3,' ');exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Finalize without opening and without note allowed'; end if;
 f:=public.finalize_cash_day(today-3,'Opening was not recorded that day');
 if f#>>'{snapshot,countedKobo}'<>'7000' or f#>>'{snapshot,expectedCashKobo}' is not null then raise exception 'Backfilled close wrong: %',f; end if;

 f:=public.finalize_cash_day(today,null);
 if f#>>'{snapshot,expectedCashKobo}'<>'320000' or f#>>'{snapshot,differenceKobo}'<>'-500' or f->>'finalizedByName'<>'Admin' then raise exception 'Snapshot wrong: %',f; end if;
 rejected:=false;begin perform public.finalize_cash_day(today,null);exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Double finalize allowed'; end if;
 r:=public.cash_day_summary(today);
 if (r#>>'{close,needsReview}')::boolean or (r#>>'{close,lateEntryCount}')::int<>0 then raise exception 'Fresh close flagged: %',r; end if;
 -- A recount after finalization is refused; the wrapper records a terminal, specific rejection.
 rejected:=false;begin perform public.record_cash_entry('c3000000-0000-0000-0000-000000000003',p);exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Count after finalize allowed'; end if;
 r:=public.process_cash_entry('c3000000-0000-0000-0000-000000000003',p);
 if r->>'status'<>'rejected' or r->>'message' not like 'This day is already finalized%' then raise exception 'Rejection wording wrong: %',r; end if;
 -- A late cash expense is kept, flagged, and the saved close is marked for review without changing its snapshot.
 r:=public.record_cash_entry('c3000000-0000-0000-0000-000000000004',p||'{"action":"expense","amountKobo":"1500","reason":"Late fuel"}');
 if not (r->'reviewFlags' ? 'after_close') then raise exception 'Late outflow not flagged: %',r; end if;
 r:=public.cash_day_summary(today);
 if not (r#>>'{close,needsReview}')::boolean or (r#>>'{close,lateEntryCount}')::int<>1 or r#>>'{close,expectedChangeKobo}'<>'-1500'
  or r#>>'{close,snapshot,expectedCashKobo}'<>'320000' or r->>'expectedCashKobo'<>'318500' then raise exception 'Late review wrong: %',r; end if;
 rejected:=false;begin perform public.reopen_cash_day(today,'  ');exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Reopen without reason allowed'; end if;
 perform public.reopen_cash_day(today,'Late fuel receipt');
 rejected:=false;begin perform public.reopen_cash_day(today,'again');exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Reopen of open day allowed'; end if;
 perform public.record_cash_entry('c3000000-0000-0000-0000-000000000005',p||'{"amountKobo":"318000"}');
 f:=public.finalize_cash_day(today,'Recounted after late fuel');
 r:=public.cash_day_summary(today);
 if r#>>'{close,snapshot,differenceKobo}'<>'-500' or (r#>>'{close,needsReview}')::boolean or jsonb_array_length(r->'reopenHistory')<>1
  or r#>>'{reopenHistory,0,reason}'<>'Late fuel receipt' or r#>>'{reopenHistory,0,reopenedByName}'<>'Admin' then raise exception 'Refinalize/history wrong: %',r; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.cash_day_closes where business_id='81000000-0000-0000-0000-000000000001')<>3 then raise exception 'Close history not retained'; end if;
 if (select count(*) from public.audit_events where business_id='81000000-0000-0000-0000-000000000001' and action in ('cash_day_finalized','cash_day_reopened'))<>4 then raise exception 'Finalization audit missing'; end if;
end $$;
-- A late POS receipt synced after finalization also marks the day for review.
insert into public.payments(business_id,customer_id,amount_kobo,method,collected_by,device_id,occurred_at,business_date) values
 ('81000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001',1000,'pos','71000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001',now(),(now() at time zone 'Africa/Lagos')::date);
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.cash_day_summary((now() at time zone 'Africa/Lagos')::date);
 if not (r#>>'{close,needsReview}')::boolean or (r#>>'{close,lateEntryCount}')::int<>1 or r#>>'{close,expectedChangeKobo}'<>'0' then raise exception 'Late POS not surfaced to staff: %',r; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000004',true);
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.cash_day_summary((now() at time zone 'Africa/Lagos')::date);
 if r->>'countedKobo' is not null or jsonb_array_length(r->'counts')<>0 or r->'close'<>'null'::jsonb then raise exception 'Business leak: %',r; end if;
end $$;
reset role;
rollback;
select 'Cash closing tests passed; fixtures rolled back' as result;
