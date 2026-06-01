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

-- v2: Stripe webhook event idempotency.
-- Prevents duplicate processing (welcome email, vault upsert) when Stripe
-- retries a webhook. id is the Stripe event ID (evt_xxx).
-- No RLS needed — only ever accessed via service role key in the webhook handler.
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id           TEXT        PRIMARY KEY,
  event_type   TEXT        NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- v4: Direct email-to-user-id lookup for vault release requests.
-- Replaces the paginated listUsers loop in /api/release with a single indexed query.
-- SECURITY DEFINER runs as the postgres superuser so it can read auth.users,
-- which is otherwise inaccessible to the service role via the JS client.
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;

-- v3: Allow authenticated users to write activity log entries for their own vaults.
-- Required for client-side activity logging from vault pages (assets, documents, etc.).
-- The SELECT policy already exists; this adds the INSERT counterpart.
CREATE POLICY "own activity only - insert" ON vault_activity_log
  FOR INSERT WITH CHECK (vault_id IN (SELECT id FROM vaults WHERE user_id = auth.uid()));

-- v6: Grant table-level access to vault_letters for authenticated and service_role.
-- Tables created via SQL editor do not receive automatic grants in all Supabase
-- configurations. Without these, both the authenticated and service_role users
-- receive "permission denied for table vault_letters" regardless of RLS policies.
-- Also adds an explicit INSERT policy — FOR ALL USING does not reliably cover
-- the INSERT path of an upsert in all Supabase versions.
GRANT ALL ON TABLE vault_letters TO authenticated;
GRANT ALL ON TABLE vault_letters TO service_role;

CREATE POLICY "own letter only - insert" ON vault_letters
  FOR INSERT WITH CHECK (vault_id IN (SELECT id FROM vaults WHERE user_id = auth.uid()));

-- ============================================================
-- v7: RLS hardening — lock down service-role-only tables and
--     add storage policy for the release-documents bucket.
-- Run in Supabase SQL Editor.
-- ============================================================

-- vault_release_requests contains PII (names, emails, phones, vault IDs).
-- It is accessed exclusively via the service role. Enabling RLS with a
-- deny-all permissive policy ensures no accidental access via the anon or
-- authenticated keys if RLS is ever probed directly.
-- Service role bypasses RLS entirely and is unaffected by these policies.
ALTER TABLE vault_release_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access" ON vault_release_requests
  FOR ALL USING (false) WITH CHECK (false);

-- Grants so service_role retains table-level permission (defence against
-- misconfigured Supabase projects that strip default grants).
GRANT ALL ON TABLE vault_release_requests TO service_role;

-- vault_release_tokens contains short-lived vault access tokens.
-- Same access model: service role only.
ALTER TABLE vault_release_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access" ON vault_release_tokens
  FOR ALL USING (false) WITH CHECK (false);

GRANT ALL ON TABLE vault_release_tokens TO service_role;

-- stripe_webhook_events is the idempotency table for Stripe webhooks.
-- Accessed only by the webhook handler (service role).
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access" ON stripe_webhook_events
  FOR ALL USING (false) WITH CHECK (false);

GRANT ALL ON TABLE stripe_webhook_events TO service_role;

-- Storage RLS for release-documents bucket (death certificates).
-- /api/release uploads via service role (bypasses storage RLS automatically).
-- These policies deny any direct access from anon/authenticated clients,
-- preventing death certificates from being read or written outside the
-- controlled service-role code path.
CREATE POLICY "release-documents: deny direct access - select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'release-documents' AND false);

CREATE POLICY "release-documents: deny direct access - insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'release-documents' AND false);

CREATE POLICY "release-documents: deny direct access - delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'release-documents' AND false);

-- ============================================================
-- v8: Add subscription expiry date for annual billing tracking.
-- Set to 1 year from payment date on checkout.session.completed
-- and refreshed on each invoice.payment_succeeded (renewal).
-- Run in Supabase SQL Editor.
-- ============================================================
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS subscription_expiry_date TIMESTAMPTZ;
