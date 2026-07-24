import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini SDK with your environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// System prompt tailored for Roblox Luau scripting
const SYSTEM_INSTRUCTION = `
You are Roblox AI Studio, an expert AI assistant specialized in Roblox game development, Luau scripting, UI design, and game architecture.

Guidelines:
1. Provide optimized, modern Luau code blocks with clean formatting.
2. Distinguish clearly between ServerScripts, LocalScripts, and ModuleScripts.
3. Keep code easy to understand and well-commented.
4. Use modern Roblox APIs (e.g., task.wait(), task.spawn(), modern Instance creation).
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Flexible extraction: handles 'message', 'prompt', 'text', 'content', or 'input'
    const message =
      body.message || body.prompt || body.text || body.content || body.input;
    const history = body.history || [];

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

    // Initialize the model with active version
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Format chat history for Gemini API
    const formattedHistory = Array.isArray(history)
      ? history.map((item: { role: string; content?: string; text?: string }) => ({
          role: item.role === "user" ? "user" : "model",
          parts: [{ text: item.content || item.text || "" }],
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
