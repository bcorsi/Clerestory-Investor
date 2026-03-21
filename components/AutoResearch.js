'use client';

import { useState } from 'react';
import { updateRow } from '../lib/db';
import { AI_MODEL_SONNET } from '../lib/constants';

// Research a property address — find building specs, past sales, brochures
async function researchProperty(address, city) {
  const res = await fetch('/api/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AI_MODEL_SONNET, max_tokens: 600,
      system: `You are a CRE research assistant. Search for information about this industrial property address. Find: building square footage, year built, clear height, dock doors, grade level doors, land acres, property type, current tenant, owner, asking price, recent sale price, sale date, zoning, power amps. Return ONLY a JSON object with these fields (use null for unknown): {"building_sf": number, "year_built": number, "clear_height": number, "dock_doors": number, "grade_doors": number, "land_acres": number, "prop_type": string, "tenant": string, "owner": string, "asking_price": number, "sale_price": number, "sale_date": string, "zoning": string, "power_amps": number, "summary": string}. The summary should be 2-3 sentences of key findings.`,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: `Research this industrial property: ${address}, ${city || ''}, CA. Find building specs, ownership, tenant info, recent sales, and any marketing materials or brochures.` }],
    }),
  });
  return res.json();
}

// Research a company/owner entity — find M&A, bankruptcy, SEC, SOS filings
async function researchCompany(companyName) {
  const res = await fetch('/api/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AI_MODEL_SONNET, max_tokens: 600,
      system: `You are a CRE intelligence analyst. Research this company/entity for commercial real estate signals. Search for: M&A activity, acquisitions, bankruptcy filings, WARN notices, SEC filings, California Secretary of State entity status, related entities, leadership changes, expansion/contraction signals, financial health indicators. Return ONLY a JSON object: {"entity_type": string, "entity_status": string, "agent_name": string, "filing_date": string, "related_entities": [string], "ma_activity": string, "bankruptcy": string, "warn_notices": string, "leadership": string, "financial_health": string, "portfolio_size": string, "summary": string}. Use null for unknown fields. Summary should be 3-4 sentences.`,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: `Research this company/entity for CRE intelligence: "${companyName}". Look for CA Secretary of State filings, M&A news, bankruptcy, WARN notices, SEC filings, leadership changes, and any real estate portfolio information.` }],
    }),
  });
  return res.json();
}

// Research a tenant for lease comp context
async function researchTenant(tenantName) {
  const res = await fetch('/api/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AI_MODEL_SONNET, max_tokens: 400,
      system: `You are a CRE research assistant. Research this tenant company. Find: industry, company size (employees, revenue), headquarters, expansion/contraction signals, M&A activity, financial health. Return ONLY a JSON object: {"industry": string, "employees": number, "revenue": string, "headquarters": string, "expansion_signal": string, "ma_activity": string, "financial_health": string, "summary": string}. Use null for unknown.`,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: `Research this commercial tenant: "${tenantName}". Find company size, industry, financial health, and any expansion or contraction signals.` }],
    }),
  });
  return res.json();
}

function extractJson(data) {
  const texts = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  try {
    const clean = texts.replace(/```json|```/g, '').trim();
    // Find the first { ... } block
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(clean.substring(start, end + 1));
  } catch {}
  return { summary: texts.slice(0, 500) };
}

export default function AutoResearchButton({ record, table, field, onRefresh, showToast }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleResearch = async () => {
    setLoading(true); setResult(null);
    try {
      // Property address research
      let propertyData = null;
      if (record.address) {
        const pRes = await researchProperty(record.address, record.city);
        propertyData = extractJson(pRes);
      }

      // Owner/company research
      let ownerData = null;
      const ownerName = record.owner || record.company || record.lead_name;
      if (ownerName) {
        const oRes = await researchCompany(ownerName);
        ownerData = extractJson(oRes);
      }

      // Build updates — only fill empty fields
      const updates = {};
      const notes = [];

      if (propertyData) {
        if (!record.building_sf && propertyData.building_sf) updates.building_sf = propertyData.building_sf;
        if (!record.year_built && propertyData.year_built) updates.year_built = propertyData.year_built;
        if (!record.clear_height && propertyData.clear_height) updates.clear_height = propertyData.clear_height;
        if (!record.dock_doors && propertyData.dock_doors) updates.dock_doors = propertyData.dock_doors;
        if (!record.grade_doors && propertyData.grade_doors) updates.grade_doors = propertyData.grade_doors;
        if (!record.land_acres && propertyData.land_acres) updates.land_acres = propertyData.land_acres;
        if (!record.prop_type && propertyData.prop_type) updates.prop_type = propertyData.prop_type;
        if (!record.tenant && propertyData.tenant) updates.tenant = propertyData.tenant;
        if (!record.owner && propertyData.owner) updates.owner = propertyData.owner;
        if (propertyData.summary) notes.push(`[Property Research] ${propertyData.summary}`);
      }

      if (ownerData) {
        if (!record.owner_type && ownerData.entity_type) updates.owner_type = ownerData.entity_type;
        if (ownerData.summary) notes.push(`[Owner Research] ${ownerData.summary}`);
        if (ownerData.ma_activity && ownerData.ma_activity !== 'null') notes.push(`[M&A] ${ownerData.ma_activity}`);
        if (ownerData.bankruptcy && ownerData.bankruptcy !== 'null') notes.push(`[Bankruptcy] ${ownerData.bankruptcy}`);
        if (ownerData.warn_notices && ownerData.warn_notices !== 'null') notes.push(`[WARN] ${ownerData.warn_notices}`);
      }

      // Save research as notes
      if (notes.length > 0) {
        const existingNotes = record.notes || '';
        updates.notes = existingNotes ? `${existingNotes}\n\n--- Auto-Research ${new Date().toLocaleDateString()} ---\n${notes.join('\n')}` : `--- Auto-Research ${new Date().toLocaleDateString()} ---\n${notes.join('\n')}`;
      }

      const fieldCount = Object.keys(updates).filter(k => k !== 'notes').length;
      
      if (Object.keys(updates).length > 0) {
        await updateRow(table, record.id, updates);
        onRefresh?.();
      }

      setResult({ propertyData, ownerData, fieldCount, noteCount: notes.length });
      showToast?.(`Research complete — ${fieldCount} fields updated, ${notes.length} intel notes added`);
    } catch (e) {
      console.error(e);
      setResult({ error: e.message });
      showToast?.('Research error — check API key');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={handleResearch} disabled={loading}
        style={{ fontSize: '11px', color: 'var(--purple)', borderColor: 'rgba(96,64,168,0.27)' }}>
        {loading ? '✦ Researching...' : '✦ Auto-Research'}
      </button>
      {result && !result.error && (
        <div style={{ marginTop: '8px', padding: '10px', background: 'var(--purple-bg)', border: '1px solid rgba(96,64,168,0.2)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          {result.fieldCount > 0 && <div>Updated {result.fieldCount} fields from web research</div>}
          {result.noteCount > 0 && <div>Added {result.noteCount} intel notes</div>}
          {result.propertyData?.summary && <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>{result.propertyData.summary}</div>}
          {result.ownerData?.summary && <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>{result.ownerData.summary}</div>}
        </div>
      )}
    </div>
  );
}

// Export individual research functions for use elsewhere
export { researchProperty, researchCompany, researchTenant, extractJson };
