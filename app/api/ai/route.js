import { NextResponse } from 'next/server';

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

  try {
    const body = await request.json();
    const payload = {
      model: body.model || 'claude-sonnet-4-20250514',
      max_tokens: body.max_tokens || 5000,
      messages: body.messages,
    };
    if (body.system) payload.system = body.system;
    if (body.tools) payload.tools = body.tools;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Anthropic API error:', res.status, err);
      return NextResponse.json({ error: `API error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('AI route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
