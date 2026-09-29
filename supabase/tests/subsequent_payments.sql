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

insert into public.sales(id,business_id,customer_id,customer_name,created_by,device_id,occurred_at,created_at,business_date,subtotal_kobo,adjustment_kobo,total_kobo,rules_version)
select 'aa000000-0000-0000-0000-000000000003',business_id,customer_id,customer_name,created_by,device_id,occurred_at,created_at,business_date,200000,0,200000,1
from public.sales where id='aa000000-0000-0000-0000-000000000001';
-- Inject a late failure to prove the receipt, allocations and operation all roll back together.
create function pg_temp.reject_test_payment_audit() returns trigger language plpgsql as $$
begin
 if new.detail->>'operationId'='ee000000-0000-0000-0000-000000000009' then raise exception 'Injected audit failure'; end if;
 return new;
end $$;
create trigger test_payment_audit_failure before insert on public.audit_events for each row execute function pg_temp.reject_test_payment_audit();
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$
declare p jsonb; r jsonb; retried jsonb; rejected boolean; target uuid; count_before bigint;
begin
 p:=jsonb_build_object('version',1,'scope','customer','customerId','99000000-0000-0000-0000-000000000001','saleId',null,
  'amountKobo','350001','method','cash','deviceId','55000000-0000-0000-0000-000000000009','occurredAt',now());
 -- No method default, malformed/zero amount, and mismatched target must be rejected.
 foreach target in array array['ee000000-0000-0000-0000-000000000001'::uuid] loop
  rejected:=false;
  begin perform public.record_payment(target,p-'method'); exception when raise_exception then rejected:=true; end;
  if not rejected then raise exception 'Missing method accepted'; end if;
  rejected:=false;
  begin perform public.record_payment(target,p||'{"amountKobo":"0"}'); exception when raise_exception then rejected:=true; end;
  if not rejected then raise exception 'Zero payment accepted'; end if;
  rejected:=false;
  begin perform public.record_payment(target,p||'{"amountKobo":"1.5"}'); exception when raise_exception then rejected:=true; end;
  if not rejected then raise exception 'Fractional kobo accepted'; end if;
  rejected:=false;
  begin perform public.record_payment(target,p||'{"scope":"invoice"}'); exception when raise_exception then rejected:=true; end;
  if not rejected then raise exception 'Missing invoice accepted'; end if;
 end loop;
 rejected:=false;
 begin perform public.record_payment('ee000000-0000-0000-0000-000000000009',p);
 exception when raise_exception then
  if sqlerrm<>'Injected audit failure' then raise; end if;
  rejected:=true;
 end;
 if not rejected then raise exception 'Audit failure injection did not execute'; end if;
 r:=public.record_payment('ee000000-0000-0000-0000-000000000002',p);
 if r->>'amountKobo'<>'350001' or r->>'allocatedKobo'<>'350001' or r->>'unappliedKobo'<>'0' then raise exception 'Exact kobo amount not preserved'; end if;
 if r#>>'{allocations,0,saleId}'<>'aa000000-0000-0000-0000-000000000001' or r#>>'{allocations,0,amountKobo}'<>'300000'
 or r#>>'{allocations,1,saleId}'<>'aa000000-0000-0000-0000-000000000003' or r#>>'{allocations,1,amountKobo}'<>'50001' then raise exception 'Oldest-first/ID ordering incorrect: %',r; end if;
 if r->>'collectedBy'<>'77000000-0000-0000-0000-000000000001' then raise exception 'Collector not authenticated actor'; end if;
 retried:=public.record_payment('ee000000-0000-0000-0000-000000000002',p);
 if retried<>r then raise exception 'Retry did not return original receipt'; end if;
 rejected:=false;
 begin perform public.record_payment('ee000000-0000-0000-0000-000000000002',p||'{"amountKobo":"350002"}'); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Changed retry payload accepted'; end if;
 -- A receipt for an already-paid invoice must NEVER spill into another invoice.
 p:=p||'{"scope":"invoice","saleId":"aa000000-0000-0000-0000-000000000001","amountKobo":"10000","method":"pos"}';
 r:=public.record_payment('ee000000-0000-0000-0000-000000000003',p);
 if r->>'unappliedKobo'<>'10000' or r->>'allocatedKobo'<>'0' or jsonb_array_length(r->'allocations')<>0 then raise exception 'Invoice-only payment leaked to another invoice'; end if;
 if not (r->'reviewFlags' ? 'unapplied_receipt_requires_admin_review') then raise exception 'Missing excess review flag'; end if;
 -- A second customer receipt sees the reduced balance, allocates only that amount, preserves excess.
 p:=p||'{"scope":"customer","saleId":null,"amountKobo":"200000","method":"transfer"}';
 r:=public.record_payment('ee000000-0000-0000-0000-000000000004',p);
 if r->>'allocatedKobo'<>'149999' or r->>'unappliedKobo'<>'50001' then raise exception 'Changed balance was not revalidated'; end if;
 if exists(select 1 from public.customer_outstanding_sales('99000000-0000-0000-0000-000000000001')) then raise exception 'Debt remains after full allocation'; end if;
 -- Existing customer, but a different customer's invoice, is not a valid target.
 rejected:=false;
 begin perform public.record_payment('ee000000-0000-0000-0000-000000000005',p||'{"scope":"invoice","saleId":"aa000000-0000-0000-0000-000000000002"}'); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Different customer invoice accepted'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from private.payment_operations where business_id='88000000-0000-0000-0000-000000000001')<>3 then raise exception 'Unexpected operation count'; end if;
 if (select count(*) from public.audit_events where action='payment_recorded' and business_id='88000000-0000-0000-0000-000000000001')<>3 then raise exception 'Duplicate/missing audit'; end if;
 if (select count(*) from public.payments where customer_id='99000000-0000-0000-0000-000000000001')<>4 then raise exception 'Duplicate receipt'; end if;
 if exists(select 1 from public.sales s where s.business_id='88000000-0000-0000-0000-000000000001' and (select coalesce(sum(amount_kobo),0) from public.payment_allocations where sale_id=s.id)>s.total_kobo) then raise exception 'Invoice overallocated'; end if;
end $$;
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ declare rejected boolean:=false; begin
 begin perform public.record_payment('ee000000-0000-0000-0000-000000000006',jsonb_build_object('version',1,'scope','customer','customerId','99000000-0000-0000-0000-000000000001','amountKobo','100','method','cash','deviceId','55000000-0000-0000-0000-000000000009','occurredAt',now()));
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Cross-business receipt allowed'; end if;
end $$;
reset role;
update public.profiles set active=false where id='77000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ declare rejected boolean:=false; begin
 begin perform public.record_payment('ee000000-0000-0000-0000-000000000002','{}');
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Inactive account allowed'; end if;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.record_payment(uuid,jsonb)','execute') then raise exception 'Anonymous receipt permission granted'; end if;
 if has_table_privilege('authenticated','public.payments','insert') or has_table_privilege('authenticated','public.payment_allocations','insert') then raise exception 'Direct payment write granted'; end if;
end $$;
rollback;
select 'Subsequent-payment tests passed; all fixtures rolled back' as result;
