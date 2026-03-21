-- ══════════════════════════════════════════════════════════════
-- CLERESTORY v34 MIGRATION
-- Adds: enhanced lease comp fields, sale comp normalization,
--        owner search tracking
-- ══════════════════════════════════════════════════════════════

-- ── LEASE COMPS: New fields for full comp data ──────────────
ALTER TABLE lease_comps ADD COLUMN IF NOT EXISTS landlord TEXT;
ALTER TABLE lease_comps ADD COLUMN IF NOT EXISTS gross_equivalent NUMERIC;
ALTER TABLE lease_comps ADD COLUMN IF NOT EXISTS total_expenses_psf NUMERIC;
ALTER TABLE lease_comps ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE lease_comps ADD COLUMN IF NOT EXISTS escalation TEXT;
ALTER TABLE lease_comps ADD COLUMN IF NOT EXISTS deal_type TEXT;
ALTER TABLE lease_comps ADD COLUMN IF NOT EXISTS broker TEXT;
ALTER TABLE lease_comps ADD COLUMN IF NOT EXISTS source TEXT;

-- ── SALE COMPS: Ensure all needed fields exist ──────────────
ALTER TABLE sale_comps ADD COLUMN IF NOT EXISTS land_acres NUMERIC;
ALTER TABLE sale_comps ADD COLUMN IF NOT EXISTS clear_height NUMERIC;
ALTER TABLE sale_comps ADD COLUMN IF NOT EXISTS year_built INTEGER;

-- ── OWNER SEARCH HISTORY (optional tracking) ────────────────
CREATE TABLE IF NOT EXISTS owner_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  result JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new table
ALTER TABLE owner_searches ENABLE ROW LEVEL SECURITY;

-- RLS policy: allow all operations for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'owner_searches' AND policyname = 'owner_searches_all') THEN
    CREATE POLICY owner_searches_all ON owner_searches FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── INDEXES for comp analytics ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lease_comps_submarket ON lease_comps (submarket);
CREATE INDEX IF NOT EXISTS idx_lease_comps_start_date ON lease_comps (start_date);
CREATE INDEX IF NOT EXISTS idx_lease_comps_rate ON lease_comps (rate);
CREATE INDEX IF NOT EXISTS idx_sale_comps_submarket ON sale_comps (submarket);
CREATE INDEX IF NOT EXISTS idx_sale_comps_sale_date ON sale_comps (sale_date);
CREATE INDEX IF NOT EXISTS idx_sale_comps_price_psf ON sale_comps (price_psf);

-- ── GRANT permissions (if using Supabase anon role) ─────────
GRANT ALL ON owner_searches TO authenticated;
GRANT ALL ON owner_searches TO anon;
