import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const ROBLOX_SYSTEM_INSTRUCTION = `
You are an expert Roblox Luau Software Engineer and Game Developer.
Rules:
1. Output valid Luau syntax (use task.wait(), Players:GetPlayers(), vector types, etc.).
2. Adhere to Client-Server architecture:
   - ServerScriptService / ServerStorage -> Server Scripts
   - StarterPlayerScripts / StarterGui -> LocalScripts
   - ReplicatedStorage -> ModuleScripts & RemoteEvents
3. Always tell the user exactly WHERE to put each script in their Roblox Studio Explorer tree.
`;

export async function POST(req: Request) {
  try {
    const { message, explorerData, model } = await req.json();

    let fullPrompt = message;
    if (explorerData) {
      fullPrompt = `[Roblox Explorer Hierarchy]:\n${explorerData}\n\n[User Question]: ${message}`;
    }

    // Use active gemini-2.5-flash-lite model
    const targetModel = model || 'gemini-2.5-flash-lite';

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: fullPrompt,
      config: {
        systemInstruction: ROBLOX_SYSTEM_INSTRUCTION,
      },
    });

    const replyText = response.text || '';

    return NextResponse.json({ success: true, reply: replyText });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
      }
      
