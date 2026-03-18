-- ══════════════════════════════════════════════════════════════
-- CLERESTORY v16 — Deal Contacts, Outreach, Notes, Follow-Ups
-- Run in Supabase SQL Editor AFTER v15 migrations
-- ══════════════════════════════════════════════════════════════

-- ─── DEAL CONTACTS (junction) ───────────────────────────────
CREATE TABLE IF NOT EXISTS deal_contacts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role text DEFAULT 'Participant',
  UNIQUE(deal_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_deal ON deal_contacts(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_contact ON deal_contacts(contact_id);

-- ─── BUYER OUTREACH LOG ─────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_outreach_deal ON buyer_outreach(deal_id);
CREATE INDEX IF NOT EXISTS idx_outreach_account ON buyer_outreach(account_id);

-- ─── NOTES TIMELINE ─────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_notes_deal ON notes(deal_id);
CREATE INDEX IF NOT EXISTS idx_notes_lead ON notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_notes_property ON notes(property_id);
CREATE INDEX IF NOT EXISTS idx_notes_account ON notes(account_id);

-- ─── FOLLOW-UPS ─────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_followups_due ON follow_ups(due_date) WHERE NOT completed;
CREATE INDEX IF NOT EXISTS idx_followups_deal ON follow_ups(deal_id);
CREATE INDEX IF NOT EXISTS idx_followups_lead ON follow_ups(lead_id);

-- ─── LEADS: property detail columns ─────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS zip text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS prop_type text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS record_type text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS land_acres numeric(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS year_built integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS clear_height integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS dock_doors integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS grade_doors integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS vacancy_status text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lease_type text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lease_expiration date;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS in_place_rent numeric(8,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS owner_type text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS onedrive_url text;

-- ─── PROPERTIES: add missing columns ────────────────────────
ALTER TABLE properties ADD COLUMN IF NOT EXISTS market text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lease_type text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS in_place_rent numeric(8,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS market_rent numeric(8,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS office_pct integer;

-- ─── ACTIVITIES: add account_id ─────────────────────────────
ALTER TABLE activities ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
