import { NextResponse } from 'next/server';

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

  try {
    const { keywords, entities } = await request.json();
    // keywords: string[] of search terms
    // entities: { properties: [{address, owner, tenant}], accounts: [{name}], leads: [{lead_name, company}] }

    if (!keywords?.length) {
      return NextResponse.json({ error: 'No keywords provided' }, { status: 400 });
    }

    // Build a focused search prompt
    const keywordBatches = [];
    for (let i = 0; i < keywords.length; i += 8) {
      keywordBatches.push(keywords.slice(i, i + 8));
    }

    // Use first batch (most important keywords) — we can't search 180 keywords at once
    const batch = keywordBatches[0];
    const searchQuery = batch.join(' OR ');

    const entityNames = [
      ...(entities?.properties || []).map(p => p.owner).filter(Boolean),
      ...(entities?.properties || []).map(p => p.tenant).filter(Boolean),
      ...(entities?.accounts || []).map(a => a.name).filter(Boolean),
      ...(entities?.leads || []).map(l => l.lead_name || l.company).filter(Boolean),
    ].filter(Boolean).slice(0, 50); // Max 50 entity names

    const systemPrompt = `You are a commercial real estate intelligence analyst specializing in Southern California industrial properties. 
Your job is to search the web for recent news articles that could signal deal opportunities — lease expirations, company expansions, relocations, distress, M&A activity, layoffs, new developments, etc.

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no preamble.

For each article found, determine if it matches any of these tracked entities: ${entityNames.slice(0, 30).join(', ')}

Return a JSON array of article objects:
[{
  "title": "article headline",
  "url": "article url",
  "source": "publication name",
  "snippet": "2-3 sentence summary focused on the CRE implications",
  "published_at": "ISO date string or null",
  "matched_keywords": ["keyword1", "keyword2"],
  "matched_entity_name": "entity name if matched, null otherwise",
  "catalyst_signal": "what catalyst this signals: SLB, Vacancy, Expansion, Distress, M&A, Relocation, Development, Policy, or null"
}]

Return 5-15 articles. Focus on the last 7 days. Prioritize articles with clear CRE implications.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Search for recent news (last 7 days) matching these topics and return the JSON array:\n\n${batch.map((k, i) => `${i + 1}. ${k}`).join('\n')}`
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('News fetch API error:', res.status, err);
      return NextResponse.json({ error: `API error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    
    // Extract the text content and parse JSON
    const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
    const fullText = textBlocks.join('\n');
    
    // Try to parse JSON from the response
    let articles = [];
    try {
      // Try direct parse first
      articles = JSON.parse(fullText.trim());
    } catch {
      // Try to extract JSON array from text
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try { articles = JSON.parse(jsonMatch[0]); } catch { articles = []; }
      }
    }

    // Ensure articles is an array
    if (!Array.isArray(articles)) articles = [];

    // Cross-reference articles against entity names for auto-matching
    const entityLower = entityNames.map(n => n.toLowerCase());
    articles = articles.map(article => {
      if (!article.matched_entity_name) {
        const titleLower = (article.title || '').toLowerCase();
        const snippetLower = (article.snippet || '').toLowerCase();
        const combined = titleLower + ' ' + snippetLower;
        for (const name of entityLower) {
          if (name.length > 3 && combined.includes(name)) {
            article.matched_entity_name = entityNames[entityLower.indexOf(name)];
            break;
          }
        }
      }
      return article;
    });

    return NextResponse.json({ articles, keyword_count: batch.length });
  } catch (err) {
    console.error('News route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
