-- =============================================================================
-- Fix infinite recursion (42P17) on properties RLS.
--
-- Root cause: "properties: read" (0001_init.sql) references service_orders
-- (for staff visibility), while "orders: read" (0001_init.sql, on
-- service_orders) references properties back (for client visibility). That's
-- a genuine mutual cycle between two RLS-protected tables, not just an
-- is_admin() problem — 0003's extra policy just made it get hit more often.
--
-- This drops every properties policy (both the real ones from 0001/0003 and
-- a few guessed names, as harmless no-ops if they don't exist) and replaces
-- them with two policies that only touch profiles (via is_admin(), which is
-- SECURITY DEFINER and bypasses RLS) or compare a column directly — no more
-- cross-reference into service_orders.
--
-- Known trade-off: this drops the old staff-can-view-assigned-properties
-- clause (the service_orders lookup in the old "properties: read" policy).
-- Staff will not be able to see a client's property this way until that's
-- reintroduced via a SECURITY DEFINER helper function (which can safely
-- query service_orders without re-triggering properties' own RLS).
-- =============================================================================

-- Real policy names (0001_init.sql, 0003_fix_properties_rls.sql).
drop policy if exists "properties: read" on properties;
drop policy if exists "properties: admin write" on properties;
drop policy if exists "Admins can do everything on properties" on properties;

-- Guessed names from the original fix request — no-ops if they never existed.
drop policy if exists "Clients can view their own properties" on properties;
drop policy if exists "Admins can view all properties" on properties;
drop policy if exists "Admins can insert properties" on properties;
drop policy if exists "Admins can update properties" on properties;
drop policy if exists "Admins can delete properties" on properties;

-- Single clean policy using auth.uid() directly with a subquery
create policy "Admin full access to properties"
  on properties for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Clients view own properties"
  on properties for select
  to authenticated
  using (client_id = auth.uid());
