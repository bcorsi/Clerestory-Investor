import { createClient } from '@supabase/supabase-js';

/* ═══════════════════════════════════════════════════════════
   AI Property Research Agent
   app/api/property-research/route.js

   POST /api/property-research
   Body: { propertyId: "uuid" }           — single property
   Body: { batch: true, limit: 10 }       — batch mode

   Searches the web for each property's owner, tenant, and
   address to discover catalyst signals that can't be found
   in the database alone. Saves findings to ai_generations
   and merges new catalyst tags onto the property.

   Requires: ANTHROPIC_API_KEY in Vercel env vars
   ═══════════════════════════════════════════════════════════ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-20250514';

// All catalyst tags the AI can discover via web research
const WEB_DISCOVERABLE_TAGS = [
  'Hiring Signal',
  'Downsizing Signal',
  'NOD Filed',
  'Bankruptcy Signal',
  'Prior Listing — Expired/Withdrawn',
  'Debt Maturity',
  'Company Expansion',
  'Company Relocation',
  'Environmental Issues',
  'Rezoning Activity',
  'New Development Nearby',
  'Roof/CapEx Due',
  'Market Rent Growth',
  'SLB Interest',
  'Owner Distress',
  'Tenant Credit Risk',
];

export async function POST(request) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const body = await request.json();

    if (body.batch) {
      return handleBatch(body.limit || 10);
    } else if (body.propertyId) {
      return handleSingle(body.propertyId);
    } else {
      return Response.json({ error: 'Provide propertyId or batch:true' }, { status: 400 });
    }
  } catch (err) {
    console.error('Property research error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// ── SINGLE PROPERTY RESEARCH ────────────────────────────
async function handleSingle(propertyId) {
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (error || !property) {
    return Response.json({ error: 'Property not found' }, { status: 404 });
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

// ── BATCH MODE ──────────────────────────────────────────
async function handleBatch(limit) {
  // Prioritize properties that haven't been researched yet
  // or were last researched more than 30 days ago
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
      // Rate limiting — 1 second between calls
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

// ── CORE RESEARCH ENGINE ────────────────────────────────
async function researchProperty(property) {
  const owner = property.owner || 'Unknown owner';
  const tenant = property.tenant || null;
  const address = property.address || 'Unknown address';
  const city = property.city || '';
  const submarket = property.submarket || '';

  // Build search context
  const context = [
    `Address: ${address}, ${city}`,
    `Owner: ${owner}`,
    tenant ? `Tenant: ${tenant}` : null,
    property.building_sf ? `Building: ${property.building_sf.toLocaleString()} SF industrial` : null,
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

SEARCH QUERIES TO RUN (adapt based on what you find):
- "${owner} ${city} real estate" or "${owner} property sale"
- "${owner} bankruptcy" or "${owner} NOD filing" or "${owner} financial"
${tenant ? `- "${tenant} hiring" or "${tenant} layoffs" or "${tenant} expansion"` : ''}
${tenant ? `- "${tenant} ${city} news"` : ''}
- "${address} ${city} for sale" or "${address} listing"
- "industrial development ${city}" or "warehouse construction ${submarket || city}"

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

  // Call Anthropic API with web search
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

  // Extract text from response (may have multiple content blocks)
  const textContent = data.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  // Parse the JSON response
  let parsed;
  try {
    // Clean up any markdown formatting Claude might add
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

  // Merge new tags into property's catalyst_tags (don't overwrite existing)
  if (newTags.length > 0) {
    const existingTags = Array.isArray(property.catalyst_tags) ? property.catalyst_tags : [];
    const mergedTags = [...new Set([...existingTags, ...newTags])];

    await supabase
      .from('properties')
      .update({
        catalyst_tags: mergedTags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', property.id);
  }

  // Also update ai_synthesis_at to mark this property as researched
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
