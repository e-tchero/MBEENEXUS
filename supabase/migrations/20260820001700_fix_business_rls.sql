-- =============================================
-- FIX: Infinite recursion in business_members RLS
-- =============================================

-- Drop ALL existing policies on these tables to avoid conflicts
DROP POLICY IF EXISTS "business_profiles_select_member" ON business_profiles;
DROP POLICY IF EXISTS "business_profiles_update_owner" ON business_profiles;
DROP POLICY IF EXISTS "business_profiles_select_admin" ON business_profiles;
DROP POLICY IF EXISTS "business_members_select_own_business" ON business_members;
DROP POLICY IF EXISTS "business_members_manage" ON business_members;
DROP POLICY IF EXISTS "business_members_manage_admin" ON business_members;
DROP POLICY IF EXISTS "business_members_select_member" ON business_members;
DROP POLICY IF EXISTS "business_members_insert_admin" ON business_members;
DROP POLICY IF EXISTS "business_members_select_admin" ON business_members;

-- Create a SECURITY DEFINER function to check business membership
-- This avoids recursive RLS evaluation on business_members
CREATE OR REPLACE FUNCTION is_business_member(p_business_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_business_owner(p_business_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND role = 'owner'
      AND accepted_at IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_business_admin(p_business_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND accepted_at IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Recreate business_profiles policies using the SECURITY DEFINER functions
CREATE POLICY "business_profiles_select_member" ON business_profiles FOR SELECT
  USING (is_business_member(business_profiles.id));

CREATE POLICY "business_profiles_update_owner" ON business_profiles FOR UPDATE
  USING (is_business_owner(business_profiles.id));

CREATE POLICY "business_profiles_insert_admin" ON business_profiles FOR INSERT
  WITH CHECK (has_role('admin') OR has_role('super_admin'));

CREATE POLICY "business_profiles_select_admin" ON business_profiles FOR SELECT
  USING (get_user_role() IN ('admin', 'super_admin'));

-- Recreate business_members policies using the SECURITY DEFINER functions
CREATE POLICY "business_members_select_member" ON business_members FOR SELECT
  USING (is_business_member(business_members.business_id));

CREATE POLICY "business_members_manage_admin" ON business_members FOR ALL
  USING (is_business_admin(business_members.business_id));

CREATE POLICY "business_members_insert_admin" ON business_members FOR INSERT
  WITH CHECK (is_business_admin(business_members.business_id));

CREATE POLICY "business_members_select_admin" ON business_members FOR SELECT
  USING (get_user_role() IN ('admin', 'super_admin'));
