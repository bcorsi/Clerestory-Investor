-- ══════════════════════════════════════════════════════════════
-- CLERESTORY — Accounts Schema Upgrade
-- Adds buyer criteria fields for the Buyer Matching Engine
-- Run in Supabase SQL Editor FIRST (before seed data)
-- ══════════════════════════════════════════════════════════════

-- ── Buyer Criteria (Powers Matching Engine) ──
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS buyer_type text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS hq_state text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS preferred_markets text[];
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deal_type_preference text[];
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS product_preference text[];
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS min_sf integer;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS max_sf integer;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS min_price numeric(15,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS max_price numeric(15,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS min_price_psf numeric(10,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS max_price_psf numeric(10,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS yield_target numeric(5,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS irr_target numeric(5,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS risk_profile text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS acquisition_timing text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS min_clear_height integer;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS power_requirement text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS geographic_focus text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_criteria_update date;

-- ── Activity & Intelligence ──
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS buyer_activity_score integer DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS buyer_velocity_score integer DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS total_deals_closed integer DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS total_deal_value numeric(15,2) DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_deal_close_date date;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS known_acquisitions text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_account_summary text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS est_capital_deployed text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deal_count text;

-- ── Owner-Side Fields ──
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS slb_candidate boolean DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS portfolio_size integer;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS source text;

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_accounts_buyer_type ON accounts(buyer_type);
CREATE INDEX IF NOT EXISTS idx_accounts_timing ON accounts(acquisition_timing);
CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);

-- ── Link contacts to accounts ──
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id);

-- ── Link properties to owner accounts ──
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_props_owner_account ON properties(owner_account_id);

-- ── Link deals to buyer/seller accounts ──
ALTER TABLE deals ADD COLUMN IF NOT EXISTS buyer_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS seller_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_deals_buyer_account ON deals(buyer_account_id);
CREATE INDEX IF NOT EXISTS idx_deals_seller_account ON deals(seller_account_id);

SELECT 'Accounts schema upgraded — buyer criteria fields added' as result;
