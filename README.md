# CLERESTORY v14 — Morning Command Center + 10-Stage Pipeline

## What's New in v14

### Morning Command Center (replaces Dashboard)
- **AI Morning Brief** — click one button, Claude analyzes your pipeline, leads, tasks, and gives you a 2-3 sentence action plan for the day
- **5 stat cards** — Pipeline value, Commission (with weighted), Active Leads (hot count), Properties (total SF), Tasks Due (with overdue alerts in red)
- **3-column layout:**
  - **Today's Actions** — overdue tasks in red, today's tasks, this week preview + Catalyst Alerts (immediate/high urgency signals)
  - **Pipeline Momentum** — full stage breakdown with deal counts + value per stage, closing-this-month callout + Lead Funnel (3-stage counts with hot lead indicators)
  - **Hot Leads** — A+/A tier ranked by score, clickable to detail + Recent Activity feed + Market summary
- **Time-aware greeting** — "Good morning" / "Good afternoon" / "Good evening"

### 10-Stage Deal Pipeline (fixed from v13)
- Full lifecycle: Lead → Owner Contacted → Meeting/Proposal → Listing/Marketing → Offers/LOI → LOI Accepted/PSA → Due Diligence → Closing → Closed → Dead
- Narrower kanban columns (230px) with horizontal scroll to fit all 10 stages
- Per-stage pipeline value in column headers
- Weighted commission + total pipeline + total commission in header bar
- Quick stage-move buttons in expanded card view
- Lead Gen converts to Deal at "Listing/Marketing" stage (next logical step after Meeting/Proposal)

### Lead Gen (3-stage prospecting funnel — unchanged)
- Lead → Owner Contacted → Meeting/Proposal
- AI Next Step button, substep checklists, tier badges
- Convert to Deal flows into Listing/Marketing stage

### Also Includes (from prior versions)
- 67 SoCal industrial buyer accounts with Buyer Matching Engine
- 208 seeded leads (113 IE-West + 95 SGV)
- 10 key contacts seeded
- Properties (table + detail + APNs + edit + photos + OneDrive + Google Maps)
- Contacts (expandable + detail page), Accounts (market pills, timing badges)
- Lease Comps (table + full detail page), Sale Comps
- Tasks + Activities
- Auth / Login / Profile
- Cmd+K global search, CSV import, PWA
- Ice blue theme

---

## Deployment

### FRESH INSTALL (never deployed before)

1. **Supabase** → Sign up → New project → SQL Editor → Paste `supabase/schema.sql` → Run
2. **Supabase** → SQL Editor → New query → Paste `sql/02_accounts_67_buyers.sql` → Run
3. **Supabase** → SQL Editor → New query → Paste `sql/03_contacts_seed.sql` → Run
4. **Supabase** → SQL Editor → New query → Paste `sql/04_leads_seed.sql` → Run
5. **Supabase** → Settings → API → Copy Project URL + anon key
6. **GitHub** → New repo → Upload all files from this zip (contents at root, package.json at top level)
7. **Vercel** → Import repo → Add env vars NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY → Deploy

### UPGRADE from v13

1. **Supabase** → SQL Editor → Paste `sql/05_deals_pipeline_upgrade.sql` → Run
2. **GitHub** → Replace all files from this zip → Commit → Vercel auto-redeploys

### UPGRADE from earlier versions (v12 or below)

1. **Supabase** → SQL Editor → Paste `sql/01_accounts_upgrade.sql` → Run
2. **Supabase** → SQL Editor → Paste `sql/02_accounts_67_buyers.sql` → Run
3. **Supabase** → SQL Editor → Paste `sql/03_contacts_seed.sql` → Run
4. **Supabase** → SQL Editor → Paste `sql/04_leads_seed.sql` → Run
5. **Supabase** → SQL Editor → Paste `sql/05_deals_pipeline_upgrade.sql` → Run
6. **GitHub** → Replace all files → Commit → Vercel auto-redeploys
