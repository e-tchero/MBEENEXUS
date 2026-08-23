-- =============================================
-- RIDER DOCUMENTS
-- Verification document uploads for rider onboarding
-- =============================================

CREATE TABLE IF NOT EXISTS rider_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES rider_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'government_id', 'vehicle_registration', 'insurance',
    'drivers_license', 'proof_of_address', 'other'
  )),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected'
  )),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_documents_rider ON rider_documents(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_documents_status ON rider_documents(status) WHERE status = 'pending';

-- =============================================
-- RIDER VERIFICATION HISTORY
-- Audit trail for verification status changes
-- =============================================

CREATE TABLE IF NOT EXISTS rider_verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES rider_profiles(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_verification_history_rider ON rider_verification_history(rider_id);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Rider documents
ALTER TABLE rider_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rider_documents_select_own" ON rider_documents
  FOR SELECT USING (rider_id = auth.uid());

CREATE POLICY "rider_documents_insert_own" ON rider_documents
  FOR INSERT WITH CHECK (rider_id = auth.uid());

CREATE POLICY "rider_documents_select_admin" ON rider_documents
  FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "rider_documents_update_admin" ON rider_documents
  FOR UPDATE USING (get_user_role() IN ('admin', 'super_admin'));

-- Rider verification history
ALTER TABLE rider_verification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rider_verification_history_select_admin" ON rider_verification_history
  FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "rider_verification_history_insert_admin" ON rider_verification_history
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "rider_verification_history_select_own" ON rider_verification_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM rider_profiles WHERE rider_profiles.id = rider_verification_history.rider_id AND rider_profiles.id = auth.uid())
  );

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT SELECT ON rider_documents TO authenticated;
GRANT INSERT ON rider_documents TO authenticated;
GRANT UPDATE ON rider_documents TO service_role;
GRANT ALL ON rider_documents TO service_role;

GRANT SELECT ON rider_verification_history TO authenticated;
GRANT INSERT ON rider_verification_history TO service_role;
GRANT ALL ON rider_verification_history TO service_role;
