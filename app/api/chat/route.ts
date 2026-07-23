import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const ROBLOX_SYSTEM_INSTRUCTION = `
You are an expert Roblox Luau Software Engineer and Game Developer assistant powered by RDM Engine.
Rules:
1. Output clean, efficient, and valid Luau syntax (use task.wait(), Players:GetPlayers(), vector math, etc.).
2. Adhere strictly to Client-Server architecture:
   - ServerScriptService / ServerStorage -> Server Scripts
   - StarterPlayerScripts / StarterGui -> LocalScripts
   - ReplicatedStorage -> ModuleScripts & RemoteEvents
3. Always tell the user exactly WHERE to place each script in their Roblox Studio Explorer tree.
`;

export async function POST(req: Request) {
  try {
    const { message, explorerData, model, userSession } = await req.json();

    let fullPrompt = message;
    if (explorerData) {
      fullPrompt = `[Roblox Explorer Hierarchy Context]:\n${explorerData}\n\n[User Request]: ${message}`;
    }

    let targetModel = 'gemini-2.5-flash';

    if (model === 'rdm-2.1-pro') {
      targetModel = 'gemini-2.5-pro';
    } else if (model === 'rdm-1.1-mythical') {
      targetModel = 'gemini-2.5-flash';
    }

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
    console.error('API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
