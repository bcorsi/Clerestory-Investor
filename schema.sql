-- ══════════════════════════════════════════════════════════════
-- CLERESTORY v15 — Daily Briefs + Pipeline Stage Fixes
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Daily AI briefs (persists across sessions)
CREATE TABLE IF NOT EXISTS daily_briefs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  brief_date date DEFAULT current_date UNIQUE,
  brief_text text NOT NULL,
  context jsonb
);

CREATE INDEX IF NOT EXISTS idx_daily_briefs_date ON daily_briefs(brief_date DESC);

-- Fix deal stages to new pipeline
UPDATE deals SET stage = 'Tracking' WHERE stage = 'Lead';
UPDATE deals SET stage = 'Marketing' WHERE stage = 'Listing/Marketing';
UPDATE deals SET stage = 'Marketing' WHERE stage = 'Meeting/Proposal';
UPDATE deals SET stage = 'Marketing' WHERE stage = 'Owner Contacted';
UPDATE deals SET stage = 'LOI Accepted/PSA' WHERE stage = 'Executed LOI';
UPDATE deals SET stage = 'LOI Accepted/PSA' WHERE stage = 'PSA Negotiation';
UPDATE deals SET stage = 'Closing' WHERE stage = 'Non-Contingent';

ALTER TABLE deals ALTER COLUMN stage SET DEFAULT 'Tracking';

-- Add marketing_type and kill_reason columns
ALTER TABLE deals ADD COLUMN IF NOT EXISTS marketing_type text DEFAULT 'Off-Market';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS kill_reason text;

-- Remove Meeting/Proposal from lead stages (only Lead + Owner Contacted now)
UPDATE leads SET stage = 'Owner Contacted' WHERE stage = 'Meeting/Proposal';
