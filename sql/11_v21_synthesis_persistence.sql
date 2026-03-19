-- ══════════════════════════════════════════════════════════════
-- CLERESTORY v21 — AI Synthesis persistence on records
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Store synthesis directly on the record (like morning brief on daily_briefs)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_synthesis text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_synthesis_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_synthesis text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_synthesis_at timestamptz;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ai_synthesis text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ai_synthesis_at timestamptz;

-- Also ensure substeps column exists
ALTER TABLE leads ADD COLUMN IF NOT EXISTS substeps jsonb DEFAULT '{}';
