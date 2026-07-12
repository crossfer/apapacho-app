-- =============================================================================
-- Apapacho Homes — initial schema + Row Level Security
-- Run in the Supabase SQL Editor (or via `supabase db push`).
-- =============================================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- =============================================================================
-- TABLES
-- =============================================================================

-- profiles ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('admin', 'staff', 'client')),
  full_name   text,
  phone       text,
  avatar_url  text,
  language    text not null default 'auto' check (language in ('es', 'en', 'auto')),
  created_at  timestamptz not null default now()
);

-- properties -------------------------------------------------------------------
create table if not exists public.properties (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.profiles (id) on delete set null,
  name        text,
  address     text,
  city        text check (city in ('San Diego', 'Los Angeles')),
  notes       text,
  created_at  timestamptz not null default now()
);

-- service_orders ---------------------------------------------------------------
create table if not exists public.service_orders (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid references public.properties (id) on delete cascade,
  staff_id      uuid references public.profiles (id) on delete set null,
  service_type  text not null check (
                  service_type in ('cleaning', 'organization', 'decoration', 'smart_home', 'mobility')),
  service_sub   text,
  status        text not null default 'scheduled' check (status in (
                  'scheduled', 'in_progress', 'completed', 'cancelled',
                  'received', 'diagnosing', 'in_repair', 'ready', 'delivered')),
  scheduled_at  timestamptz,
  completed_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now()
);

-- service_updates --------------------------------------------------------------
create table if not exists public.service_updates (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid references public.service_orders (id) on delete cascade,
  staff_id          uuid references public.profiles (id) on delete set null,
  status            text not null,
  note              text,
  -- Auto-captured on the staff device at the moment of the status change:
  timestamp_device  timestamptz,
  latitude          numeric(10, 7),
  longitude         numeric(10, 7),
  location_accuracy numeric,
  location_denied   boolean not null default false,
  created_at        timestamptz not null default now()
);

-- service_photos ---------------------------------------------------------------
create table if not exists public.service_photos (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references public.service_orders (id) on delete cascade,
  update_id     uuid references public.service_updates (id) on delete set null,
  storage_path  text not null,
  caption       text,
  created_at    timestamptz not null default now()
);

-- vendors ----------------------------------------------------------------------
create table if not exists public.vendors (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references public.profiles (id) on delete cascade,
  company_name  text,
  tax_id        text,
  specialties   text[],
  cities        text[],
  staff_type    text not null default 'internal' check (staff_type in ('internal', 'external')),
  payment_info  text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- notifications ----------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete cascade,
  order_id    uuid references public.service_orders (id) on delete cascade,
  type        text not null check (type in ('service_completed', 'service_started', 'new_order')),
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Indexes for the common access paths -----------------------------------------
create index if not exists idx_properties_client       on public.properties (client_id);
create index if not exists idx_orders_property          on public.service_orders (property_id);
create index if not exists idx_orders_staff             on public.service_orders (staff_id);
create index if not exists idx_orders_status            on public.service_orders (status);
create index if not exists idx_orders_scheduled_at      on public.service_orders (scheduled_at);
create index if not exists idx_updates_order            on public.service_updates (order_id);
create index if not exists idx_updates_staff             on public.service_updates (staff_id);
create index if not exists idx_photos_order             on public.service_photos (order_id);
create index if not exists idx_photos_update             on public.service_photos (update_id);
create index if not exists idx_vendors_profile          on public.vendors (profile_id);
create index if not exists idx_notifications_user        on public.notifications (user_id);
create index if not exists idx_notifications_order        on public.notifications (order_id);

-- =============================================================================
-- HELPER FUNCTIONS  (SECURITY DEFINER → bypass RLS, prevents policy recursion)
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- true if the current user is the assigned staff of the order (or an admin)
create or replace function public.is_order_staff(p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
     or exists (
       select 1 from public.service_orders o
       where o.id = p_order and o.staff_id = auth.uid()
     );
$$;

-- true if the current user may read the order (admin, assigned staff, or the
-- client who owns the property)
create or replace function public.can_access_order(p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
     or exists (
       select 1 from public.service_orders o
       where o.id = p_order and o.staff_id = auth.uid()
     )
     or exists (
       select 1
       from public.service_orders o
       join public.properties p on p.id = o.property_id
       where o.id = p_order and p.client_id = auth.uid()
     );
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-create a profile row when an auth user is created. Role / name / language
-- are read from the admin-supplied user metadata (defaults to 'client').
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'client'),
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'language', 'auto')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stamp completed_at when an order moves to 'completed'.
create or replace function public.stamp_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and new.status is distinct from old.status then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_completed_at on public.service_orders;
create trigger trg_stamp_completed_at
  before update on public.service_orders
  for each row execute function public.stamp_completed_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.profiles        enable row level security;
alter table public.properties      enable row level security;
alter table public.service_orders  enable row level security;
alter table public.service_updates enable row level security;
alter table public.service_photos  enable row level security;
alter table public.vendors         enable row level security;
alter table public.notifications   enable row level security;

-- profiles --------------------------------------------------------------------
create policy "profiles: read own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: insert self or admin"
  on public.profiles for insert
  with check (id = auth.uid() or public.is_admin());

create policy "profiles: update own or admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "profiles: delete admin"
  on public.profiles for delete
  using (public.is_admin());

-- properties ------------------------------------------------------------------
create policy "properties: read"
  on public.properties for select
  using (
    public.is_admin()
    or client_id = auth.uid()
    or exists (
      select 1 from public.service_orders o
      where o.property_id = properties.id and o.staff_id = auth.uid()
    )
  );

create policy "properties: admin write"
  on public.properties for all
  using (public.is_admin())
  with check (public.is_admin());

-- service_orders --------------------------------------------------------------
create policy "orders: read"
  on public.service_orders for select
  using (
    public.is_admin()
    or staff_id = auth.uid()
    or exists (
      select 1 from public.properties p
      where p.id = service_orders.property_id and p.client_id = auth.uid()
    )
  );

create policy "orders: admin write"
  on public.service_orders for all
  using (public.is_admin())
  with check (public.is_admin());

-- Staff may update the status of orders assigned to them (but not reassign, etc.
-- — that stays admin-only via the app layer; column-level control can be added).
create policy "orders: staff update assigned"
  on public.service_orders for update
  using (staff_id = auth.uid())
  with check (staff_id = auth.uid());

-- service_updates -------------------------------------------------------------
create policy "updates: read"
  on public.service_updates for select
  using (public.can_access_order(order_id));

create policy "updates: staff/admin insert"
  on public.service_updates for insert
  with check (public.is_order_staff(order_id) and (staff_id = auth.uid() or public.is_admin()));

create policy "updates: admin write"
  on public.service_updates for all
  using (public.is_admin())
  with check (public.is_admin());

-- service_photos --------------------------------------------------------------
create policy "photos: read"
  on public.service_photos for select
  using (public.can_access_order(order_id));

create policy "photos: staff/admin insert"
  on public.service_photos for insert
  with check (public.is_order_staff(order_id));

create policy "photos: staff/admin delete"
  on public.service_photos for delete
  using (public.is_order_staff(order_id));

-- vendors ---------------------------------------------------------------------
-- Payment info is sensitive → only admins read/write. A vendor may read their
-- own non-payment row via the app using a restricted view if needed later.
create policy "vendors: admin all"
  on public.vendors for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "vendors: read own"
  on public.vendors for select
  using (profile_id = auth.uid());

-- notifications ---------------------------------------------------------------
create policy "notifications: read own"
  on public.notifications for select
  using (user_id = auth.uid() or public.is_admin());

create policy "notifications: update own (mark read)"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications: admin insert"
  on public.notifications for insert
  with check (public.is_admin());

-- =============================================================================
-- STORAGE: service-photos bucket + policies
-- Photos are stored under {order_id}/... — the first path segment is the order.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('service-photos', 'service-photos', false)
on conflict (id) do nothing;

create policy "service-photos: read if can access order"
  on storage.objects for select
  using (
    bucket_id = 'service-photos'
    and public.can_access_order(((storage.foldername(name))[1])::uuid)
  );

create policy "service-photos: staff/admin upload"
  on storage.objects for insert
  with check (
    bucket_id = 'service-photos'
    and public.is_order_staff(((storage.foldername(name))[1])::uuid)
  );

create policy "service-photos: staff/admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'service-photos'
    and public.is_order_staff(((storage.foldername(name))[1])::uuid)
  );

-- =============================================================================
-- REALTIME: expose tables the client/admin subscribe to
-- =============================================================================

alter publication supabase_realtime add table public.service_orders;
alter publication supabase_realtime add table public.service_updates;
alter publication supabase_realtime add table public.service_photos;
alter publication supabase_realtime add table public.notifications;
