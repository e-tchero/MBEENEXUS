-- Phase 6M: Delivery Proof Photo Storage
-- Creates a private Supabase Storage bucket for delivery proof photos
-- and applies security policies for rider upload, customer/admin read access.

-- ============================================
-- 1. CREATE STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-proofs',
  'delivery-proofs',
  false,                          -- Private: no public access
  10485760,                       -- 10MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 2. STORAGE POLICIES
-- ============================================

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS delivery_proofs_upload_rider ON storage.objects;
DROP POLICY IF EXISTS delivery_proofs_read_customer ON storage.objects;
DROP POLICY IF EXISTS delivery_proofs_read_admin ON storage.objects;
DROP POLICY IF EXISTS delivery_proofs_read_rider ON storage.objects;

-- Policy: Rider can upload to path {order_id}/{rider_id}/{filename}
-- Validates that the rider is assigned to the order
CREATE POLICY delivery_proofs_upload_rider
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND (
    SELECT assigned_rider_id FROM orders
    WHERE id = (storage.foldername(name))[1]::uuid
  ) = auth.uid()
);

-- Policy: Customer can read their order's proof photos
CREATE POLICY delivery_proofs_read_customer
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = (storage.foldername(name))[1]::uuid
    AND orders.customer_id = auth.uid()
  )
);

-- Policy: Admin can read all delivery proof photos
CREATE POLICY delivery_proofs_read_admin
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'delivery-proofs'
  AND get_user_role() IN ('admin', 'super_admin')
);

-- Policy: Rider can read their own uploaded proof photos
CREATE POLICY delivery_proofs_read_rider
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'delivery-proofs'
  AND auth.uid() = (storage.foldername(name))[2]::uuid
);

-- ============================================
-- 3. ADMIN CUSTOMER LIST INDEX
-- ============================================

-- Partial index for admin customer list queries (profiles with role = 'customer')
CREATE INDEX IF NOT EXISTS idx_profiles_role_created
ON profiles (role, created_at DESC)
WHERE role = 'customer';
