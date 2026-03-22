'use client';

import { useState } from 'react';
import { updateRow } from '../lib/db';
import { AI_MODEL_SONNET } from '../lib/constants';

async function aiCall(system, userMsg, maxTokens = 1200) {
  const res = await fetch('/api/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AI_MODEL_SONNET, max_tokens: maxTokens,
      system, tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  return res.json();
}

function extractJson(data) {
  const texts = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  try {
    const clean = texts.replace(/```json|```/g, '').trim();
    const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
    if (s >= 0 && e > s) return JSON.parse(clean.substring(s, e + 1));
  } catch {}
  return { summary: texts.slice(0, 800) };
}

// ===== DEEP PROPERTY RESEARCH =====
async function researchProperty(address, city) {
  return aiCall(
    `You are an expert CRE research analyst specializing in Southern California industrial properties. Do thorough web research on this property. Search multiple sources.

Find ALL of the following:
1. BUILDING SPECS: square footage, year built, clear height, dock doors (truck-well/grade-level), land acres, lot size, zoning, power amps/volts, sprinklers, rail access, column spacing, office finish %
2. OWNERSHIP: current owner entity, beneficial owner if different, acquisition date and price, title holder
3. TENANCY: current tenant(s), lease expiration(s), rent rate if known, tenant industry, credit quality
4. RECENT TRANSACTIONS: last sale date/price/buyer/seller, any recent refinancing, liens, NODs
5. MARKETING: any active or recent listing, asking price, brochure data, broker listing it
6. PHYSICAL CONDITION: recent permits, renovations, environmental issues, ADA compliance
7. MARKET CONTEXT: submarket vacancy rate, asking rents, recent comparable sales nearby

Return ONLY a JSON object with these fields (null for unknown):
{"building_sf":number,"year_built":number,"clear_height":number,"dock_doors":number,"grade_doors":number,"land_acres":number,"lot_sf":number,"prop_type":string,"zoning":string,"power_amps":number,"sprinklers":string,"rail_access":boolean,"column_spacing":string,"office_pct":number,"owner":string,"owner_entity_type":string,"acquisition_date":string,"acquisition_price":number,"tenant":string,"lease_expiration":string,"in_place_rent":number,"tenant_industry":string,"last_sale_date":string,"last_sale_price":number,"last_buyer":string,"last_seller":string,"active_listing":boolean,"asking_price":number,"listing_broker":string,"recent_permits":string,"environmental":string,"submarket_vacancy":string,"submarket_rent":string,"summary":string}

The summary should be 4-6 sentences covering the most investable/actionable findings. Focus on what a broker prospecting this property would need to know.`,
    `Deep-dive research on this industrial property: ${address}, ${city || 'CA'}. Search for the address specifically, search for the owner, search for any CoStar or LoopNet listings, search county assessor records, and search for WARN notices matching the tenant.`
  ).then(extractJson);
}

// ===== DEEP ENTITY / OWNER RESEARCH =====
async function researchCompany(companyName, address) {
  return aiCall(
    `You are a CRE intelligence analyst conducting deep due diligence on a property owner or company. Your goal is to find actionable intelligence that helps a broker understand if this entity might sell, buy, refinance, or face distress.

Research ALL of the following:
1. ENTITY STATUS: CA Secretary of State business search — entity type (LLC, Corp, LP, Trust), status (Active, Dissolved, Suspended), filing date, agent for service, principal address, any related entities or DBAs
2. M&A ACTIVITY: acquisitions, mergers, divestitures in last 3 years. Is this entity part of a larger portfolio? Who are the principals?
3. FINANCIAL DISTRESS: bankruptcy filings (PACER), UCC liens, judgment liens, NODs (notice of default), mechanic's liens, tax liens
4. WARN NOTICES: California EDD WARN database — any layoff notices filed by this company or subsidiaries in SGV/IE/SoCal
5. SEC FILINGS: if public, recent 10-K/10-Q, insider transactions, material events. If REIT, disposition/acquisition activity
6. PORTFOLIO: how many properties does this entity own? What markets? Any pattern of buying/selling?
7. LEADERSHIP: principals, key executives, changes in management, any litigation involving principals
8. SIGNALS: expansion signals (hiring, new leases), contraction signals (layoffs, downsizing), relocation signals

Return ONLY a JSON object:
{"entity_type":string,"entity_status":string,"sos_filing_date":string,"agent_name":string,"principal_address":string,"related_entities":[string],"ma_activity":string,"portfolio_size":string,"portfolio_markets":string,"bankruptcy":string,"ucc_liens":string,"nod_filed":boolean,"warn_notices":string,"sec_filings":string,"leadership":string,"expansion_signals":string,"contraction_signals":string,"financial_health":string,"disposition_likelihood":string,"summary":string}

Summary: 5-7 sentences of actionable intelligence. What should a broker do with this information? Is there a deal catalyst here?`,
    `Deep intelligence research on: "${companyName}"${address ? ` (property at ${address})` : ''}. Search California Secretary of State business database. Search for WARN notices in California. Search for bankruptcy filings. Search for M&A news. Search for the company's real estate portfolio. Search for any SEC filings if public.`
  ).then(extractJson);
}

// ===== TENANT RESEARCH =====
async function researchTenant(tenantName, address) {
  return aiCall(
    `You are a CRE tenant research analyst. Research this tenant company for lease renewal risk, expansion/contraction signals, and creditworthiness.

Find:
1. COMPANY PROFILE: industry, SIC/NAICS codes, employee count, annual revenue, headquarters location, number of locations
2. FINANCIAL HEALTH: credit rating if available, recent earnings, profitability trends, debt levels
3. SPACE NEEDS: are they growing or shrinking? Recent lease signings elsewhere? Subleasing any space?
4. M&A: any acquisition targets or acquirers? PE ownership?
5. WARN/LAYOFFS: any WARN notices, layoff announcements, restructuring
6. LEASE INTEL: typical lease terms for this tenant, TI requirements, expansion clauses they typically negotiate

Return ONLY JSON:
{"industry":string,"naics":string,"employees":number,"revenue":string,"headquarters":string,"locations_count":number,"credit_rating":string,"financial_trend":string,"growth_signal":string,"recent_leases":string,"sublease_activity":string,"ma_activity":string,"pe_owned":boolean,"warn_notices":string,"layoff_news":string,"typical_lease_term":string,"typical_ti":string,"renewal_likelihood":string,"summary":string}

Summary: 4-5 sentences focused on lease renewal probability and tenant credit quality.`,
    `Research tenant: "${tenantName}"${address ? ` at ${address}` : ''}. Focus on financial health, growth trajectory, and any WARN/layoff signals. Search for the company name plus "layoff", "expansion", "lease", and "financial results".`
  ).then(extractJson);
}

// ===== MARKET CONTEXT RESEARCH =====
async function researchMarket(city, submarket) {
  return aiCall(
    `You are a SoCal industrial real estate market analyst. Research current market conditions for this submarket.

Find:
1. VACANCY: current vacancy rate, trend (rising/falling), comparison to prior quarter/year
2. RENTS: average asking NNN rent/SF/mo for industrial, by product type (warehouse, manufacturing, flex)
3. ABSORPTION: net absorption last 4 quarters
4. CONSTRUCTION: new supply under construction or planned, delivery dates
5. NOTABLE TRANSACTIONS: significant recent leases and sales in this submarket
6. OUTLOOK: market consensus on rent growth, cap rate direction, demand drivers

Return ONLY JSON:
{"vacancy_rate":string,"vacancy_trend":string,"avg_rent_warehouse":number,"avg_rent_mfg":number,"avg_rent_flex":number,"rent_trend":string,"net_absorption":string,"construction_pipeline":string,"notable_sales":string,"notable_leases":string,"cap_rate_range":string,"outlook":string,"summary":string}`,
    `Research current industrial real estate market conditions for ${city || 'Southern California'}${submarket ? ', ' + submarket + ' submarket' : ''}. Find vacancy rates, asking rents, recent transactions, and market outlook for 2025-2026.`
  ).then(extractJson);
}

export default function AutoResearchButton({ record, table, field, onRefresh, showToast, depth = 'standard' }) {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handleResearch = async () => {
    setLoading(true); setResult(null);
    try {
      const updates = {};
      const intel = [];

      // Step 1: Property research
      if (record.address) {
        setStage('Researching property...');
        const pd = await researchProperty(record.address, record.city);
        if (pd) {
          // Only fill empty fields
          const fieldMap = { building_sf:'building_sf', year_built:'year_built', clear_height:'clear_height', dock_doors:'dock_doors', grade_doors:'grade_doors', land_acres:'land_acres', prop_type:'prop_type', zoning:'zoning', power_amps:'power_amps', owner:'owner', tenant:'tenant', in_place_rent:'in_place_rent' };
          Object.entries(fieldMap).forEach(([src, dst]) => {
            if (!record[dst] && pd[src] != null) updates[dst] = pd[src];
          });
          if (pd.summary) intel.push({ section: 'Property Research', content: pd.summary });
          if (pd.active_listing) intel.push({ section: 'Active Listing', content: `Listed at ${pd.asking_price ? '$' + Number(pd.asking_price).toLocaleString() : 'price TBD'} by ${pd.listing_broker || 'unknown broker'}` });
          if (pd.last_sale_price) intel.push({ section: 'Last Sale', content: `Sold ${pd.last_sale_date || ''} for $${Number(pd.last_sale_price).toLocaleString()} (${pd.last_buyer || '?'} from ${pd.last_seller || '?'})` });
          if (pd.environmental && pd.environmental !== 'null') intel.push({ section: 'Environmental', content: pd.environmental });
          if (pd.recent_permits && pd.recent_permits !== 'null') intel.push({ section: 'Recent Permits', content: pd.recent_permits });
        }
      }

      // Step 2: Owner/entity research
      const ownerName = record.owner || record.company || record.lead_name;
      if (ownerName) {
        setStage('Researching owner entity...');
        const od = await researchCompany(ownerName, record.address);
        if (od) {
          if (!record.owner_type && od.entity_type) updates.owner_type = od.entity_type;
          if (od.summary) intel.push({ section: 'Owner Intelligence', content: od.summary });
          if (od.ma_activity && od.ma_activity !== 'null') intel.push({ section: 'M&A Activity', content: od.ma_activity });
          if (od.bankruptcy && od.bankruptcy !== 'null') intel.push({ section: 'Bankruptcy/Liens', content: od.bankruptcy });
          if (od.warn_notices && od.warn_notices !== 'null') intel.push({ section: 'WARN Notices', content: od.warn_notices });
          if (od.portfolio_size && od.portfolio_size !== 'null') intel.push({ section: 'Portfolio', content: `${od.portfolio_size}${od.portfolio_markets ? ' across ' + od.portfolio_markets : ''}` });
          if (od.disposition_likelihood && od.disposition_likelihood !== 'null') intel.push({ section: 'Disposition Signal', content: od.disposition_likelihood });
          if (od.related_entities?.length > 0) intel.push({ section: 'Related Entities', content: od.related_entities.join(', ') });
        }
      }

      // Step 3: Tenant research (if different from owner)
      const tenantName = record.tenant;
      if (tenantName && tenantName !== ownerName) {
        setStage('Researching tenant...');
        const td = await researchTenant(tenantName, record.address);
        if (td) {
          if (td.summary) intel.push({ section: 'Tenant Intelligence', content: td.summary });
          if (td.warn_notices && td.warn_notices !== 'null') intel.push({ section: 'Tenant WARN', content: td.warn_notices });
          if (td.growth_signal && td.growth_signal !== 'null') intel.push({ section: 'Tenant Growth Signal', content: td.growth_signal });
          if (td.renewal_likelihood && td.renewal_likelihood !== 'null') intel.push({ section: 'Renewal Likelihood', content: td.renewal_likelihood });
        }
      }

      // Step 4: Market context (if deep mode)
      if (depth === 'deep' && (record.city || record.submarket)) {
        setStage('Researching market...');
        const md = await researchMarket(record.city, record.submarket);
        if (md) {
          if (md.summary) intel.push({ section: 'Market Context', content: md.summary });
          if (md.vacancy_rate) intel.push({ section: 'Vacancy', content: `${md.vacancy_rate} (${md.vacancy_trend || 'stable'})` });
          if (md.avg_rent_warehouse) intel.push({ section: 'Market Rents', content: `Warehouse: $${md.avg_rent_warehouse}/SF NNN (${md.rent_trend || 'stable'})` });
        }
      }

      // Save research notes
      if (intel.length > 0) {
        const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const noteBlock = `\n\n═══ Auto-Research ${timestamp} ═══\n` + intel.map(i => `▸ ${i.section}: ${i.content}`).join('\n');
        updates.notes = (record.notes || '') + noteBlock;
      }

      const fieldCount = Object.keys(updates).filter(k => k !== 'notes').length;

      if (Object.keys(updates).length > 0) {
        setStage('Saving...');
        await updateRow(table, record.id, updates);
        onRefresh?.();
      }

      setResult({ intel, fieldCount });
      showToast?.(`Research complete — ${fieldCount} fields, ${intel.length} intel notes`);
    } catch (e) {
      console.error(e);
      setResult({ error: e.message });
      showToast?.('Research error — check console');
    } finally { setLoading(false); setStage(''); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => { handleResearch(); }} disabled={loading}
          style={{ fontSize: '11px', color: 'var(--purple)', borderColor: 'rgba(96,64,168,0.27)' }}>
          {loading ? `✦ ${stage}` : '✦ Auto-Research'}
        </button>
        {!loading && (
          <button className="btn btn-ghost btn-sm" onClick={() => { depth = 'deep'; handleResearch(); }} disabled={loading}
            style={{ fontSize: '10px', color: 'var(--ink4)', borderColor: 'var(--line3)' }}>
            Deep Dive
          </button>
        )}
      </div>

      {result && !result.error && result.intel?.length > 0 && (
        <div style={{ marginTop: '10px', background: 'var(--purple-bg)', border: '1px solid rgba(96,64,168,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--purple)' }}>
              {result.fieldCount} fields updated · {result.intel.length} intel notes
            </span>
            <span style={{ fontSize: '11px', color: 'var(--ink4)' }}>{expanded ? '▼' : '▶'}</span>
          </div>
          {expanded && (
            <div style={{ padding: '0 14px 12px', maxHeight: '400px', overflowY: 'auto' }}>
              {result.intel.map((item, i) => (
                <div key={i} style={{ padding: '8px 0', borderTop: i > 0 ? '1px solid rgba(96,64,168,0.1)' : 'none' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--purple)', marginBottom: '3px' }}>{item.section}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ink3)', lineHeight: 1.5 }}>{item.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { researchProperty, researchCompany, researchTenant, researchMarket, extractJson };
