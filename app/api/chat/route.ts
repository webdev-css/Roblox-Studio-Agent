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
      { role: "system", content: system || "You are a helpful assistant." },
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
        model: "openai/gpt-4o-mini", // Change to match your preferred OpenRouter model id if needed
        messages: formattedMessages,
        temperature: temperature || 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Failed to fetch from OpenRouter" },
        { status: response.status }
      );
    }

    const reply = data.choices?.[0]?.message?.content || "No response received.";
    return NextResponse.json({ reply });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
        }
