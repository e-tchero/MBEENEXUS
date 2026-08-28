-- =============================================
-- SECURITY REMEDIATION — Supabase Advisory
-- Project: dlvdpmmarnsiriarqqc
-- Date: 2026-08-28
--
-- Findings:
-- 1. public.prohibited_items — RLS disabled, anon/authenticated can SELECT
-- 2. public.spatial_ref_sys — Extension-managed, anon/authenticated can SELECT
--
-- This migration:
-- - Enables RLS on prohibited_items (idempotent)
-- - Revokes Data API access from anon/authenticated on prohibited_items
-- - Revoke on spatial_ref_sys requires Supabase Dashboard SQL Editor
--   (postgres role cannot revoke grants made by supabase_admin)
-- - Does NOT modify PostGIS extension or its schema
-- - Does NOT modify application logic
-- =============================================

-- =============================================
-- FINDING 1: public.prohibited_items
-- =============================================

-- Enable RLS (idempotent — safe if already enabled)
ALTER TABLE public.prohibited_items ENABLE ROW LEVEL SECURITY;

-- Revoke Data API access from anon and authenticated
-- This blocks PostgREST/REST API access for these roles
REVOKE SELECT ON public.prohibited_items FROM anon, authenticated;

-- Note: service_role bypasses RLS by design, so no explicit policy is needed.
-- The GRANT SELECT for service_role in the original migration remains intact.
-- The REVOKE above removes the anon/authenticated grants, which is the actual
-- security control. RLS being enabled provides defense-in-depth.

-- =============================================
-- FINDING 2: public.spatial_ref_sys
-- =============================================
--
-- IMPORTANT: This REVOKE must be executed via the Supabase Dashboard SQL Editor
-- because spatial_ref_sys is owned by supabase_admin (superuser), and the
-- postgres role used by the CLI cannot revoke grants made by supabase_admin.
--
-- Run the following in Dashboard > SQL Editor:
-- REVOKE ALL ON public.spatial_ref_sys FROM anon, authenticated;
--
-- PostGIS internal functions access this table through extension permissions,
-- NOT through GRANTs, so revoking does not break spatial functionality.
-- We verified ST_Distance and other spatial functions work correctly.

-- =============================================
-- VERIFICATION QUERIES (run after migration)
-- =============================================
-- -- prohibited_items RLS status:
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'prohibited_items';
-- Expected: relrowsecurity = t
--
-- -- prohibited_items grants:
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
-- WHERE table_name = 'prohibited_items' AND table_schema = 'public';
-- Expected: only service_role entries
--
-- -- spatial_ref_sys grants:
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
-- WHERE table_name = 'spatial_ref_sys' AND table_schema = 'public';
-- Expected: only service_role or no entries for anon/authenticated
--
-- -- PostGIS functions still work:
-- SELECT ST_Distance(
--   ST_SetSRID(ST_MakePoint(7.4, 9.1), 4326)::geography,
--   ST_SetSRID(ST_MakePoint(7.5, 9.0), 4326)::geography
-- );
-- Expected: returns distance in meters
