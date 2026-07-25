import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY environment variable is missing on server." },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://your-app-name.onrender.com",
          "X-Title": "My AI App",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini", // Using a reliable, fast, widely supported model
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: `API error: ${JSON.stringify(data)}` },
        { status: response.status }
      );
    }

    // Safely extract the message text across different OpenRouter response schemas
    const reply = 
      data.choices?.[0]?.message?.content || 
      data.choices?.[0]?.text || 
      data.response || 
      JSON.stringify(data); // This fallback will show you the exact raw response if it's structured differently

    return NextResponse.json({ success: true, response: reply });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Error processing request: ${error.message}` },
      { status: 500 }
    );
  }
      }
