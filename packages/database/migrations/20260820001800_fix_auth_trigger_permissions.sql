-- =============================================
-- FIX: Grant supabase_auth_admin INSERT on profiles
-- so the handle_new_user() trigger can create profiles
-- =============================================

-- Grant supabase_auth_admin necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON profiles TO supabase_auth_admin;
GRANT SELECT ON profiles TO supabase_auth_admin;
GRANT INSERT ON customer_profiles TO supabase_auth_admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
