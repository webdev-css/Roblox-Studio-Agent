import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { model, system, messages, temperature } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is missing on the server.' },
        { status: 500 }
      );
    }

    // Map your local model names to actual OpenRouter model IDs (update these if you use specific models)
    let openRouterModel = 'deepseek/deepseek-chat'; // default fallback
    if (model === 'rdm-2.1-common') openRouterModel = 'deepseek/deepseek-chat';
    if (model === 'rdm-2.2-common') openRouterModel = 'deepseek/deepseek-r1';
    if (model === 'rdm-2.3-pro') openRouterModel = 'anthropic/claude-3.5-sonnet';
    if (model === 'rdm-2.4-xor') openRouterModel = 'anthropic/claude-3.5-sonnet';

    // Format messages for OpenRouter / OpenAI standard structure
    const formattedMessages = [
      { role: 'system', content: system || 'You are RDM-ENGINE.' },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
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
        model: openRouterModel,
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
