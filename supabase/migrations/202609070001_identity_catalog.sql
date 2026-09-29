-- Identity/catalog foundation only. Apply first to a NEW development project.
-- No public signup provisioning trigger: accounts/profiles are provisioned by trusted admin operations.
begin;
create table public.businesses (
 id uuid primary key default gen_random_uuid(), name text not null,
 timezone text not null default 'Africa/Lagos', currency text not null default 'NGN'
);
create table public.profiles (
 id uuid primary key references auth.users(id), business_id uuid not null references public.businesses(id),
 display_name text not null, role text not null check(role in ('staff','admin')), active boolean not null default true
);
create table public.customers (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
 name text not null check(length(trim(name))>0), phone text, email text,
 created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.materials (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
 name text not null, active boolean not null default true
);
create table public.material_widths (
 id uuid primary key default gen_random_uuid(), material_id uuid not null references public.materials(id),
 width_feet numeric not null check(width_feet>0), unique(material_id,width_feet)
);
create table public.price_versions (
 id uuid primary key default gen_random_uuid(), material_id uuid not null references public.materials(id),
 rate_kobo bigint not null check(rate_kobo>0), created_by uuid not null references public.profiles(id),
 effective_at timestamptz not null default now()
);
create schema if not exists private;
revoke all on schema private from public;
create function private.active_business() returns uuid language sql stable security definer set search_path='' as $$
 select business_id from public.profiles where id=(select auth.uid()) and active
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and active and role='admin')
$$;
revoke all on function private.active_business() from public;
revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.active_business(), private.is_admin() to authenticated;

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.materials enable row level security;
alter table public.material_widths enable row level security;
alter table public.price_versions enable row level security;
revoke all on public.businesses,public.profiles,public.customers,public.materials,public.material_widths,public.price_versions from anon,authenticated;
grant select on public.businesses,public.profiles,public.customers,public.materials,public.material_widths,public.price_versions to authenticated;
-- Writes are deliberately unavailable until audited mutation functions are implemented.
create policy business_read on public.businesses for select to authenticated using(id=(select private.active_business()));
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (business_id=(select private.active_business()) and (select private.is_admin())));
create policy customer_read on public.customers for select to authenticated using(business_id=(select private.active_business()));
create policy material_read on public.materials for select to authenticated using(business_id=(select private.active_business()));
create policy width_read on public.material_widths for select to authenticated using(exists(select 1 from public.materials m where m.id=material_id and m.business_id=(select private.active_business())));
create policy price_read on public.price_versions for select to authenticated using(exists(select 1 from public.materials m where m.id=material_id and m.business_id=(select private.active_business())));
create index customer_business_name on public.customers(business_id,lower(name));
create index price_material_date on public.price_versions(material_id,effective_at desc);
commit;
