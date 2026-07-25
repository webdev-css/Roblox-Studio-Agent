import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      // Forcing success: true so your frontend displays this text instead of hiding it!
      return NextResponse.json({ 
        success: true, 
        response: "🚨 ERROR: OPENROUTER_API_KEY is missing from environment variables." 
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://myapp.com",
          "X-Title": "My AI App"
        },
        body: JSON.stringify({
          model: "openrouter/free", 
          messages: [
            {
              role: "user",
              content: prompt,
            }
          ],
        }),
      }
    );

    const data = await response.json();

    // If OpenRouter blocks the request, print the exact JSON error into the chat window
    if (!response.ok) {
      return NextResponse.json({ 
        success: true, 
        response: `🚨 OPENROUTER API ERROR: ${JSON.stringify(data)}` 
      });
    }

    // Safely extract the message text
    const reply = data.choices?.[0]?.message?.content || "Empty response from OpenRouter.";

    return NextResponse.json({ success: true, response: reply });

  } catch (error: any) {
    // If the server crashes, print the crash log into the chat window
    return NextResponse.json({ 
      success: true, 
      response: `🚨 SERVER CRASH: ${error.message}` 
    });
  }
  }
