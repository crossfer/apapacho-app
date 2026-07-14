-- =============================================================================
-- Add pricing fields to service_orders.
--
-- Named 0006, not 0005 as originally requested — 0005_staff_properties_access.sql
-- already exists in this repo (added a couple of turns ago to restore staff
-- visibility on properties after the RLS recursion fix). A second 0005 file
-- would collide/apply out of order.
-- =============================================================================

alter table public.service_orders
  add column if not exists client_materials_cost numeric(10, 2) not null default 0,
  add column if not exists client_service_cost   numeric(10, 2) not null default 0,
  add column if not exists staff_payment         numeric(10, 2) not null default 0,
  add column if not exists actual_materials_cost numeric(10, 2) not null default 0;
