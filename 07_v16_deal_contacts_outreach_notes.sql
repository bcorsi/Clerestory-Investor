-- ══════════════════════════════════════════════════════════════
-- CLERESTORY — RLS Policies (permissive for single-user)
-- Run this in Supabase SQL Editor to fix blocked queries
-- ══════════════════════════════════════════════════════════════

-- Option A: Just disable RLS on all tables (simplest for single user)
-- Uncomment these if you just want RLS off:

-- ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE property_apns DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE property_buildings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE lease_comps DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE sale_comps DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_briefs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE follow_ups DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE deal_contacts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE buyer_outreach DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE warn_notices DISABLE ROW LEVEL SECURITY;

-- Option B: Keep RLS enabled but allow all authenticated users full access
-- This is the right approach — run these:

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'properties', 'property_apns', 'property_buildings',
      'leads', 'deals', 'contacts', 'accounts',
      'tasks', 'activities', 'lease_comps', 'sale_comps',
      'daily_briefs', 'notes', 'follow_ups',
      'deal_contacts', 'buyer_outreach', 'warn_notices'
    ])
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', tbl);
    
    -- Drop existing policies if any
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon read" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON %I', tbl);
    
    -- Create permissive policy for authenticated users (full CRUD)
    EXECUTE format(
      'CREATE POLICY "Allow all for authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl
    );
    
    -- Also allow anon access (for when Supabase anon key is used without login)
    EXECUTE format(
      'CREATE POLICY "Allow anon read" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;
