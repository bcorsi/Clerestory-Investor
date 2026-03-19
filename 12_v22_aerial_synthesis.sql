-- ══════════════════════════════════════════════════════════════
-- CLERESTORY v15 — Pipeline Upgrade Migration
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ─── DEALS: new fields + fix stage defaults ─────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS marketing_type text DEFAULT 'Off-Market';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS onedrive_url text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS market text;
ALTER TABLE deals ALTER COLUMN stage SET DEFAULT 'Tracking';

-- Fix old stage names from previous versions
UPDATE deals SET stage = 'Tracking' WHERE stage IN ('Lead', 'Owner Contacted');
UPDATE deals SET stage = 'Marketing' WHERE stage IN ('Meeting/Proposal', 'Listing/Marketing');
UPDATE deals SET stage = 'LOI Accepted/PSA' WHERE stage IN ('Executed LOI', 'PSA Negotiation', 'LOI Accepted/PSA');
UPDATE deals SET stage = 'Closing' WHERE stage = 'Non-Contingent';

-- ─── LEADS: kill reason + market ─────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS kill_reason text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS killed_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS market text;

-- Fix old lead stages
UPDATE leads SET stage = 'Owner Contacted' WHERE stage = 'Meeting/Proposal';

-- ─── DAILY BRIEFS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_briefs (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  brief_date date default current_date,
  content text not null,
  context jsonb
);
CREATE INDEX IF NOT EXISTS idx_briefs_date ON daily_briefs(brief_date);
