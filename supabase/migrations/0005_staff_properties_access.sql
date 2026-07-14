-- =============================================================================
-- Restore staff visibility on properties for their assigned orders.
--
-- 0004_fix_properties_rls_recursion.sql deliberately dropped the old
-- "properties: read" policy's staff clause (a raw subquery into
-- service_orders) to break a genuine RLS recursion cycle: that policy
-- referenced service_orders, whose own "orders: read" policy referenced
-- properties back. It left properties readable only by admins and by the
-- owning client, with a note that staff access should come back via a
-- SECURITY DEFINER helper (which sidesteps the cycle because it queries
-- service_orders with the function owner's privileges, bypassing RLS
-- entirely, rather than going through another RLS-evaluated query).
--
-- The staff Orders pages need property.address, so that gap needs closing
-- now — same shape as the existing is_order_staff() helper, but keyed by
-- property_id instead of order_id.
-- =============================================================================

create or replace function public.is_staff_for_property(p_property uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
     or exists (
       select 1 from public.service_orders o
       where o.property_id = p_property and o.staff_id = auth.uid()
     )
$$;

create policy "Staff can view assigned properties"
  on properties for select
  to authenticated
  using (public.is_staff_for_property(id));
