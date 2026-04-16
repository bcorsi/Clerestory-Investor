import { supabase } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════
   AI Property Research Agent
   app/api/property-research/route.js

   POST /api/property-research
   Body: { propertyId: "uuid" }           — single property
   Body: { batch: true, limit: 10 }       — batch mode
   ═══════════════════════════════════════════════════════════ */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-20250514';

const WEB_DISCOVERABLE_TAGS = [
  'Hiring Signal', 'Downsizing Signal', 'NOD Filed',
  'Bankruptcy Signal', 'Prior Listing — Expired/Withdrawn',
  'Debt Maturity', 'Company Expansion', 'Company Relocation',
  'Environmental Issues', 'Rezoning Activity', 'New Development Nearby',
  'Roof/CapEx Due', 'Market Rent Growth', 'SLB Interest',
  'Owner Distress', 'Tenant Credit Risk',
];

export async function POST(request) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const body = await request.json();

    if (body.batch) {
      return await handleBatch(body.limit || 10);
    } else if (body.propertyId) {
      return await handleSingle(body.propertyId);
    } else {
      return Response.json({ error: 'Provide propertyId or batch:true' }, { status: 400 });
    }
  } catch (err) {
    console.error('Property research error:', err);
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}

async function handleSingle(propertyId) {
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (error || !property) {
    return Response.json({ error: 'Property not found', detail: error?.message }, { status: 404 });
  }

  const result = await researchProperty(property);

  return Response.json({
    propertyId,
    address: property.address,
    newTags: result.newTags,
    findings: result.findings,
    searchQueries: result.searchQueries,
  });
}

async function handleBatch(limit) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .or(`ai_synthesis_at.is.null,ai_synthesis_at.lt.${thirtyDaysAgo}`)
    .order('ai_score', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const results = [];
  for (const property of (properties || [])) {
    try {
      const result = await researchProperty(property);
      results.push({
        propertyId: property.id,
        address: property.address,
        newTags: result.newTags,
        findingCount: result.findings.length,
      });
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      results.push({
        propertyId: property.id,
        address: property.address,
        error: err.message,
      });
    }
  }

  return Response.json({ processed: results.length, results });
}

async function researchProperty(property) {
  const owner = property.owner || 'Unknown owner';
  const tenant = property.tenant || null;
  const address = property.address || 'Unknown address';
  const city = property.city || '';
  const submarket = property.submarket || '';

  const context = [
    `Address: ${address}, ${city}`,
    `Owner: ${owner}`,
    tenant ? `Tenant: ${tenant}` : null,
    property.building_sf ? `Building: ${Number(property.building_sf).toLocaleString()} SF industrial` : null,
    property.year_built ? `Year built: ${property.year_built}` : null,
    property.vacancy_status ? `Status: ${property.vacancy_status}` : null,
    property.lease_expiration ? `Lease expires: ${property.lease_expiration}` : null,
    submarket ? `Submarket: ${submarket}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `You are Clerestory, an AI acquisition intelligence agent for industrial real estate in Southern California. Research this property and its owner/tenant to discover actionable signals.

PROPERTY DATA:
${context}

SEARCH FOR THESE SPECIFIC SIGNALS — run multiple web searches as needed:

1. **Owner signals**: Is the owner in financial distress? Bankruptcy filings? NOD (Notice of Default) on any properties? Estate/probate proceedings? Are they selling other properties?
2. **Tenant signals**: Is the tenant hiring (expansion signal) or laying off (downsizing/relocation risk)? Check LinkedIn, news, job boards. Any recent news about the company?
3. **Property signals**: Has this property been listed for sale or lease before and withdrawn/expired? Any environmental issues? Any rezoning or entitlement activity nearby?
4. **Market signals**: Any new large developments within 2 miles? Major infrastructure projects? Rent growth trends in ${submarket || city || 'this submarket'}?
5. **Company signals**: Is "${owner}" or "${tenant || 'the tenant'}" expanding, relocating, or restructuring?

RESPOND WITH ONLY THIS JSON FORMAT (no markdown, no backticks):
{
  "findings": [
    {
      "signal": "One of: ${WEB_DISCOVERABLE_TAGS.join(', ')}",
      "confidence": "high/medium/low",
      "summary": "One sentence describing what you found",
      "source": "Where you found it",
      "catalyst_tag": "The exact tag name to apply"
    }
  ],
  "owner_intel": "2-3 sentence summary of what you learned about the owner",
  "tenant_intel": ${tenant ? '"2-3 sentence summary of what you learned about the tenant"' : 'null'},
  "market_intel": "1-2 sentences on local market activity",
  "searches_run": ["list of search queries you actually ran"]
}

If you find NOTHING relevant for a category, omit it from findings. Only include findings where you have actual evidence. Do not make things up.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} — ${errText}`);
  }

  const data = await response.json();

  const textContent = data.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  let parsed;
  try {
    const cleaned = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error('Failed to parse research response:', textContent.slice(0, 500));
    parsed = { findings: [], owner_intel: textContent.slice(0, 300), searches_run: [] };
  }

  const findings = parsed.findings || [];
  const newTags = findings
    .filter(f => f.confidence === 'high' || f.confidence === 'medium')
    .map(f => f.catalyst_tag)
    .filter(Boolean);

  // Save to ai_generations
  try {
    await supabase.from('ai_generations').insert({
      generation_type: 'property_research',
      property_id: property.id,
      content: JSON.stringify(parsed),
      input_context: {
        address: property.address,
        city: property.city,
        owner: property.owner,
        tenant: property.tenant,
        searches_run: parsed.searches_run || [],
      },
      model_used: MODEL,
    });
  } catch (e) { console.error('Failed to save ai_generation:', e); }

  // Merge new tags
  if (newTags.length > 0) {
    const existingTags = Array.isArray(property.catalyst_tags) ? property.catalyst_tags : [];
    const mergedTags = [...new Set([...existingTags, ...newTags])];
    await supabase
      .from('properties')
      .update({ catalyst_tags: mergedTags, updated_at: new Date().toISOString() })
      .eq('id', property.id);
  }

  // Mark as researched
  await supabase
    .from('properties')
    .update({ ai_synthesis_at: new Date().toISOString() })
    .eq('id', property.id);

  return {
    findings,
    newTags,
    searchQueries: parsed.searches_run || [],
    ownerIntel: parsed.owner_intel,
    tenantIntel: parsed.tenant_intel,
    marketIntel: parsed.market_intel,
  };
}
