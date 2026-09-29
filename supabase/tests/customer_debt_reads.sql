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
do $$
declare outstanding record; totals record; balances record; direct_count integer;
begin
 select * into direct_count from public.sales where id='aa000000-0000-0000-0000-000000000001';
 if found then raise exception 'Staff read an old sale row directly outside the seven-day window'; end if;

 select * into outstanding from public.customer_outstanding_sales('99000000-0000-0000-0000-000000000001') limit 1;
 if not found then raise exception 'Scoped customer-debt read found no outstanding invoice'; end if;
 if outstanding.balance_kobo<>300000 then raise exception 'Outstanding balance miscalculated: got %', outstanding.balance_kobo; end if;

 if exists(select 1 from public.customer_outstanding_sales('99000000-0000-0000-0000-000000000002')) then
  raise exception 'Fully paid invoice was reported as outstanding debt';
 end if;

 select * into totals from public.customer_debt_totals();
 if totals.customer_count<>2 then raise exception 'Customer count wrong: got %', totals.customer_count; end if;
 if totals.total_debt_kobo<>300000 then raise exception 'Total debt wrong: got %', totals.total_debt_kobo; end if;

 select * into balances from public.customer_balances(null,'name',20,0) where customer_id='99000000-0000-0000-0000-000000000001';
 if balances.balance_kobo<>300000 then raise exception 'Customer balance list wrong: got %', balances.balance_kobo; end if;
 if not exists(select 1 from public.customer_balances('old debtor','name',20,0)) then raise exception 'Search by name found no match'; end if;
 if exists(select 1 from public.customer_balances('nonexistent-name-xyz','name',20,0)) then raise exception 'Search returned an unrelated match'; end if;
end $$;
reset role;

-- Cross-business isolation: another business's staff gets nothing for this customer_id.
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ declare totals record; begin
 if exists(select 1 from public.customer_outstanding_sales('99000000-0000-0000-0000-000000000001')) then
  raise exception 'Cross-business customer-debt read allowed';
 end if;
 select * into totals from public.customer_debt_totals();
 if totals.customer_count<>0 or totals.total_debt_kobo<>0 then raise exception 'Cross-business totals leaked data'; end if;
end $$;
reset role;
rollback;
select 'Customer-debt scoped read tests passed; all test data rolled back' as result;
