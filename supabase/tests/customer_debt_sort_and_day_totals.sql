begin;
-- Business A with a staff and an admin; Business B staff for cross-business isolation.
insert into auth.users(id) values
 ('77000000-0000-0000-0000-0000000000a1'),
 ('77000000-0000-0000-0000-0000000000a2'),
 ('77000000-0000-0000-0000-0000000000b1');
insert into public.businesses(id,name) values
 ('88000000-0000-0000-0000-0000000000a0','Sort test A'),
 ('88000000-0000-0000-0000-0000000000b0','Sort test B');
insert into public.profiles(id,business_id,display_name,role) values
 ('77000000-0000-0000-0000-0000000000a1','88000000-0000-0000-0000-0000000000a0','Staff A','staff'),
 ('77000000-0000-0000-0000-0000000000a2','88000000-0000-0000-0000-0000000000a0','Admin A','admin'),
 ('77000000-0000-0000-0000-0000000000b1','88000000-0000-0000-0000-0000000000b0','Staff B','staff');

-- Four customers: C1 two open debts (oldest today-2), C3 one (today-1), C2 fully paid,
-- C4 one debt on an out-of-window day (today-30).
insert into public.customers(id,business_id,name,phone,created_by) values
 ('99000000-0000-0000-0000-0000000000c1','88000000-0000-0000-0000-0000000000a0','Alpha debtor','08000000001','77000000-0000-0000-0000-0000000000a1'),
 ('99000000-0000-0000-0000-0000000000c2','88000000-0000-0000-0000-0000000000a0','Zeta paid','08000000002','77000000-0000-0000-0000-0000000000a1'),
 ('99000000-0000-0000-0000-0000000000c3','88000000-0000-0000-0000-0000000000a0','Mid debtor','08000000003','77000000-0000-0000-0000-0000000000a1'),
 ('99000000-0000-0000-0000-0000000000c4','88000000-0000-0000-0000-0000000000a0','Ancient debtor','08000000004','77000000-0000-0000-0000-0000000000a1');

-- S1: C1, total 500000 on today-2, partial payment 200000 -> balance 300000.
insert into public.sales(id,business_id,customer_id,customer_name,customer_phone,created_by,device_id,occurred_at,created_at,business_date,subtotal_kobo,adjustment_kobo,total_kobo,rules_version)
values ('aa000000-0000-0000-0000-0000000000e1','88000000-0000-0000-0000-0000000000a0','99000000-0000-0000-0000-0000000000c1','Alpha debtor','08000000001','77000000-0000-0000-0000-0000000000a1','55000000-0000-0000-0000-000000000009',now(),now(),(now() at time zone 'Africa/Lagos')::date-2,500000,0,500000,1);
insert into public.payments(id,business_id,customer_id,amount_kobo,method,collected_by,device_id,occurred_at,business_date)
values ('bb000000-0000-0000-0000-0000000000f1','88000000-0000-0000-0000-0000000000a0','99000000-0000-0000-0000-0000000000c1',200000,'cash','77000000-0000-0000-0000-0000000000a1','55000000-0000-0000-0000-000000000009',now(),(now() at time zone 'Africa/Lagos')::date-2);
insert into public.payment_allocations(payment_id,sale_id,amount_kobo) values ('bb000000-0000-0000-0000-0000000000f1','aa000000-0000-0000-0000-0000000000e1',200000);

-- S2: C1, total 300000 today, unpaid -> balance 300000. C1 open_count=2, oldest today-2, balance 600000.
insert into public.sales(id,business_id,customer_id,customer_name,customer_phone,created_by,device_id,occurred_at,created_at,business_date,subtotal_kobo,adjustment_kobo,total_kobo,rules_version)
values ('aa000000-0000-0000-0000-0000000000e2','88000000-0000-0000-0000-0000000000a0','99000000-0000-0000-0000-0000000000c1','Alpha debtor','08000000001','77000000-0000-0000-0000-0000000000a1','55000000-0000-0000-0000-000000000009',now(),now(),(now() at time zone 'Africa/Lagos')::date,300000,0,300000,1);

-- S3: C2, total 200000 today, fully paid -> balance 0, open_count 0.
insert into public.sales(id,business_id,customer_id,customer_name,customer_phone,created_by,device_id,occurred_at,created_at,business_date,subtotal_kobo,adjustment_kobo,total_kobo,rules_version)
values ('aa000000-0000-0000-0000-0000000000e3','88000000-0000-0000-0000-0000000000a0','99000000-0000-0000-0000-0000000000c2','Zeta paid','08000000002','77000000-0000-0000-0000-0000000000a1','55000000-0000-0000-0000-000000000009',now(),now(),(now() at time zone 'Africa/Lagos')::date,200000,0,200000,1);
insert into public.payments(id,business_id,customer_id,amount_kobo,method,collected_by,device_id,occurred_at,business_date)
values ('bb000000-0000-0000-0000-0000000000f3','88000000-0000-0000-0000-0000000000a0','99000000-0000-0000-0000-0000000000c2',200000,'transfer','77000000-0000-0000-0000-0000000000a1','55000000-0000-0000-0000-000000000009',now(),(now() at time zone 'Africa/Lagos')::date);
insert into public.payment_allocations(payment_id,sale_id,amount_kobo) values ('bb000000-0000-0000-0000-0000000000f3','aa000000-0000-0000-0000-0000000000e3',200000);

-- S4: C3, total 100000 on today-1, unpaid -> balance 100000, open_count 1, oldest today-1.
insert into public.sales(id,business_id,customer_id,customer_name,customer_phone,created_by,device_id,occurred_at,created_at,business_date,subtotal_kobo,adjustment_kobo,total_kobo,rules_version)
values ('aa000000-0000-0000-0000-0000000000e4','88000000-0000-0000-0000-0000000000a0','99000000-0000-0000-0000-0000000000c3','Mid debtor','08000000003','77000000-0000-0000-0000-0000000000a1','55000000-0000-0000-0000-000000000009',now(),now(),(now() at time zone 'Africa/Lagos')::date-1,100000,0,100000,1);

-- S5: C4, total 400000 on today-30 (outside the staff seven-day window), unpaid.
insert into public.sales(id,business_id,customer_id,customer_name,customer_phone,created_by,device_id,occurred_at,created_at,business_date,subtotal_kobo,adjustment_kobo,total_kobo,rules_version)
values ('aa000000-0000-0000-0000-0000000000e5','88000000-0000-0000-0000-0000000000a0','99000000-0000-0000-0000-0000000000c4','Ancient debtor','08000000004','77000000-0000-0000-0000-0000000000a1','55000000-0000-0000-0000-000000000009',now()-interval '30 days',now()-interval '30 days',(now() at time zone 'Africa/Lagos')::date-30,400000,0,400000,1);

-- ===== Staff A assertions =====
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-0000000000a1',true);
set local role authenticated;
do $$
declare r record; names text[]; today date := (now() at time zone 'Africa/Lagos')::date;
begin
 -- Per-customer enrichment for C1.
 select * into r from public.customer_balances(null,'name',50,0) where customer_id='99000000-0000-0000-0000-0000000000c1';
 if r.balance_kobo<>600000 then raise exception 'C1 balance wrong: %', r.balance_kobo; end if;
 if r.open_invoice_count<>2 then raise exception 'C1 open count wrong: %', r.open_invoice_count; end if;
 if r.oldest_unpaid_date<>today-2 then raise exception 'C1 oldest date wrong: %', r.oldest_unpaid_date; end if;

 -- Settled customer: zero balance, zero count, null oldest date.
 select * into r from public.customer_balances(null,'name',50,0) where customer_id='99000000-0000-0000-0000-0000000000c2';
 if r.balance_kobo<>0 or r.open_invoice_count<>0 then raise exception 'C2 not settled: bal % count %', r.balance_kobo, r.open_invoice_count; end if;
 if r.oldest_unpaid_date is not null then raise exception 'C2 oldest date should be null: %', r.oldest_unpaid_date; end if;

 -- C4 out-of-window debt is still visible through the customer list (its whole purpose).
 select * into r from public.customer_balances(null,'name',50,0) where customer_id='99000000-0000-0000-0000-0000000000c4';
 if r.balance_kobo<>400000 or r.oldest_unpaid_date<>today-30 then raise exception 'C4 not surfaced: bal % oldest %', r.balance_kobo, r.oldest_unpaid_date; end if;

 -- Business-wide debt totals, including the oldest outstanding invoice date.
 select * into r from public.customer_debt_totals();
 if r.customer_count<>4 then raise exception 'debt totals count wrong: %', r.customer_count; end if;
 if r.total_debt_kobo<>1100000 then raise exception 'debt totals sum wrong: %', r.total_debt_kobo; end if;
 if r.oldest_unpaid_date<>today-30 then raise exception 'debt totals oldest wrong: %', r.oldest_unpaid_date; end if;

 -- Sort by name asc.
 select array_agg(name order by ord) into names from (select name, row_number() over () ord from public.customer_balances(null,'name',50,0)) t;
 if names<>array['Alpha debtor','Ancient debtor','Mid debtor','Zeta paid'] then raise exception 'name sort wrong: %', names; end if;

 -- Sort by balance desc.
 select array_agg(name order by ord) into names from (select name, row_number() over () ord from public.customer_balances(null,'balance',50,0)) t;
 if names<>array['Alpha debtor','Ancient debtor','Mid debtor','Zeta paid'] then raise exception 'balance sort wrong: %', names; end if;

 -- Sort by oldest asc, settled (null) last.
 select array_agg(name order by ord) into names from (select name, row_number() over () ord from public.customer_balances(null,'oldest',50,0)) t;
 if names<>array['Ancient debtor','Alpha debtor','Mid debtor','Zeta paid'] then raise exception 'oldest sort wrong: %', names; end if;

 -- Records day totals for today: S2 (300000 unpaid) + S3 (200000 paid).
 select * into r from public.records_day_totals(today);
 if r.billed_kobo<>500000 or r.collected_kobo<>200000 or r.outstanding_kobo<>300000 then
  raise exception 'today totals wrong: billed % collected % owed %', r.billed_kobo, r.collected_kobo, r.outstanding_kobo; end if;

 -- Records day totals for today-2: S1 (500000, 200000 paid).
 select * into r from public.records_day_totals(today-2);
 if r.billed_kobo<>500000 or r.collected_kobo<>200000 or r.outstanding_kobo<>300000 then
  raise exception 'today-2 totals wrong: billed % collected % owed %', r.billed_kobo, r.collected_kobo, r.outstanding_kobo; end if;

 -- Out-of-window date for staff: must return zeros, never the 400000 that exists there.
 select * into r from public.records_day_totals(today-30);
 if r.billed_kobo<>0 or r.collected_kobo<>0 or r.outstanding_kobo<>0 then
  raise exception 'staff saw out-of-window day totals: billed %', r.billed_kobo; end if;
end $$;
reset role;

-- ===== Admin A: the seven-day window does not apply =====
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-0000000000a2',true);
set local role authenticated;
do $$ declare r record; today date := (now() at time zone 'Africa/Lagos')::date; begin
 select * into r from public.records_day_totals(today-30);
 if r.billed_kobo<>400000 or r.outstanding_kobo<>400000 then
  raise exception 'admin out-of-window totals wrong: billed % owed %', r.billed_kobo, r.outstanding_kobo; end if;
end $$;
reset role;

-- ===== Cross-business isolation =====
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-0000000000b1',true);
set local role authenticated;
do $$ declare r record; today date := (now() at time zone 'Africa/Lagos')::date; begin
 if exists(select 1 from public.customer_balances(null,'name',50,0)) then raise exception 'Cross-business customer list leaked'; end if;
 select * into r from public.records_day_totals(today);
 if r.billed_kobo<>0 or r.collected_kobo<>0 or r.outstanding_kobo<>0 then raise exception 'Cross-business day totals leaked'; end if;
end $$;
reset role;
-- Identical names/balances/ages: reverse physical insertion must not determine pages.
insert into public.customers(id,business_id,name,created_by)
select ('99000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
 '88000000-0000-0000-0000-0000000000a0','Duplicate pagination fixture','77000000-0000-0000-0000-0000000000a1'
from generate_series(130,101,-1) n;
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-0000000000a1',true);
set local role authenticated;
do $$ declare mode text; ids uuid[]; expected uuid[]; begin
 select array_agg(('99000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid order by n) into expected from generate_series(101,130) n;
 foreach mode in array array['name','balance','oldest'] loop
  select array_agg(customer_id order by page,ord) into ids from (
   select 1 page,customer_id,row_number() over() ord from public.customer_balances('Duplicate pagination fixture',mode,20,0)
   union all
   select 2 page,customer_id,row_number() over() ord from public.customer_balances('Duplicate pagination fixture',mode,20,20)
  ) pages;
  if ids is distinct from expected then raise exception 'Non-deterministic tied pagination for %: %',mode,ids;end if;
 end loop;
end $$;
reset role;
rollback;
select 'Customer sort + records day-totals tests passed; all test data rolled back' as result;
