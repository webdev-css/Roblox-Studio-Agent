import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Google AI with your environment variable key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// System prompt tailored for high-quality Roblox Luau scripting
const SYSTEM_INSTRUCTION = `
You are Roblox AI Studio, an expert AI assistant specialized in Roblox game development, Luau scripting, UI design, and game architecture.

Rules for responses:
1. Provide optimized, modern Luau code blocks (using standard Luau syntax, type annotations where helpful).
2. Clearly distinguish between ServerScripts, LocalScripts, and ModuleScripts.
3. Keep code clean, scannable, and well-commented.
4. Avoid deprecated Roblox functions (e.g., use task.wait() instead of wait(), Instance.new with parent as 2nd argument avoidance, etc.).
`;

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is missing on server." },
        { status: 500 }
      );
    }

    // Using gemini-3.6-flash for active support and high performance
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Format chat history for Gemini API
    const formattedHistory = Array.isArray(history)
      ? history.map((item: { role: string; content: string }) => ({
          role: item.role === "user" ? "user" : "model",
          parts: [{ text: item.content }],
        }))
      : [];

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return NextResponse.json({ reply: responseText });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while generating response." },
      { status: 500 }
    );
  }
  }
