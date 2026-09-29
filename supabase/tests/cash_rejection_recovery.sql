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
do $$ declare p jsonb; r jsonb; original jsonb; rejected boolean; begin
 p:=jsonb_build_object('version',1,'action','opening','amountKobo','0','method','cash','reason','','deviceId','55000000-0000-0000-0000-000000000009','occurredAt',now());
 original:=public.record_cash_entry('dd000000-0000-0000-0000-000000000001',p);
 if public.process_cash_entry('dd000000-0000-0000-0000-000000000001',p)<>original then raise exception 'Committed receipt was not recovered';end if;
 r:=public.process_cash_entry('dd000000-0000-0000-0000-000000000002',p);
 if r->>'status'<>'rejected' or r->>'operationId'<>'dd000000-0000-0000-0000-000000000002' then raise exception 'Duplicate opening not resolved';end if;
 if public.process_cash_entry('dd000000-0000-0000-0000-000000000002',p)<>r or public.record_cash_entry('dd000000-0000-0000-0000-000000000002',p)<>r then raise exception 'Terminal result changed on old/new writer retry';end if;
 rejected:=false;begin perform public.process_cash_entry('dd000000-0000-0000-0000-000000000002',p||'{"amountKobo":"100"}');exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Resolved ID allowed changed payload';end if;
 perform public.process_cash_entry('dd000000-0000-0000-0000-000000000003',p||'{"action":"expense","amountKobo":"111","reason":"Supplies"}');
 if public.cash_day_summary((now() at time zone 'Africa/Lagos')::date)->>'cashExpensesKobo'<>'111' then raise exception 'New valid entry failed after rejection';end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from private.cash_operations)<>3 or (select count(*) from public.cash_days)<>1 or (select count(*) from public.cash_outflows)<>1 then raise exception 'Unexpected financial writes';end if;
 if (select count(*) from public.audit_events where action='cash_entry_rejected')<>1 then raise exception 'Rejection audit duplicated';end if;
end $$;
-- Same business, different actor cannot claim a saved request.
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-000000000003',true);
set local role authenticated;
do $$ declare p jsonb; rejected boolean:=false; begin
 p:=jsonb_build_object('version',1,'action','opening','amountKobo','0','method','cash','reason','','deviceId','55000000-0000-0000-0000-000000000009','occurredAt',now());
 begin perform public.process_cash_entry('dd000000-0000-0000-0000-000000000002',p);exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Different actor claimed rejection';end if;
end $$;
reset role;
-- Unexpected backend failure must not become a definitive rejection.
create function public.cash_test_failure() returns trigger language plpgsql as $$ begin raise exception 'Backend unavailable' using errcode='XX000';end $$;
create trigger cash_test_failure before insert on public.cash_outflows for each row execute function public.cash_test_failure();
set local role authenticated;
do $$ declare rejected boolean:=false;begin
 begin perform public.process_cash_entry('dd000000-0000-0000-0000-000000000004',jsonb_build_object('version',1,'action','expense','amountKobo','100','method','cash','reason','Supplies','deviceId','55000000-0000-0000-0000-000000000009','occurredAt',now()));exception when internal_error then rejected:=true;end;
 if not rejected then raise exception 'Unexpected error swallowed';end if;
end $$;
reset role;
do $$ begin if exists(select 1 from private.cash_operations where operation_id='dd000000-0000-0000-0000-000000000004') then raise exception 'Unknown failure was finalized';end if;end $$;
set local role anon;
do $$ declare rejected boolean:=false;begin
 begin perform public.process_cash_entry(gen_random_uuid(),'{}');exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Anonymous execution allowed';end if;
end $$;
reset role;
rollback;
select 'Cash rejection recovery tests passed; fixtures rolled back' as result;
