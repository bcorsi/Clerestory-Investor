# Clerestory v17

## What's New in v17

### Two-Tier Data Model — Buildings + Parcels
- Property → Buildings → Parcels hierarchy
- Each property can have multiple buildings (SF, clear height, docks, grade doors, year built, office %)
- Rollup stats bar: Total SF (sum), Total Acres (sum), Max Clear Height, Total Doors (sum), Building Count, Parcel Count
- Add/remove buildings inline on Property Detail
- Auto-migration: existing properties get Building 1 created from current specs
- SQL: 09_v17_buildings_two_tier.sql

### Deal Contacts with Roles
- New Contacts tab on Deal Detail with junction table
- Link contacts with roles: Seller, Buyer, Listing Broker, Attorney, Lender, Title/Escrow, etc.

### Buyer Outreach Log
- New Outreach tab on Deal Detail
- Log outreach to buyer accounts with method, outcome, notes

### AI Note Synthesis (Opus)
- Synthesize button on Deal Detail timeline
- Opus reads all notes + activities → generates status summary with next steps

### Two-Tier AI Model
- Morning brief upgraded to Opus
- Quick actions stay on Sonnet
- API route supports system prompt + tools (web search)

### WARN Intel Page
- New sidebar tab under Intelligence
- Upload EDD WARN CSV, auto-filter industrial + SGV/IE
- Tenant matching against your properties
- Research button (Opus + web search)
- Convert to Lead button with WARN Notice catalyst

### Follow-Up Cadences
- Cadence dropdown on Deal Detail (Weekly through Annually)
- Auto-calculates next follow-up due date

### Bug Fixes
- Fixed crash on all detail pages (notes/followUps never fetched)
- DealDetail missing props restored
- Maps link pin emoji restored
- Auto activity logging on deal stage changes

## SQL Migrations (run in order)

1. 07_v16_deal_contacts_outreach_notes.sql (if not already run)
2. 08_v17_cadences_warn_twotier.sql
3. 09_v17_buildings_two_tier.sql (auto-migrates existing properties)

## Environment Variables

NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY

## Deploy

npm install && vercel --prod
