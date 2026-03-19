-- ══════════════════════════════════════════════════════════════
-- CLERESTORY v17 — Cadences, WARN Notices, AI Two-Tier
-- Run in Supabase SQL Editor AFTER v16 migrations
-- ══════════════════════════════════════════════════════════════

-- ─── FOLLOW-UP CADENCE FIELDS ────────────────────────────────
ALTER TABLE properties ADD COLUMN IF NOT EXISTS follow_up_cadence text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_cadence text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS follow_up_cadence text;

-- ─── WARN NOTICES (optional — stores uploaded WARN data in DB) ─
CREATE TABLE IF NOT EXISTS warn_notices (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  county text,
  notice_date date,
  effective_date date,
  company text NOT NULL,
  employees integer DEFAULT 0,
  address text,
  event_type text,
  sic_code text,
  is_industrial boolean DEFAULT false,
  is_in_market boolean DEFAULT false,
  tenant_match boolean DEFAULT false,
  matched_property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  research_notes text,
  converted_lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  UNIQUE(county, company, notice_date, employees)
);
CREATE INDEX IF NOT EXISTS idx_warn_company ON warn_notices(company);
CREATE INDEX IF NOT EXISTS idx_warn_date ON warn_notices(notice_date);
CREATE INDEX IF NOT EXISTS idx_warn_match ON warn_notices(tenant_match) WHERE tenant_match = true;

-- ─── ENSURE deal_contacts and buyer_outreach exist ──────────
-- (These should already exist from v16 migration 07, but just in case)
CREATE TABLE IF NOT EXISTS deal_contacts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role text DEFAULT 'Participant',
  UNIQUE(deal_id, contact_id)
);

CREATE TABLE IF NOT EXISTS buyer_outreach (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  direction text DEFAULT 'Outbound',
  method text DEFAULT 'Email',
  outcome text,
  notes text,
  outreach_date date DEFAULT current_date,
  follow_up_date date
);

CREATE TABLE IF NOT EXISTS notes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  content text NOT NULL,
  note_type text DEFAULT 'Note',
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  pinned boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  due_date date NOT NULL,
  reason text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE
);
