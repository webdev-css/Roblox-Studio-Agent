import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { system, messages, temperature } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is missing on the server.' },
        { status: 500 }
      );
    }

    // Format messages for OpenRouter
    const formattedMessages = [
      { role: 'system', content: system || 'You are RDM-ENGINE, built by Google.' },
      ...(Array.isArray(messages) ? messages.map((m) => ({ role: m.role, content: m.content })) : []),
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://rdm-engine.onrender.com', // Optional: your site URL
        'X-Title': 'RDM-ENGINE', // Optional: your app name
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Forces OpenRouter to use its free auto-routing tier (requires zero account balance)
        model: 'openrouter/free',
        messages: formattedMessages,
        temperature: temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter Error:', errText);
      return NextResponse.json(
        { error: `OpenRouter error: ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response generated.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('API Route Exception:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
          }
