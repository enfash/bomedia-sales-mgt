begin;
insert into auth.users(id) values ('72000000-0000-0000-0000-000000000001'),('72000000-0000-0000-0000-000000000002'),('72000000-0000-0000-0000-000000000003');
insert into public.businesses(id,name) values ('82000000-0000-0000-0000-000000000001','Day states A'),('82000000-0000-0000-0000-000000000002','Day states B');
insert into public.profiles(id,business_id,display_name,role) values
 ('72000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000001','Staff','staff'),
 ('72000000-0000-0000-0000-000000000002','82000000-0000-0000-0000-000000000001','Admin','admin'),
 ('72000000-0000-0000-0000-000000000003','82000000-0000-0000-0000-000000000002','Other staff','staff');
-- today: open (opening only); today-1: finalized; today-2: finalized then a late cash expense (review); today-3: none;
-- today-9: finalized (admin-only history).
do $$ declare b uuid:='82000000-0000-0000-0000-000000000001'; a uuid:='72000000-0000-0000-0000-000000000002';
 dev uuid:='52000000-0000-0000-0000-000000000001'; today date:=(now() at time zone 'Africa/Lagos')::date; d date; begin
 insert into public.cash_days(business_id,business_date,opening_kobo,opened_by,opened_at) values(b,today,1000,a,now());
 foreach d in array array[today-1,today-2,today-9] loop
  insert into public.cash_days(business_id,business_date,opening_kobo,opened_by,opened_at) values(b,d,1000,a,now());
  insert into public.cash_counts(business_id,business_date,counted_kobo,recorded_by,device_id,occurred_at) values(b,d,1000,a,dev,now());
  insert into public.cash_day_closes(business_id,business_date,snapshot,finalized_by) values(b,d,private.cash_day_figures(b,d),a);
 end loop;
 insert into public.cash_outflows(business_id,kind,amount_kobo,method,reason,recorded_by,device_id,occurred_at,business_date)
 values(b,'expense',200,'cash','Late',a,dev,now(),today-2);
end $$;
select set_config('request.jwt.claim.sub','72000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ declare r jsonb; today date:=(now() at time zone 'Africa/Lagos')::date; rejected boolean; begin
 r:=public.cash_day_states(today+5,31);
 if jsonb_array_length(r)<>7 or r#>>'{6,date}'<>today::text or r#>>'{0,date}'<>(today-6)::text then raise exception 'Staff window/clamp wrong: %',r; end if;
 if r#>>'{6,state}'<>'open' or r#>>'{5,state}'<>'final' or r#>>'{4,state}'<>'review' or r#>>'{3,state}'<>'none' then raise exception 'States wrong: %',r; end if;
 rejected:=false;begin perform public.cash_day_states(today,32);exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Oversized range allowed'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','72000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ declare r jsonb; today date:=(now() at time zone 'Africa/Lagos')::date; begin
 r:=public.cash_day_states(today-3,7);
 if jsonb_array_length(r)<>7 or r#>>'{0,date}'<>(today-9)::text or r#>>'{0,state}'<>'final' or r#>>'{6,state}'<>'none' then raise exception 'Admin history wrong: %',r; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','72000000-0000-0000-0000-000000000003',true);
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.cash_day_states((now() at time zone 'Africa/Lagos')::date,7);
 if exists(select 1 from jsonb_array_elements(r) e where e->>'state'<>'none') then raise exception 'Business leak: %',r; end if;
end $$;
reset role;
rollback;
select 'Cash day state tests passed; fixtures rolled back' as result;
