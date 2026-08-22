-- FIX: Missing RLS policies for addresses table
-- RLS was enabled but no policies existed, blocking all address operations

-- Customer can read their own addresses
CREATE POLICY "addresses_select_own" ON addresses
  FOR SELECT USING (user_id = auth.uid());

-- Customer can insert addresses (user_id must match authenticated user)
CREATE POLICY "addresses_insert_own" ON addresses
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Customer can update their own addresses
CREATE POLICY "addresses_update_own" ON addresses
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Customer can delete their own addresses
CREATE POLICY "addresses_delete_own" ON addresses
  FOR DELETE USING (user_id = auth.uid());

-- Admin can read all addresses
CREATE POLICY "addresses_select_admin" ON addresses
  FOR SELECT USING (get_user_role() IN ('admin', 'super_admin', 'operations'));

-- Admin can update any address
CREATE POLICY "addresses_update_admin" ON addresses
  FOR UPDATE USING (get_user_role() IN ('admin', 'super_admin', 'operations'));

-- Admin can delete any address
CREATE POLICY "addresses_delete_admin" ON addresses
  FOR DELETE USING (get_user_role() IN ('admin', 'super_admin'));
