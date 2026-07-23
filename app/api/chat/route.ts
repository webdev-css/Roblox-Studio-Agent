import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
    const { message, explorerData, model } = await req.json();

    let fullPrompt = message;
    if (explorerData) {
      fullPrompt = `[Roblox Explorer Hierarchy Context]:\n${explorerData}\n\n[User Request]: ${message}`;
    }

    let targetModelName = 'gemini-1.5-flash';
    if (model === 'rdm-2.1-pro') {
      targetModelName = 'gemini-1.5-pro';
    }

    const generativeModel = genAI.getGenerativeModel({
      model: targetModelName,
      systemInstruction: ROBLOX_SYSTEM_INSTRUCTION,
    });

    const result = await generativeModel.generateContent(fullPrompt);
    const response = await result.response;
    const replyText = response.text() || '';

    return NextResponse.json({ success: true, reply: replyText });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
   
