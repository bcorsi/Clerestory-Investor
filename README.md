# Clerestory

**See the deal before it's a deal.**
*Where signals become strategy.*

---

## What Is This?

Clerestory is an **acquisition intelligence platform** for commercial industrial real estate investors.

Here's the problem it solves: in industrial real estate, the best deals never hit the open market. The properties that institutional buyers want — large warehouses, distribution centers, manufacturing facilities — are owned by families, private LLCs, and small operators who have held them for 20+ years. These owners don't list their buildings. They sell when something changes: a death in the family, a loan maturing, a tenant leaving, a business restructuring.

**If you can detect those changes before anyone else, you get the deal.**

Clerestory monitors dozens of public and private data sources — corporate filings, county records, layoff notices, lease expirations, debt maturities, ownership transfers — and uses AI to connect the dots. When three signals converge on the same property (the owner is 70, the loan matures in 6 months, and the tenant just filed a WARN notice), Clerestory surfaces that property as a high-probability acquisition target before any broker knows about it.

The platform replaces what a team of 5-10 analysts would do manually: track every property in a market, research every owner, monitor every signal, and rank them by likelihood of transacting. Clerestory does this automatically, continuously, and at scale.

### Who It's For

- **Industrial real estate investors** — REITs, private equity funds, family offices, and owner-operators looking to acquire industrial properties off-market
- **Acquisition teams** — analysts and principals who need deal flow intelligence without relying on broker relationships
- **Portfolio managers** — investors monitoring existing holdings for disposition signals or value-add opportunities

### What Makes It Different

1. **Signal convergence** — doesn't just show you data, it detects when multiple independent signals point to the same property at the same time
2. **Owner readiness scoring** — proprietary scoring model (10 interconnected scores) that predicts how likely an owner is to sell, calibrated against real transaction patterns. The current model was trained on 360+ completed IE West transactions from a single CoStar export — but the architecture is designed to ingest 25+ years of transaction history across every market. More data in, sharper predictions out.
3. **AI synthesis** — every property gets an institutional-grade intelligence brief written in the same voice a senior acquisitions analyst would use: specific, declarative, evidence-based
4. **Closed-loop learning** — when deals close (or die), the outcome feeds back into the model, making every score more accurate over time

---

## Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Vercel
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **Maps:** Leaflet + ArcGIS parcel overlays + Google Maps
- **Fonts:** Instrument Sans · DM Mono · Playfair Display · Cormorant Garamond

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_GOOGLE_MAPS_KEY
```

---

## Architecture

```
12 Data Sources → Signal Normalization Engine → 9 View Surfaces
```

Pages are **views**, not enrichers. All signal computation happens upstream in the normalization engine (cron + SQL functions). PropertyDetail, Command Center, WARN Intel, and every other page reads the results — they don't do real-time enrichment.

### The Intelligence Engine (5 steps)

1. **Fetch** — cron jobs pull raw data from each source on its own cadence
2. **Parse** — extract entities, events, and locations (LLM-assisted for unstructured sources)
3. **Normalize** — map everything to a unified taxonomy. "Pacific Mfg Inc filed WARN" and "Pacific Manufacturing Ch11" and "Pacific Mfg permit lapsed" all resolve to the same entity, same property, and stack as converging signals
4. **Match** — fuzzy link to properties and accounts (address normalization, APN match, company-name match)
5. **Score + Tag** — fire catalyst tags, update scores, check thresholds, generate alerts

### Data Sources (12)

WARN Act filings (CA EDD) · LexisNexis (corporate records, liens, judgments) · County recorder (deeds, NODs, trustee sales) · SEC EDGAR (10-K/10-Q facility closures) · Bankruptcy court (PACER) · Building permits · Industry news feeds · City/planning agendas · CoStar/LoopNet · LinkedIn + web · Utility records (SCE) · Closed deals feedback loop

### View Surfaces (9)

News Feed · WARN Intel · Bankruptcy Radar · Owner Search · Research Campaigns · Property Detail · Command Center · Catalyst Alerts · Weekly Call Queue

---

## Scoring Systems (10)

| § | Score | Purpose | Status |
|---|---|---|---|
| 01 | Building Score | Physical asset quality (clear height, power, docks, vintage) | ✅ Live |
| 02 | Owner Readiness (ORS) | How likely is this owner to sell right now | ✅ Functions installed |
| 03 | P(Transact) | 9-factor sigmoid probability of near-term transaction | 🔲 Spec'd |
| 04 | Seller Motivation | Qualitative motivation level (distress vs. strategic vs. life event) | 🔲 Spec'd |
| 05 | Deal Screening | Pass/fail against acquisition criteria | 🔲 Spec'd |
| 06 | Catalyst Boosts | Score bumps from signal convergence | ✅ 30 tags firing |
| 07 | Deal Probability | Auto-set from pipeline stage | ✅ Live |
| 08 | Portfolio Fit | Per-user buy box match, auto-promotes to acquisition target | ✅ Live |
| 09 | Calculated Metrics | DH ratio, coverage ratio, land-to-building | ✅ Live |
| 10 | Investment Returns | IRR, equity multiple, DSCR, cap rate, basis vs replacement cost | 🔲 Spec'd |

### Acquisition Pipeline (6 stages — locked)

```
Tracking (10%) → Underwriting (25%) → Offer/LOI (60%) → Under Contract (80%) → Non-Contingent (92%) → Closed (100%)
```

Substages: Counter LOI / Signed LOI under Offer/LOI · PSA Negotiation / Due Diligence under Under Contract.

---

## Catalyst Tags

30 signal tags across 5 categories, auto-populated from property + account data. These are the actionable signals — the things you pick up the phone about.

- **Owner Signal** (rust): Long Hold, Absentee Owner, Family Trust, Individual Owner, Succession Signal, No Refi in 5+ Years, SLB Potential, M&A / Corporate Restructuring, Repeat Seller
- **Occupier Signal** (amber): WARN Filing, Bankruptcy Filing, Distress Signal, Lease Expiry < 12 Mo, Expiring Lease < 24 Mo, Headcount Shrinking, Tenant Renewal Risk
- **Asset Signal** (blue): Below Market Rent, Functional Obsolescence, Deferred Capex, Excess Land, Capex Permit Pulled
- **Market Signal** (purple): BESS / Energy Storage, Infrastructure, Sub-5% Vacancy Market, Rising Rents, Institutional Buyer Interest
- **Location** (green): Competing Listing Nearby, SLB Corridor, Succession Market, Owner Proximity

Building characteristics (High Clear, ESFR Sprinklers, Modern Build, Heavy Power, etc.) are **property tags** — separate from signal catalysts.

---

## Building Score

Percentage-denominator scoring across 6 factors:

| Factor | Max Points |
|---|---|
| Clear Height | 25 |
| DH Ratio | 20 |
| Truck Court | 20 |
| Office % | 15 |
| Power (Amps) | 10 |
| Vintage | 10 |

Missing fields don't penalize — score = `earned / possible`. A completeness cap prevents sparse-data properties from ranking above fully-specced ones (80%+ data = uncapped, 60-79% = max 95, 40-59% = max 85, <40% = max 70). Data completeness percentage is visible on every score ring.

---

## Deployed Pages

| Route | Status |
|---|---|
| `/properties` | ✅ Live — sortable list with building score + fit score rings, property tags, catalyst signals, data completeness, CSV export |
| `/properties/[id]` | ✅ Live — full property detail with AI synthesis, owner profile, Pattern Intelligence |
| `/deals` | ✅ Live — acquisition pipeline |
| `/deals/[id]` | ✅ Live — deal detail with stage track, KPI strip, tabs |

### Queued

`/targets` (acquisition targets) · `/portfolio` (portfolio intelligence) · `/map` (satellite portfolio map)

### API Routes

| Route | Purpose |
|---|---|
| `/api/ai` | Unified AI synthesis (all generation types) |
| `/api/property-research` | AI property research agent |
| `/api/pattern-intelligence` | Pattern archetype classification + LLM narrative |

---

## AI Features

All AI features use purple `#5838A0` accent. Every generation logs to `ai_generations` with full `input_context` JSONB and outcome tracking fields for closed-loop learning.

### AI Voice Standard

Declarative, not hedged. Specific over general. 5 layers in every synthesis:

1. **Basis** — what the building is, who owns it, what it's worth
2. **Catalyst** — what's changing, what signal fired
3. **Comp** — cite specific nearby sales with $/SF and buyer name
4. **Timing** — why now, what's the window
5. **Human** — who to call, what to say, what they care about

### Pattern Intelligence

8 acquisition archetypes currently calibrated against 360 completed IE West transactions — scales to any market with historical transaction data. Each property is classified deterministically in the browser; the LLM generates a narrative brief with a pattern-matched comparable sale on first expand.

---

## Design System

Bloomberg terminal aesthetic. Dark, data-dense, professional. Salesforce Lightning card style on parchment background.

| Token | Value |
|---|---|
| Page bg | `#F4F1EC` (parchment) |
| Card bg | `#FFFFFF` |
| Sidebar | `#E5E0D6` |
| Navy | `#0E1520` |
| Blue accent | `#4E6E96` |
| Rust | `#B83714` |
| Green | `#156636` |
| Amber | `#8C5A04` |
| Purple (AI) | `#5838A0` |
| Teal (Fit) | `#1A6B6B` |

### Score Color Systems (3 palettes, 80°+ hue separation)

- **Building Score** — blue/indigo
- **Portfolio Fit** — teal/cyan
- **ORS** — ember red-to-gold

---

## Multi-User

Clerestory supports multiple users and organizations, each with their own private pipeline, fit scores, and intelligence layer. Users upload their own property data, define their own acquisition criteria, and receive personalized scoring and signals. Shared underlying market data, private deal flow.

---

## Development

```
# Deployment is via GitHub web UI → Vercel auto-deploy
# No CLI, no terminal — files uploaded manually (full wipe → paste)
# One page per chat session to prevent context loss
```

**Live:** [clerestory-investor.vercel.app](https://clerestory-investor.vercel.app)
