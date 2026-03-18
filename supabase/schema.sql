-- ══════════════════════════════════════════════════════════════
-- CLERESTORY — Database Schema v11
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ─── PROPERTIES ─────────────────────────────────────────────
create table properties (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  address text,
  city text,
  zip text,
  submarket text,
  record_type text,
  prop_type text,
  building_sf integer,
  land_acres numeric(10,2),
  year_built integer,
  clear_height integer,
  dock_doors integer,
  grade_doors integer,
  owner text,
  owner_type text,
  last_transfer_date date,
  last_sale_price numeric(15,2),
  price_psf numeric(10,2),
  tenant text,
  vacancy_status text,
  lease_expiration date,
  catalyst_tags text[],
  ai_score integer,
  probability integer,
  notes text,
  onedrive_url text,
  owner_account_id uuid references accounts(id) on delete set null
);

create table property_apns (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references properties(id) on delete cascade,
  apn text not null,
  acres numeric(10,2),
  created_at timestamptz default now()
);
create index idx_apns_property on property_apns(property_id);
create index idx_apns_apn on property_apns(apn);

-- ─── LEADS ──────────────────────────────────────────────────
create table leads (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  lead_name text not null,
  stage text default 'Lead',
  property_id uuid references properties(id) on delete set null,
  address text,
  submarket text,
  market text,
  owner text,
  owner_type text,
  company text,
  decision_maker text,
  phone text,
  email text,
  catalyst_tags text[],
  tier text,
  score integer,
  priority text default 'Medium',
  next_action text,
  next_action_date date,
  last_contact_date date,
  est_value numeric(15,2),
  building_sf integer,
  notes text,
  converted_deal_id uuid
);

-- ─── DEALS ──────────────────────────────────────────────────
create table deals (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deal_name text,
  stage text default 'Lead',
  deal_type text,
  strategy text,
  property_id uuid references properties(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  address text,
  submarket text,
  market text,
  buyer text,
  seller text,
  tenant_name text,
  deal_value numeric(15,2),
  commission_rate numeric(5,2),
  commission_est numeric(15,2),
  probability integer,
  priority text default 'Medium',
  close_date date,
  onedrive_url text,
  buyer_account_id uuid references accounts(id) on delete set null,
  seller_account_id uuid references accounts(id) on delete set null,
  notes text
);

-- ─── CONTACTS ───────────────────────────────────────────────
create table contacts (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  name text,
  company text,
  title text,
  contact_type text,
  phone text,
  email text,
  linkedin text,
  property_id uuid references properties(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  notes text
);

-- ─── ACCOUNTS ───────────────────────────────────────────────
create table accounts (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Identity
  name text not null,
  account_type text,
  entity_type text,
  buyer_type text,
  market text,
  city text,
  hq_state text,
  phone text,
  email text,
  website text,

  -- Buyer Criteria (Powers Matching Engine)
  preferred_markets text[],
  deal_type_preference text[],
  product_preference text[],
  min_sf integer,
  max_sf integer,
  min_price numeric(15,2),
  max_price numeric(15,2),
  min_price_psf numeric(10,2),
  max_price_psf numeric(10,2),
  yield_target numeric(5,2),
  irr_target numeric(5,2),
  risk_profile text,
  acquisition_timing text,
  min_clear_height integer,
  power_requirement text,
  geographic_focus text,
  last_criteria_update date,

  -- Activity & Intelligence
  buyer_activity_score integer default 0,
  buyer_velocity_score integer default 0,
  total_deals_closed integer default 0,
  total_deal_value numeric(15,2) default 0,
  last_deal_close_date date,
  known_acquisitions text,
  ai_account_summary text,
  est_capital_deployed text,
  deal_count text,

  -- Owner-Side
  slb_candidate boolean default false,
  portfolio_size integer,
  source text,
  notes text
);

create index idx_accounts_buyer_type on accounts(buyer_type);
create index idx_accounts_timing on accounts(acquisition_timing);
create index idx_accounts_name on accounts(name);

-- ─── TASKS ──────────────────────────────────────────────────
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  title text not null,
  description text,
  due_date date,
  priority text default 'Medium',   -- High | Medium | Low
  completed boolean default false,
  completed_at timestamptz,

  -- Link to any record (optional)
  lead_id uuid references leads(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  account_id uuid references accounts(id) on delete set null
);

create trigger trg_tasks_updated before update on tasks
  for each row execute function update_updated_at();

-- ─── ACTIVITIES ─────────────────────────────────────────────
create table activities (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  activity_type text not null,
  subject text,
  notes text,
  activity_date date default current_date,
  due_date date,
  completed boolean default false,
  outcome text,
  property_id uuid references properties(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null
);

-- ─── LEASE COMPS ────────────────────────────────────────────
create table lease_comps (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  address text, city text, submarket text, tenant text,
  rsf integer, rate numeric(8,2), lease_type text,
  term_months integer, start_date date,
  free_rent_months integer, ti_psf numeric(8,2),
  property_id uuid references properties(id) on delete set null,
  notes text
);

-- ─── SALE COMPS ─────────────────────────────────────────────
create table sale_comps (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  address text, city text, submarket text,
  building_sf integer, land_acres numeric(10,2),
  year_built integer, clear_height integer,
  sale_price numeric(15,2), price_psf numeric(10,2),
  cap_rate numeric(5,2), sale_date date,
  buyer text, seller text,
  sale_type text,
  property_id uuid references properties(id) on delete set null,
  notes text
);

-- ─── TIMESTAMPS ─────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_properties_updated before update on properties for each row execute function update_updated_at();
create trigger trg_leads_updated before update on leads for each row execute function update_updated_at();
create trigger trg_deals_updated before update on deals for each row execute function update_updated_at();
create trigger trg_contacts_updated before update on contacts for each row execute function update_updated_at();
create trigger trg_accounts_updated before update on accounts for each row execute function update_updated_at();

-- ─── VIEW: Properties with APNs ─────────────────────────────
create or replace view properties_with_apns as
select p.*, coalesce(json_agg(json_build_object('apn', a.apn, 'acres', a.acres)) filter (where a.id is not null), '[]'::json) as apns
from properties p left join property_apns a on a.property_id = p.id group by p.id;
