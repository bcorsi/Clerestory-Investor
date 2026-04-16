import { NextResponse } from 'next/server';

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

  try {
    const body = await request.json();

    // Handle both calling formats:
    // Format A: { messages: [...], system: "...", model: "..." }  (raw Anthropic format)
    // Format B: { prompt: "...", type: "property_synthesis" }     (simple from PropertyDetail)
    let messages = body.messages;
    let system = body.system;

    if (!messages && body.prompt) {
      // Format B — convert simple prompt to messages array
      messages = [{ role: 'user', content: body.prompt }];
      if (!system) {
        system = 'You are Clerestory, an AI acquisition intelligence system for institutional industrial real estate investors in Southern California. Be specific, use numbers, and give clear actionable recommendations. Never hedge with "may" or "might".';
      }
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages or prompt provided' }, { status: 400 });
    }

    const payload = {
      model: body.model || 'claude-sonnet-4-20250514',
      max_tokens: body.max_tokens || 2048,
      messages,
    };
    if (system) payload.system = system;
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
      return NextResponse.json({ error: `API error: ${res.status}`, detail: err }, { status: res.status });
    }

    const data = await res.json();

    // Return both raw Anthropic format AND extracted text for simple callers
    const text = data.content?.[0]?.text || '';
    return NextResponse.json({
      ...data,           // Full Anthropic response (for Format A callers)
      content: text,     // Extracted text string (for Format B callers like PropertyDetail)
      text: text,        // Alias (some components check data.text)
      type: body.type,   // Pass through generation type
    });

  } catch (err) {
    console.error('AI route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
