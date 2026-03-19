-- ══════════════════════════════════════════════════════════════
-- CLERESTORY v22 — Aerial images, synthesis persistence
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

ALTER TABLE properties ADD COLUMN IF NOT EXISTS aerial_url text;

-- Ensure v21 columns exist
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_synthesis text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_synthesis_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_synthesis text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_synthesis_at timestamptz;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ai_synthesis text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ai_synthesis_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS substeps jsonb DEFAULT '{}';

-- Rebuild view to include aerial_url
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

-- v23: Underwriting fields on deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS underwriting_inputs jsonb;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS underwriting_memo text;
