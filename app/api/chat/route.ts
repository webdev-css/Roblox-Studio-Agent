import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt, systemInstructions, modelId } = await req.json();
    
    // Pulls OpenRouter key from Render environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Server OpenRouter API key not configured on Render environment variables." },
        { status: 500 }
      );
    }

    // Map your custom model IDs to OpenRouter model names (or default to a reliable one)
    let openRouterModel = "openai/gpt-4o-mini";
    if (modelId === "rdm-2.1-pro") openRouterModel = "anthropic/claude-3.5-sonnet";
    if (modelId === "rdm-1.1-mythical") openRouterModel = "anthropic/claude-3.5-sonnet";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`,
        "HTTP-Referer": "https://roblox-ai-studio.onrender.com", // Optional, helps OpenRouter ranking
        "X-Title": "Roblox AI Studio" // Optional
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: [
          { role: "system", content: systemInstructions },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `OpenRouter API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No response generated.";

    return NextResponse.json({ content });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate response." },
      { status: 500 }
    );
  }
      }
