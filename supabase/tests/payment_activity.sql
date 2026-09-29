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
do $$ declare r jsonb; rejected boolean:=false; begin
 r:=public.payment_activity((now() at time zone 'Africa/Lagos')::date);
 if r->>'count'<>'2' or r->>'cashKobo'<>'600001' or r->>'posKobo'<>'30000' or r->>'transferKobo'<>'0' then raise exception 'Receipt joins duplicated collections or totals wrong: %',r; end if;
 if r->>'unappliedKobo'<>'430001' then raise exception 'Unapplied total wrong'; end if;
 if r#>>'{receipts,1,collectedByName}'<>'Another collector' or jsonb_array_length(r#>'{receipts,1,allocations}')<>2 then raise exception 'Shared collector/old-debt allocations absent'; end if;
 begin perform public.payment_activity((now() at time zone 'Africa/Lagos')::date-10); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Staff accessed old collection date'; end if;
 rejected:=false;
 begin perform public.payment_activity(null,true); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Staff accessed all-time admin queue'; end if;
end $$;
reset role;
update public.profiles set role='admin' where id='77000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.payment_activity(null,true);
 if r->>'count'<>'2' or r->>'unappliedKobo'<>'430001' then raise exception 'Admin unapplied queue wrong'; end if;
 r:=public.payment_activity((now() at time zone 'Africa/Lagos')::date-10);
 if r->>'count'<>'1' then raise exception 'Admin historical collection unavailable'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.payment_activity((now() at time zone 'Africa/Lagos')::date);
 if r->>'count'<>'0' or r->>'cashKobo'<>'0' or jsonb_array_length(r->'receipts')<>0 then raise exception 'Cross-business receipt leak'; end if;
end $$;
reset role;
rollback;
select 'Shared payment activity tests passed; all fixtures rolled back' as result;
