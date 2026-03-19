-- ══════════════════════════════════════════════════════════════
-- CLERESTORY v19 — Lead Substeps, Timeline Carryover
-- Run in Supabase SQL Editor AFTER v17 migrations
-- ══════════════════════════════════════════════════════════════

-- Lead substeps stored as JSONB (e.g. {"Research company online": true, ...})
ALTER TABLE leads ADD COLUMN IF NOT EXISTS substeps jsonb DEFAULT '{}';

-- Ensure notes/activities/follow_ups have all FK columns for carryover
ALTER TABLE notes ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES deals(id) ON DELETE CASCADE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES deals(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES deals(id) ON DELETE CASCADE;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE;
