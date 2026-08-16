import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { model, system, temperature, messages } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key is missing on Render." },
        { status: 500 }
      );
    }

    // Format messages for OpenRouter
    const formattedMessages = [
      { role: "system", content: system || "You are an expert Roblox script and UI developer." },
      ...messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://roblox-studio-agent.onrender.com",
        "X-Title": "Roblox Studio Agent",
      },
      body: JSON.stringify({
        // Using the free tier model ID
        model: "nvidia/nemotron-3-ultra-550b-a55b:free", 
        messages: formattedMessages,
        // Lower temperature (0.2) is better for code accuracy/Roblox syntax
        temperature: temperature || 0.2, 
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
      }
