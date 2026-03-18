-- ══════════════════════════════════════════════════════════════
-- CLERESTORY v17 — Two-Tier Data Model: Buildings + Parcels
-- Run in Supabase SQL Editor AFTER all prior migrations
-- ══════════════════════════════════════════════════════════════

-- ─── 1. CREATE BUILDINGS TABLE ──────────────────────────────

CREATE TABLE IF NOT EXISTS property_buildings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  building_name text,              -- e.g. "Building A", "Warehouse 1"
  building_sf integer,
  clear_height integer,
  dock_doors integer DEFAULT 0,
  grade_doors integer DEFAULT 0,
  year_built integer,
  office_pct integer,              -- % office finish
  prop_type text,                  -- can differ per building (warehouse vs flex)
  notes text
);

CREATE INDEX IF NOT EXISTS idx_buildings_property ON property_buildings(property_id);

-- ─── 2. AUTO-MIGRATE: Create Building #1 from existing property data ──

INSERT INTO property_buildings (property_id, building_name, building_sf, clear_height, dock_doors, grade_doors, year_built, office_pct, prop_type)
SELECT
  p.id,
  'Building 1',
  p.building_sf,
  p.clear_height,
  p.dock_doors,
  p.grade_doors,
  p.year_built,
  p.office_pct,
  p.prop_type
FROM properties p
WHERE p.building_sf IS NOT NULL
  AND p.building_sf > 0
  AND NOT EXISTS (
    SELECT 1 FROM property_buildings pb WHERE pb.property_id = p.id
  );

-- ─── 3. RECREATE VIEW with buildings + parcels rollups ──────

DROP VIEW IF EXISTS properties_with_apns;

CREATE OR REPLACE VIEW properties_with_apns AS
SELECT
  p.*,
  -- Parcel rollups (existing)
  COALESCE(
    json_agg(DISTINCT jsonb_build_object('id', a.id, 'apn', a.apn, 'acres', a.acres))
    FILTER (WHERE a.id IS NOT NULL), '[]'::json
  ) AS apns,
  -- Building rollups
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
  -- Computed rollup fields
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

-- ─── 4. Add cadence + market fields if missing ─────────────

ALTER TABLE properties ADD COLUMN IF NOT EXISTS follow_up_cadence text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS market text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lease_type text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS in_place_rent numeric(8,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS market_rent numeric(8,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS office_pct integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_cadence text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS follow_up_cadence text;
