-- ══════════════════════════════════════════════════════════════
-- CLERESTORY v14 — Deals Pipeline Upgrade Migration
-- Run this in Supabase SQL Editor if upgrading from v13
-- ══════════════════════════════════════════════════════════════

-- Add missing columns to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS onedrive_url text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS market text;

-- Update default stage for new deals (10-stage pipeline now starts at Lead)
ALTER TABLE deals ALTER COLUMN stage SET DEFAULT 'Lead';

-- Fix any deals stuck on old stage names from v13
UPDATE deals SET stage = 'LOI Accepted/PSA' WHERE stage = 'Executed LOI';
UPDATE deals SET stage = 'LOI Accepted/PSA' WHERE stage = 'PSA Negotiation';
UPDATE deals SET stage = 'Closing' WHERE stage = 'Non-Contingent';

-- Add market column to leads if missing
ALTER TABLE leads ADD COLUMN IF NOT EXISTS market text;
