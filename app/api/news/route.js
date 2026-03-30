import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── HARDCODED CORE KEYWORDS ───────────────────────────────
const CORE_KEYWORDS = [
  'SGV industrial real estate',
  'Inland Empire industrial',
  'San Gabriel Valley warehouse',
  'City of Industry industrial',
  'Irwindale industrial',
  'IE West industrial vacancy',
  'Southern California industrial lease',
  'SoCal warehouse sale leaseback',
  'Rexford Industrial',
  'Prologis Southern California',
  'CBRE Inland Empire industrial',
  'JLL SGV industrial',
  'California WARN Act layoffs',
  'BESS battery storage Southern California',
  'EV charging industrial California',
  'industrial real estate disposition Southern California',
  'warehouse tenant relocation California',
  'manufacturing company California closure',
];

// ── CATEGORY DETECTION ────────────────────────────────────
function detectCategory(title, snippet) {
  const text = (title + ' ' + snippet).toLowerCase();
  if (text.includes('warn') || text.includes('layoff') || text.includes('workforce reduction')) return 'WARN';
  if (text.includes('rexford') || text.includes('prologis') || text.includes('blackstone') || text.includes('reit')) return 'REIT';
  if (text.includes('sale-leaseback') || text.includes('sale leaseback') || text.includes('slb')) return 'MARKET';
  if (text.includes('bess') || text.includes('battery storage') || text.includes('energy storage')) return 'BESS';
  if (text.includes('ev charging') || text.includes('electric vehicle') || text.includes('tesla')) return 'MARKET';
  if (text.includes('acquisition') || text.includes('acquired') || text.includes('buys') || text.includes('purchased')) return 'DEAL';
  if (text.includes('lease') || text.includes('tenant') || text.includes('vacancy') || text.includes('rent')) return 'MARKET';
  if (text.includes('relocation') || text.includes('moving') || text.includes('expansion')) return 'TENANT';
  if (text.includes('zoning') || text.includes('regulation') || text.includes('policy') || text.includes('tariff')) return 'POLICY';
  return 'MARKET';
}

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

  try {
    // Get extra keywords from DB
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: dbKeywords } = await supabase.from('news_keywords').select('keyword').limit(30);
    const extraKeywords = (dbKeywords || []).map(k => k.keyword);

    // Merge and dedupe
    const allKeywords = [...new Set([...CORE_KEYWORDS, ...extraKeywords])];

    // Search in batches of 6 keywords — run 3 searches
    const batches = [
      allKeywords.slice(0, 6),
      allKeywords.slice(6, 12),
      allKeywords.slice(12, 18),
    ];

    const allArticles = [];

    for (const batch of batches) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{
            role: 'user',
            content: `Search the web for recent news articles (last 30 days) about Southern California industrial real estate matching these topics:

${batch.map((k, i) => `${i + 1}. ${k}`).join('\n')}

Also search these specific sources for recent SGV/IE industrial news:
- costar.com/news
- globest.com
- rebusinessonline.com
- bisnow.com/los-angeles
- naiop.org

Return ONLY a valid JSON array, no markdown, no backticks:
[{
  "title": "exact article headline",
  "url": "full article URL",
  "source": "publication name",
  "summary": "2-3 sentence summary focused on CRE implications for SGV/IE industrial market",
  "published_at": "ISO date string or approximate date",
  "matched_keywords": ["keyword"],
  "catalyst_signal": "SLB | Vacancy | Expansion | Distress | M&A | Relocation | Development | Policy | WARN | REIT | null"
}]

Return 5-10 highly relevant articles. Focus on deals, transactions, market trends, and signals relevant to SGV/IE industrial owners and tenants.`
          }],
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();

      const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
      const fullText = textBlocks.join('\n');

      let articles = [];
      try {
        articles = JSON.parse(fullText.trim());
      } catch {
        const jsonMatch = fullText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try { articles = JSON.parse(jsonMatch[0]); } catch { articles = []; }
        }
      }

      if (Array.isArray(articles)) {
        allArticles.push(...articles);
      }
    }

    // Dedupe by title
    const seen = new Set();
    const deduped = allArticles.filter(a => {
      if (!a.title || seen.has(a.title.toLowerCase())) return false;
      seen.add(a.title.toLowerCase());
      return true;
    });

    // Add category to each article
    const categorized = deduped.map(a => ({
      ...a,
      category: detectCategory(a.title, a.summary || ''),
    }));

    // Save to Supabase — upsert by title to avoid duplicates
    if (categorized.length > 0) {
      const rows = categorized.map(a => ({
        title: a.title,
        url: a.url || null,
        source: a.source || null,
        summary: a.summary || null,
        published_at: a.published_at || new Date().toISOString(),
        category: a.category,
        catalyst_signal: a.catalyst_signal || null,
        matched_keywords: a.matched_keywords || [],
      }));

      // Insert only — skip duplicates via title uniqueness
      const { error } = await supabase
        .from('news_articles')
        .upsert(rows, { onConflict: 'title', ignoreDuplicates: true });

      if (error) console.error('Supabase news insert error:', error);
    }

    return NextResponse.json({
      success: true,
      articles_fetched: categorized.length,
      articles: categorized,
    });

  } catch (err) {
    console.error('News route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — just return what's in the DB
export async function GET(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('news_articles')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ articles: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
