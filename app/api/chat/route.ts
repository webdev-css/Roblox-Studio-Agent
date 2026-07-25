import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      // Sending errors inside the "response" key ensures your frontend displays it!
      return NextResponse.json({ 
        success: false, 
        response: "Error: OPENROUTER_API_KEY environment variable is missing on server." 
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://your-app.com",
          "X-Title": "My AI App",
        },
        body: JSON.stringify({
          // 🛑 THE MAGIC FIX: This router randomly selects from the best 100% FREE models!
          model: "openrouter/free", 
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

    // If OpenRouter blocks the request (e.g., bad API key, rate limit), print the exact error in the chat
    if (!response.ok) {
      const errorMessage = data.error?.message || JSON.stringify(data);
      return NextResponse.json({ 
        success: false, 
        response: `OpenRouter API Error: ${errorMessage}` 
      });
    }

    // Safely extract the message text
    const reply = data.choices?.[0]?.message?.content || "The AI returned an empty response.";

    return NextResponse.json({ success: true, response: reply });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      response: `Server Error: ${error.message}` 
    });
  }
        }
