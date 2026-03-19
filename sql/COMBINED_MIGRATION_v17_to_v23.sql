-- ══════════════════════════════════════════════════════════════
-- CLERESTORY — COMBINED MIGRATION (v17 through v23)
-- Run this ONCE in Supabase SQL Editor
-- Safe to run multiple times (all IF NOT EXISTS / IF EXISTS)
-- ══════════════════════════════════════════════════════════════

-- ─── PROPERTY BUILDINGS (two-tier model) ────────────────────
CREATE TABLE IF NOT EXISTS property_buildings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  building_name text,
  building_sf integer,
  clear_height integer,
  dock_doors integer DEFAULT 0,
  grade_doors integer DEFAULT 0,
  year_built integer,
  office_pct integer,
  prop_type text,
  notes text
);
CREATE INDEX IF NOT EXISTS idx_buildings_property ON property_buildings(property_id);

-- Auto-migrate existing properties to Building 1
INSERT INTO property_buildings (property_id, building_name, building_sf, clear_height, dock_doors, grade_doors, year_built, office_pct, prop_type)
SELECT p.id, 'Building 1', p.building_sf, p.clear_height, p.dock_doors, p.grade_doors, p.year_built, p.office_pct, p.prop_type
FROM properties p
WHERE p.building_sf IS NOT NULL AND p.building_sf > 0
  AND NOT EXISTS (SELECT 1 FROM property_buildings pb WHERE pb.property_id = p.id);

-- ─── DEAL CONTACTS (junction table) ────────────────────────
CREATE TABLE IF NOT EXISTS deal_contacts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role text DEFAULT 'Participant',
  UNIQUE(deal_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_deal ON deal_contacts(deal_id);

-- ─── BUYER OUTREACH LOG ────────────────────────────────────
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

-- ─── NOTES TIMELINE ────────────────────────────────────────
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

-- ─── FOLLOW-UPS ────────────────────────────────────────────
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

-- ─── WARN NOTICES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warn_notices (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  county text, notice_date date, effective_date date,
  company text NOT NULL, employees integer DEFAULT 0,
  address text, event_type text, sic_code text,
  is_industrial boolean DEFAULT false, is_in_market boolean DEFAULT false,
  tenant_match boolean DEFAULT false,
  matched_property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  research_notes text,
  converted_lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  UNIQUE(county, company, notice_date, employees)
);

-- ─── ADD COLUMNS TO EXISTING TABLES ────────────────────────

-- Properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS follow_up_cadence text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS market text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lease_type text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS in_place_rent numeric(8,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS market_rent numeric(8,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS office_pct integer;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS aerial_url text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_synthesis text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_synthesis_at timestamptz;

-- Leads
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
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_cadence text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS substeps jsonb DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_synthesis text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_synthesis_at timestamptz;

-- Deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS follow_up_cadence text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ai_synthesis text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ai_synthesis_at timestamptz;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS underwriting_inputs jsonb;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS underwriting_memo text;

-- Activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

-- ─── REBUILD VIEW WITH BUILDINGS + ROLLUPS ─────────────────

DROP VIEW IF EXISTS properties_with_apns;

CREATE OR REPLACE VIEW properties_with_apns AS
SELECT
  p.*,
  COALESCE(
    json_agg(DISTINCT jsonb_build_object('id', a.id, 'apn', a.apn, 'acres', a.acres))
    FILTER (WHERE a.id IS NOT NULL), '[]'::json
  ) AS apns,
  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', b.id, 'building_name', b.building_name,
      'building_sf', b.building_sf, 'clear_height', b.clear_height,
      'dock_doors', b.dock_doors, 'grade_doors', b.grade_doors,
      'year_built', b.year_built, 'office_pct', b.office_pct,
      'prop_type', b.prop_type, 'notes', b.notes
    ))
    FILTER (WHERE b.id IS NOT NULL), '[]'::json
  ) AS buildings,
  COALESCE((SELECT SUM(bs.building_sf) FROM property_buildings bs WHERE bs.property_id = p.id), 0) AS total_sf,
  COALESCE((SELECT MAX(bs.clear_height) FROM property_buildings bs WHERE bs.property_id = p.id), 0) AS max_clear_height,
  COALESCE((SELECT SUM(bs.dock_doors) FROM property_buildings bs WHERE bs.property_id = p.id), 0) AS total_dock_doors,
  COALESCE((SELECT SUM(bs.grade_doors) FROM property_buildings bs WHERE bs.property_id = p.id), 0) AS total_grade_doors,
  (SELECT COUNT(*) FROM property_buildings bs WHERE bs.property_id = p.id) AS building_count,
  (SELECT COUNT(*) FROM property_apns pa WHERE pa.property_id = p.id) AS parcel_count,
  COALESCE((SELECT SUM(pa.acres) FROM property_apns pa WHERE pa.property_id = p.id), 0) AS total_acres
FROM properties p
LEFT JOIN property_apns a ON a.property_id = p.id
LEFT JOIN property_buildings b ON b.property_id = p.id
GROUP BY p.id;

-- ─── DISABLE RLS ON ALL TABLES ─────────────────────────────

ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_apns DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE lease_comps DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_comps DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_briefs DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups DISABLE ROW LEVEL SECURITY;
ALTER TABLE deal_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_outreach DISABLE ROW LEVEL SECURITY;
ALTER TABLE warn_notices DISABLE ROW LEVEL SECURITY;

-- v25: File links
ALTER TABLE properties ADD COLUMN IF NOT EXISTS file_links jsonb DEFAULT '[]';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS file_links jsonb DEFAULT '[]';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS file_links jsonb DEFAULT '[]';
