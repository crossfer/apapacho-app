-- =============================================================================
-- Ensure admins have full read/write access to properties.
--
-- 0001_init.sql already scoped properties SELECT/write policies through
-- is_admin(), but admins were still unable to read other users' properties in
-- practice. This adds an explicit, unambiguous "admins can do everything"
-- policy as a second permissive policy (RLS OR's permissive policies together
-- per command, so this is additive and can't make access stricter).
--
-- Note: this still depends on is_admin() returning true for the calling user,
-- i.e. their own profiles.role must actually be 'admin'. If it still doesn't
-- work after this migration, check that first:
--   select id, email, role from public.profiles where role = 'admin';
-- =============================================================================

drop policy if exists "Admins can do everything on properties" on public.properties;

create policy "Admins can do everything on properties"
  on public.properties for all
  to authenticated
  using (is_admin())
  with check (is_admin());
