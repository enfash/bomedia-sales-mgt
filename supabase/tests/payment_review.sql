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

select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ declare result jsonb; rejected boolean:=false; begin
 result:=public.payment_context('99000000-0000-0000-0000-000000000001');
 if result->>'balanceKobo'<>'300000' or jsonb_typeof(result->'balanceKobo')<>'string' then raise exception 'Review balance not exact text'; end if;
 if result#>>'{invoices,0,saleId}'<>'aa000000-0000-0000-0000-000000000001' then raise exception 'Old debt omitted'; end if;
 result:=public.payment_context('99000000-0000-0000-0000-000000000002','aa000000-0000-0000-0000-000000000002');
 if result->>'balanceKobo'<>'0' or jsonb_array_length(result->'invoices')<>0 then raise exception 'Paid invoice review wrong'; end if;
 begin perform public.payment_context('99000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000002');
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Unrelated invoice accepted'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ declare rejected boolean:=false; begin
 begin perform public.payment_context('99000000-0000-0000-0000-000000000001');
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Cross-business payment context allowed'; end if;
end $$;
reset role;
rollback;
select 'Payment review tests passed; all fixtures rolled back' as result;
