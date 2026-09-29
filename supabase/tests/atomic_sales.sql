begin;
insert into auth.users(id) values ('11000000-0000-0000-0000-000000000001'),('11000000-0000-0000-0000-000000000002');
insert into public.businesses(id,name) values ('22000000-0000-0000-0000-000000000001','Atomic sales test'),('22000000-0000-0000-0000-000000000002','Other business');
insert into public.sales_rules(business_id) values ('22000000-0000-0000-0000-000000000001');
insert into public.profiles(id,business_id,display_name,role) values ('11000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','Staff A','staff'),('11000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000002','Staff B','staff');
insert into public.materials(id,business_id,name) values ('33000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','Flex');
insert into public.price_versions(id,material_id,rate_kobo,created_by) values ('44000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001',18000,'11000000-0000-0000-0000-000000000001');
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$
declare payload jsonb; first_result jsonb; retry_result jsonb; saved_count integer;
begin
 payload:=jsonb_build_object('version',1,'rulesVersion',1,'deviceId','55000000-0000-0000-0000-000000000001','occurredAt',now(),
 'customer',jsonb_build_object('id',null,'name','Test customer','phone','08000000000'),
 'items',(select jsonb_agg(jsonb_build_object('materialId','33000000-0000-0000-0000-000000000001','priceVersionId','44000000-0000-0000-0000-000000000001','width','13','height','17','quantity','1','unit','in')) from generate_series(1,25)),
 'totalKobo','700000','receivedKobo','100000','method','cash');
 first_result:=public.create_sale('66000000-0000-0000-0000-000000000001',payload);
 retry_result:=public.create_sale('66000000-0000-0000-0000-000000000001',payload);
 if first_result<>retry_result then raise exception 'Retry changed result'; end if;
 if (select count(*) from public.sales)<>1 or (select count(*) from public.sale_items)<>25 or (select count(*) from public.payments)<>1 or (select count(*) from public.customers)<>1 then raise exception 'Atomic record count failed'; end if;
 if exists(select 1 from public.sale_items where calculated_kobo<>27625 or charged_kobo<>28000) then raise exception 'Inch pricing parity failed'; end if;
 if (select sum(amount_kobo) from public.payment_allocations)<>100000 then raise exception 'Payment allocation failed'; end if;
 begin
  perform public.create_sale('66000000-0000-0000-0000-000000000001',payload||'{"method":"pos"}');
  raise exception 'Changed retry was allowed' using errcode='XX000';
 exception when raise_exception then null;
 end;
 begin
  perform public.create_sale('66000000-0000-0000-0000-000000000002',payload||'{"totalKobo":"1"}');
  raise exception 'Tampered total was allowed' using errcode='XX000';
 exception when raise_exception then null;
 end;
 begin
  perform public.create_sale('66000000-0000-0000-0000-000000000003',payload||'{"method":null}');
  raise exception 'Missing method was allowed' using errcode='XX000';
 exception when raise_exception then null;
 end;
 begin
  perform public.create_sale('66000000-0000-0000-0000-000000000004',jsonb_set(payload,'{customer,phone}','""'));
  raise exception 'Debt without phone was allowed' using errcode='XX000';
 exception when raise_exception then null;
 end;
 if (select count(*) from public.customers)<>1 then raise exception 'Failed sale left an orphan customer'; end if;
 begin
  delete from public.payments;
  raise exception 'Staff payment deletion was allowed' using errcode='XX000';
 exception when insufficient_privilege then null;
 end;
 -- Minimum order + zero receipt create no payment; use selected customer, not a new duplicate.
 payload:=jsonb_set(payload,'{customer,id}',first_result->'customerId');
 payload:=payload||jsonb_build_object('items',jsonb_build_array((payload->'items')->0),'totalKobo','100000','receivedKobo','0','method',null);
 retry_result:=public.create_sale('66000000-0000-0000-0000-000000000005',payload);
 if retry_result->>'totalKobo'<>'100000' or (select count(*) from public.customers)<>1 or (select count(*) from public.payments)<>1 then raise exception 'Minimum/unpaid/existing-customer behavior failed'; end if;
end $$;
reset role;
do $$ declare a record; begin
 select * into a from private.item_amount('1','8','1','in',18000,1000);
 if a.charged<>1000 then raise exception 'Exact-ten boundary failed'; end if;
 select * into a from private.item_amount('1','8.00000000000000000001','1','in',18000,1000);
 if a.charged<>2000 then raise exception 'Just-above-ten boundary failed'; end if;
 if (select count(*) from public.audit_events where business_id='22000000-0000-0000-0000-000000000001')<>2 then raise exception 'Audit count failed'; end if;
end $$;
-- Cross-business reads and selected-customer injection are denied.
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.sales) or exists(select 1 from public.payments) then raise exception 'Cross-business read allowed'; end if;
end $$;
reset role;
update public.profiles set active=false where id='11000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ begin
 begin
  perform public.create_sale('66000000-0000-0000-0000-000000000001','{}');
  raise exception 'Inactive write allowed' using errcode='XX000';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'Atomic sale, pricing, retry and authorization tests passed; all test data rolled back' as result;
