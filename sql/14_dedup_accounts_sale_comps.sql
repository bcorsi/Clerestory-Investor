-- ══════════════════════════════════════════════════════════════
-- CLERESTORY — Dedup: Accounts & Sale Comps
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ─── ACCOUNTS DEDUP ──────────────────────────────────────────
-- Preview duplicates first:
-- SELECT name, count(*) FROM accounts GROUP BY lower(trim(name)) HAVING count(*) > 1;

-- Delete duplicate accounts, keeping the one with the lowest ID (oldest)
DELETE FROM accounts
WHERE id IN (
  SELECT a.id FROM accounts a
  INNER JOIN accounts b
    ON lower(trim(a.name)) = lower(trim(b.name))
    AND a.id > b.id
);

-- ─── SALE COMPS DEDUP ────────────────────────────────────────
-- Preview duplicates first:
-- SELECT address, building_sf, sale_price, count(*) FROM sale_comps GROUP BY address, building_sf, sale_price HAVING count(*) > 1;

-- Delete duplicate sale comps (same address + building SF + sale price)
DELETE FROM sale_comps
WHERE id IN (
  SELECT a.id FROM sale_comps a
  INNER JOIN sale_comps b
    ON a.address = b.address
    AND COALESCE(a.building_sf, 0) = COALESCE(b.building_sf, 0)
    AND COALESCE(a.sale_price, 0) = COALESCE(b.sale_price, 0)
    AND a.id > b.id
);

-- Also catch exact-address duplicates that differ only by appended text
-- e.g. "9988 Redwood Ave" vs "9988 Redwood Ave (Part of a 663 Property Portfolio)"
DELETE FROM sale_comps
WHERE id IN (
  SELECT a.id FROM sale_comps a
  INNER JOIN sale_comps b
    ON split_part(a.address, ' (', 1) = split_part(b.address, ' (', 1)
    AND COALESCE(a.building_sf, 0) = COALESCE(b.building_sf, 0)
    AND COALESCE(a.sale_price, 0) = COALESCE(b.sale_price, 0)
    AND a.sale_date = b.sale_date
    AND a.id > b.id
    AND a.address != b.address
);

-- Verify counts after dedup:
-- SELECT 'accounts' as tbl, count(*) FROM accounts
-- UNION ALL SELECT 'sale_comps', count(*) FROM sale_comps;
