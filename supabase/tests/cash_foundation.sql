begin;
insert into auth.users(id) values ('77000000-0000-0000-0000-000000000001'),('77000000-0000-0000-0000-000000000002');
insert into public.businesses(id,name) values ('88000000-0000-0000-0000-000000000001','Debt reads test A'),('88000000-0000-0000-0000-000000000002','Debt reads test B');
insert into public.profiles(id,business_id,display_name,role) values ('77000000-0000-0000-0000-000000000001','88000000-0000-0000-0000-000000000001','Staff A','staff'),('77000000-0000-0000-0000-000000000002','88000000-0000-0000-0000-000000000002','Staff B','staff');
insert into public.customers(id,business_id,name,phone,created_by) values ('99000000-0000-0000-0000-000000000001','88000000-0000-0000-0000-000000000001','Old debtor','08000000001','77000000-0000-0000-0000-000000000001'),('99000000-0000-0000-0000-000000000002','88000000-0000-0000-0000-000000000001','Paid up','08000000002','77000000-0000-0000-0000-000000000001');
-- Old, outstanding sale (30 days ago, well outside the seven-day staff window).
insert into public.sales(id,business_id,customer_id,customer_name,customer_phone,created_by,device_id,occurred_at,created_at,business_date,subtotal_kobo,adjustment_kobo,total_kobo,rules_version)
values ('aa000000-0000-0000-0000-000000000001','88000000-0000-0000-0000-000000000001','99000000-0000-0000-0000-000000000001','Old debtor','08000000001','77000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000009',now()-interval '30 days',now()-interval '30 days',(now()-interval '30 days')::date,500000,0,500000,1);
-- Old sale for the other customer, fully paid, so it must not appear as debt.
insert into public.sales(id,business_id,customer_id,customer_name,customer_phone,created_by,device_id,occurred_at,created_at,business_date,subtotal_kobo,adjustment_kobo,total_kobo,rules_version)
values ('aa000000-0000-0000-0000-000000000002','88000000-0000-0000-0000-000000000001','99000000-0000-0000-0000-000000000002','Paid up','08000000002','77000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000009',now()-interval '10 days',now()-interval '10 days',(now()-interval '10 days')::date,200000,0,200000,1);
insert into public.payments(id,business_id,customer_id,amount_kobo,method,collected_by,device_id,occurred_at,business_date)
values ('bb000000-0000-0000-0000-000000000001','88000000-0000-0000-0000-000000000001','99000000-0000-0000-0000-000000000002',200000,'cash','77000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000009',now()-interval '10 days',(now()-interval '10 days')::date);
insert into public.payment_allocations(payment_id,sale_id,amount_kobo) values ('bb000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000002',200000);
-- A partial payment against the old debt: 200000 of 500000 collected, 300000 outstanding.
insert into public.payments(id,business_id,customer_id,amount_kobo,method,collected_by,device_id,occurred_at,business_date)
values ('bb000000-0000-0000-0000-000000000002','88000000-0000-0000-0000-000000000001','99000000-0000-0000-0000-000000000001',200000,'cash','77000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000009',now()-interval '5 days',(now()-interval '5 days')::date);
insert into public.payment_allocations(payment_id,sale_id,amount_kobo) values ('bb000000-0000-0000-0000-000000000002','aa000000-0000-0000-0000-000000000001',200000);

insert into auth.users(id) values('77000000-0000-0000-0000-000000000003');
insert into public.profiles(id,business_id,display_name,role) values('77000000-0000-0000-0000-000000000003','88000000-0000-0000-0000-000000000001','Another collector','staff');
insert into public.sales(id,business_id,customer_id,customer_name,created_by,device_id,occurred_at,business_date,subtotal_kobo,adjustment_kobo,total_kobo,rules_version)
select 'aa000000-0000-0000-0000-000000000003',business_id,customer_id,customer_name,created_by,device_id,now(),(now() at time zone 'Africa/Lagos')::date,200000,0,200000,1 from public.sales where id='aa000000-0000-0000-0000-000000000001';
insert into public.payments(id,business_id,customer_id,amount_kobo,method,collected_by,device_id,occurred_at,business_date) values
('bb000000-0000-0000-0000-000000000003','88000000-0000-0000-0000-000000000001','99000000-0000-0000-0000-000000000001',600001,'cash','77000000-0000-0000-0000-000000000003','55000000-0000-0000-0000-000000000009',now(),(now() at time zone 'Africa/Lagos')::date),
('bb000000-0000-0000-0000-000000000004','88000000-0000-0000-0000-000000000001','99000000-0000-0000-0000-000000000001',30000,'pos','77000000-0000-0000-0000-000000000001','55000000-0000-0000-0000-000000000009',now(),(now() at time zone 'Africa/Lagos')::date);
insert into public.payment_allocations values
('bb000000-0000-0000-0000-000000000003','aa000000-0000-0000-0000-000000000001',100000),
('bb000000-0000-0000-0000-000000000003','aa000000-0000-0000-0000-000000000003',100000);

select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ declare p jsonb; r jsonb; original jsonb; rejected boolean; today date:=(now() at time zone 'Africa/Lagos')::date; begin
 r:=public.cash_day_summary(today);
 if r->>'expectedCashKobo' is not null or r->>'cashReceivedKobo'<>'600001' then raise exception 'Missing opening / receipt aggregation wrong: %',r; end if;
 p:=jsonb_build_object('version',1,'action','opening','amountKobo','100000','method','cash','reason','','deviceId','55000000-0000-0000-0000-000000000009','occurredAt',now());
 original:=public.record_cash_entry('cc000000-0000-0000-0000-000000000001',p);
 if public.record_cash_entry('cc000000-0000-0000-0000-000000000001',p)<>original then raise exception 'Retry receipt changed'; end if;
 rejected:=false;begin perform public.record_cash_entry('cc000000-0000-0000-0000-000000000002',p);exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Duplicate opening allowed';end if;
 rejected:=false;begin perform public.record_cash_entry('cc000000-0000-0000-0000-000000000001',p||'{"amountKobo":"200000"}');exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Changed retry allowed';end if;
 p:=p||'{"action":"expense","amountKobo":"10001","reason":"Supplies"}';
 perform public.record_cash_entry('cc000000-0000-0000-0000-000000000003',p);
 perform public.record_cash_entry('cc000000-0000-0000-0000-000000000004',p||'{"action":"withdrawal","amountKobo":"20000"}');
 perform public.record_cash_entry('cc000000-0000-0000-0000-000000000005',p||'{"method":"pos","amountKobo":"111"}');
 perform public.record_cash_entry('cc000000-0000-0000-0000-000000000006',p||'{"method":"transfer","amountKobo":"222"}');
 r:=public.cash_day_summary(today);
 if r->>'expectedCashKobo'<>'670000' or r->>'posOutflowKobo'<>'111' or r->>'transferOutflowKobo'<>'222' or jsonb_array_length(r->'entries')<>4 then raise exception 'Drawer totals wrong: %',r;end if;
 if r#>>'{entries,0,recordedByName}'<>'Staff A' then raise exception 'Actor missing';end if;
 rejected:=false;begin perform public.record_cash_entry('cc000000-0000-0000-0000-000000000007',p||'{"method":null}');exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Missing method allowed';end if;
 rejected:=false;begin perform public.record_cash_entry('cc000000-0000-0000-0000-000000000007',p||'{"amountKobo":"0"}');exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Zero outflow allowed';end if;
 rejected:=false;begin perform public.record_cash_entry('cc000000-0000-0000-0000-000000000007',p||'{"reason":" "}');exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Empty reason allowed';end if;
 rejected:=false;begin perform public.cash_day_summary(today-7);exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Old staff history allowed';end if;
 rejected:=false;begin delete from public.cash_outflows;exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Direct ledger modification allowed';end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from private.cash_operations)<>5 or (select count(*) from public.audit_events where action like 'cash_%')<>5 then raise exception 'Failed operations left partial data / duplicate audit';end if;
end $$;
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.cash_day_summary((now() at time zone 'Africa/Lagos')::date);
 if r->>'openingKobo' is not null or r->>'cashReceivedKobo'<>'0' or jsonb_array_length(r->'entries')<>0 then raise exception 'Business leak';end if;
end $$;
reset role;
rollback;
select 'Cash foundation tests passed; fixtures rolled back' as result;
