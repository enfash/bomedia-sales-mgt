begin;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
insert into public.businesses(id,name) values ('20000000-0000-0000-0000-000000000001','RLS test A'),('20000000-0000-0000-0000-000000000002','RLS test B');
insert into public.profiles(id,business_id,display_name,role) values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Test staff','staff'),('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Other business','admin');
insert into public.materials(business_id,name) values ('20000000-0000-0000-0000-000000000001','Test A'),('20000000-0000-0000-0000-000000000002','Test B');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.materials) <> 1 then raise exception 'Cross-business material isolation failed'; end if;
 if (select count(*) from public.profiles) <> 1 then raise exception 'Staff profile isolation failed'; end if;
 if private.is_admin() then raise exception 'Staff promoted to admin'; end if;
 begin
  update public.profiles set role='admin' where id='10000000-0000-0000-0000-000000000001';
  raise exception 'Staff role mutation was allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.materials(business_id,name) values ('20000000-0000-0000-0000-000000000001','Unauthorized');
  raise exception 'Direct material write was allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
update public.profiles set active=false where id='10000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$ begin
 if (select count(*) from public.materials) <> 0 then raise exception 'Inactive staff can read business data'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
  perform * from public.customers;
  raise exception 'Anonymous customer access was allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'Identity/catalog authorization checks passed; test data rolled back' as result;
