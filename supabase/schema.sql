-- ============================================================
-- Antim Digital Vault — Supabase Schema
-- Run this in the Supabase SQL editor (project: ap-south-1)
-- ============================================================

-- Vaults (one per user)
CREATE TABLE IF NOT EXISTS vaults (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_status TEXT DEFAULT 'inactive',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  consent_given BOOLEAN DEFAULT FALSE,
  consent_given_at TIMESTAMPTZ
);

-- Asset registry
CREATE TABLE IF NOT EXISTS vault_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  institution_name TEXT,
  account_number TEXT,
  description TEXT,
  nominee_name TEXT,
  agent_contact TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents metadata
CREATE TABLE IF NOT EXISTS vault_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  category TEXT NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nominees
CREATE TABLE IF NOT EXISTS vault_nominees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Letters (encrypted)
CREATE TABLE IF NOT EXISTS vault_letters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE NOT NULL UNIQUE,
  encrypted_content TEXT,
  last_edited TIMESTAMPTZ DEFAULT NOW()
);

-- Release requests from nominees
CREATE TABLE IF NOT EXISTS vault_release_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE,
  deceased_email TEXT NOT NULL,
  requested_by_name TEXT NOT NULL,
  requested_by_email TEXT NOT NULL,
  requested_by_phone TEXT,
  relationship TEXT,
  death_certificate_path TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Temporary nominee access tokens
CREATE TABLE IF NOT EXISTS vault_release_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

-- Activity log
CREATE TABLE IF NOT EXISTS vault_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vault only" ON vaults
  USING (auth.uid() = user_id);

ALTER TABLE vault_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assets only" ON vault_assets
  USING (vault_id IN (SELECT id FROM vaults WHERE user_id = auth.uid()));

ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents only" ON vault_documents
  USING (vault_id IN (SELECT id FROM vaults WHERE user_id = auth.uid()));

ALTER TABLE vault_nominees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nominees only" ON vault_nominees
  USING (vault_id IN (SELECT id FROM vaults WHERE user_id = auth.uid()));

ALTER TABLE vault_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own letter only" ON vault_letters
  USING (vault_id IN (SELECT id FROM vaults WHERE user_id = auth.uid()));

ALTER TABLE vault_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity only" ON vault_activity_log
  FOR SELECT USING (vault_id IN (SELECT id FROM vaults WHERE user_id = auth.uid()));

-- vault_release_requests and vault_release_tokens: no RLS needed
-- (public release requests are inserted without auth; admin reads via service role)

-- ============================================================
-- STORAGE RLS (run after creating buckets in dashboard)
-- ============================================================

CREATE POLICY "own files only - insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vault-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "own files only - select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vault-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "own files only - delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vault-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- STORAGE BUCKETS — create via Supabase dashboard or CLI:
--
-- 1. vault-documents  (private, 10MB max, pdf/jpg/png/webp)
-- 2. release-documents (private, 10MB max, admin only)
-- ============================================================

-- ============================================================
-- MIGRATIONS — run after initial schema is applied
-- ============================================================

-- v1: Track when a nominee actually opened the vault via a release link.
-- Displayed as "Last accessed by nominee" on the vault dashboard.
ALTER TABLE vault_release_tokens
  ADD COLUMN IF NOT EXISTS accessed_at TIMESTAMPTZ;
