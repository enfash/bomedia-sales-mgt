begin;
-- Configuration is server-owned; no client can change these rules directly.
create table public.sales_rules (
 business_id uuid primary key references public.businesses(id),
 version integer not null default 1,
 minimum_kobo bigint not null default 100000 check(minimum_kobo>0),
 rounding_kobo bigint not null default 1000 check(rounding_kobo>0)
);
insert into public.sales_rules(business_id) select id from public.businesses;
alter table public.sales_rules enable row level security;
revoke all on public.sales_rules from anon,authenticated;
grant select on public.sales_rules to authenticated;
create policy rules_read on public.sales_rules for select to authenticated using(business_id=(select private.active_business()));

create table public.sales (
 id uuid primary key default gen_random_uuid(),
 invoice_number bigint generated always as identity unique,
 business_id uuid not null references public.businesses(id), customer_id uuid not null references public.customers(id),
 customer_name text not null, customer_phone text,
 created_by uuid not null references public.profiles(id), device_id uuid not null,
 occurred_at timestamptz not null, created_at timestamptz not null default now(), business_date date not null,
 subtotal_kobo bigint not null check(subtotal_kobo>0), adjustment_kobo bigint not null check(adjustment_kobo>=0),
 total_kobo bigint not null check(total_kobo=subtotal_kobo+adjustment_kobo), rules_version integer not null,
 review_flags text[] not null default '{}', status text not null default 'open' check(status in ('open','void'))
);
create table public.sale_items (
 id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.sales(id),
 position integer not null, material_id uuid not null references public.materials(id), material_name text not null,
 price_version_id uuid not null references public.price_versions(id), rate_kobo bigint not null,
 width_input text not null, height_input text not null, unit text not null check(unit in ('ft','in')),
 quantity bigint not null check(quantity>0), calculated_kobo bigint not null check(calculated_kobo>=0),
 charged_kobo bigint not null check(charged_kobo>0), unique(sale_id,position)
);
create table public.payments (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
 customer_id uuid not null references public.customers(id), amount_kobo bigint not null check(amount_kobo>0),
 method text not null check(method in ('cash','pos','transfer')), collected_by uuid not null references public.profiles(id),
 device_id uuid not null, occurred_at timestamptz not null, created_at timestamptz not null default now(), business_date date not null
);
create table public.payment_allocations (
 payment_id uuid not null references public.payments(id), sale_id uuid not null references public.sales(id),
 amount_kobo bigint not null check(amount_kobo>0), primary key(payment_id,sale_id)
);
create table private.sale_operations (
 business_id uuid not null references public.businesses(id), operation_id uuid not null,
 actor_id uuid not null references public.profiles(id), payload jsonb not null, result jsonb not null,
 created_at timestamptz not null default now(), primary key(business_id,operation_id)
);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
 actor_id uuid not null references public.profiles(id), action text not null, record_id uuid not null,
 occurred_at timestamptz not null default now(), detail jsonb not null
);
create index sales_business_date on public.sales(business_id,business_date desc);
create index sales_customer on public.sales(customer_id);
create index payments_business_date on public.payments(business_id,business_date desc);
create index allocation_sale on public.payment_allocations(sale_id);
create index audit_business_date on public.audit_events(business_id,occurred_at desc);
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.audit_events enable row level security;
revoke all on public.sales,public.sale_items,public.payments,public.payment_allocations,public.audit_events from anon,authenticated;
grant select on public.sales,public.sale_items,public.payments,public.payment_allocations,public.audit_events to authenticated;
create policy sales_read on public.sales for select to authenticated using(business_id=(select private.active_business()) and ((select private.is_admin()) or business_date between (now() at time zone 'Africa/Lagos')::date-6 and (now() at time zone 'Africa/Lagos')::date));
create policy items_read on public.sale_items for select to authenticated using(exists(select 1 from public.sales s where s.id=sale_id));
create policy payments_read on public.payments for select to authenticated using(business_id=(select private.active_business()) and ((select private.is_admin()) or business_date between (now() at time zone 'Africa/Lagos')::date-6 and (now() at time zone 'Africa/Lagos')::date));
create policy allocations_read on public.payment_allocations for select to authenticated using(exists(select 1 from public.payments p where p.id=payment_id) and exists(select 1 from public.sales s where s.id=sale_id));
create policy audit_read on public.audit_events for select to authenticated using(business_id=(select private.active_business()) and (select private.is_admin()));

-- Exact quotient/remainder prevents rounding errors at the next-ten boundary.
create function private.item_amount(width_text text,height_text text,qty_text text,unit_text text,rate bigint,rounding bigint)
returns table(calculated bigint,charged bigint) language plpgsql immutable set search_path='' as $$
declare w numeric; h numeric; q numeric; numerator numeric; denominator numeric;
begin
 if width_text is null or height_text is null or qty_text is null or unit_text is null
 or length(width_text)>40 or length(height_text)>40 or length(qty_text)>12
 or width_text !~ '^\d+(\.\d+)?$' or height_text !~ '^\d+(\.\d+)?$' or qty_text !~ '^\d+$'
 or unit_text not in ('ft','in') or rate is null or rate<=0 or rounding is null or rounding<=0 then
  raise exception 'Invalid item dimensions, quantity or rate';
 end if;
 w:=width_text::numeric; h:=height_text::numeric; q:=qty_text::numeric;
 if w<=0 or h<=0 or q<=0 then raise exception 'Dimensions and quantity must be positive'; end if;
 numerator:=w*h*q*rate; denominator:=case when unit_text='in' then 144 else 1 end;
 calculated:=floor((numerator*2+denominator)/(2*denominator))::bigint;
 charged:=((div(numerator,denominator*rounding)+case when mod(numerator,denominator*rounding)>0 then 1 else 0 end)*rounding)::bigint;
 return next;
end $$;
revoke all on function private.item_amount(text,text,text,text,bigint,bigint) from public;

create function public.create_sale(operation_id uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.profiles%rowtype; rules public.sales_rules%rowtype; prior private.sale_operations%rowtype;
 c public.customers%rowtype; s public.sales%rowtype; item jsonb; catalog record; amount record;
 receipt jsonb; prepared jsonb:='[]'; subtotal bigint:=0; total bigint; paid bigint; payment_id uuid;
 occurred timestamptz; device uuid; flags text[]:='{}'; customer_phone text; i integer:=0;
begin
 select * into actor from public.profiles where id=auth.uid() and active for share;
 if not found then raise exception 'Active account required' using errcode='42501'; end if;
 if operation_id is null or payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Invalid submission'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor.business_id::text||operation_id::text,0));
 select * into prior from private.sale_operations o where o.business_id=actor.business_id and o.operation_id=create_sale.operation_id;
 if found then
  if prior.actor_id<>actor.id or prior.payload<>payload then raise exception 'Submission ID already belongs to a different request'; end if;
  return prior.result;
 end if;
 if payload->>'version' is distinct from '1' or jsonb_typeof(payload->'items') is distinct from 'array' then raise exception 'Unsupported sale format'; end if;
 if jsonb_array_length(payload->'items') not between 1 and 200 then raise exception 'An invoice requires between 1 and 200 items'; end if;
 select * into strict rules from public.sales_rules where business_id=actor.business_id for share;
 if payload->>'rulesVersion' is distinct from rules.version::text then raise exception 'Sales rules changed; admin review required'; end if;
 occurred:=(payload->>'occurredAt')::timestamptz; device:=(payload->>'deviceId')::uuid;
 if occurred is null or not isfinite(occurred) or device is null then raise exception 'Recording time and device are required'; end if;
 if abs(extract(epoch from now()-occurred))>600 then flags:=array_append(flags,'device_time_or_delayed_sync'); end if;
 if (occurred at time zone 'Africa/Lagos')::date<>(now() at time zone 'Africa/Lagos')::date then flags:=array_append(flags,'different_business_day'); end if;
 for item in select value from jsonb_array_elements(payload->'items') loop
  select m.id,m.name,p.id as price_id,p.rate_kobo,p.effective_at into catalog
  from public.materials m join public.price_versions p on p.material_id=m.id
  where m.id=(item->>'materialId')::uuid and p.id=(item->>'priceVersionId')::uuid
  and m.business_id=actor.business_id and m.active and p.effective_at<=now();
  if not found then raise exception 'Material or price is unavailable; admin review required'; end if;
  if exists(select 1 from public.price_versions p where p.material_id=catalog.id and p.effective_at>catalog.effective_at and p.effective_at<=now()) then flags:=array_append(flags,'historical_price'); end if;
  select * into amount from private.item_amount(item->>'width',item->>'height',item->>'quantity',item->>'unit',catalog.rate_kobo,rules.rounding_kobo);
  subtotal:=subtotal+amount.charged;
  prepared:=prepared||jsonb_build_array(item||jsonb_build_object('materialName',catalog.name,'rateKobo',catalog.rate_kobo::text,'calculatedKobo',amount.calculated::text,'chargedKobo',amount.charged::text));
 end loop;
 total:=greatest(subtotal,rules.minimum_kobo);
 if payload->>'totalKobo' is distinct from total::text then raise exception 'Invoice total differs from server calculation'; end if;
 if coalesce(payload->>'receivedKobo','') !~ '^\d{1,16}$' then raise exception 'Invalid received amount'; end if;
 paid:=(payload->>'receivedKobo')::bigint;
 if paid>total then raise exception 'Payment cannot exceed invoice total'; end if;
 if paid>0 and coalesce(payload->>'method','') not in ('cash','pos','transfer') then raise exception 'Choose a payment method'; end if;
 if length(trim(coalesce(payload#>>'{customer,name}','')))=0 or length(payload#>>'{customer,name}')>200 then raise exception 'Customer name required (up to 200 characters)'; end if;
 customer_phone:=nullif(trim(payload#>>'{customer,phone}'),'');
 if length(customer_phone)>50 then raise exception 'Phone is too long'; end if;
 if nullif(payload#>>'{customer,id}','') is not null then
  select * into c from public.customers where id=(payload#>>'{customer,id}')::uuid and business_id=actor.business_id for update;
  if not found then raise exception 'Customer is unavailable'; end if;
  customer_phone:=coalesce(customer_phone,nullif(trim(c.phone),''));
  if nullif(trim(c.phone),'') is null and customer_phone is not null then update public.customers set phone=customer_phone where id=c.id; end if;
 else
  insert into public.customers(business_id,name,phone,created_by) values(actor.business_id,trim(payload#>>'{customer,name}'),customer_phone,actor.id) returning * into c;
 end if;
 if paid<total and customer_phone is null then raise exception 'Phone required when a balance remains'; end if;
 insert into public.sales(business_id,customer_id,customer_name,customer_phone,created_by,device_id,occurred_at,business_date,subtotal_kobo,adjustment_kobo,total_kobo,rules_version,review_flags)
 values(actor.business_id,c.id,c.name,customer_phone,actor.id,device,occurred,(occurred at time zone 'Africa/Lagos')::date,subtotal,total-subtotal,total,rules.version,flags) returning * into s;
 for item in select value from jsonb_array_elements(prepared) loop
  i:=i+1;
  insert into public.sale_items(sale_id,position,material_id,material_name,price_version_id,rate_kobo,width_input,height_input,unit,quantity,calculated_kobo,charged_kobo)
  values(s.id,i,(item->>'materialId')::uuid,item->>'materialName',(item->>'priceVersionId')::uuid,(item->>'rateKobo')::bigint,item->>'width',item->>'height',item->>'unit',(item->>'quantity')::bigint,(item->>'calculatedKobo')::bigint,(item->>'chargedKobo')::bigint);
 end loop;
 if paid>0 then
  insert into public.payments(business_id,customer_id,amount_kobo,method,collected_by,device_id,occurred_at,business_date)
  values(actor.business_id,c.id,paid,payload->>'method',actor.id,device,occurred,s.business_date) returning id into payment_id;
  insert into public.payment_allocations values(payment_id,s.id,paid);
 end if;
 receipt:=jsonb_build_object('saleId',s.id,'invoiceNumber',s.invoice_number::text,'customerId',c.id,'totalKobo',total::text,'receivedKobo',paid::text,'balanceKobo',(total-paid)::text,'reviewFlags',flags);
 insert into public.audit_events(business_id,actor_id,action,record_id,detail) values(actor.business_id,actor.id,'sale_created',s.id,jsonb_build_object('operationId',operation_id,'receipt',receipt,'deviceId',device,'reportedAt',occurred));
 insert into private.sale_operations values(actor.business_id,operation_id,actor.id,payload,receipt,now());
 return receipt;
end $$;
revoke all on function public.create_sale(uuid,jsonb) from public,anon;
grant execute on function public.create_sale(uuid,jsonb) to authenticated;
commit;
