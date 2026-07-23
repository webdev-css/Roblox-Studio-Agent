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
    const { message, explorerData, model, userEmail } = await req.json();

    // Owner telemetry or auditing can hook here if hossiani961@gmail.com is interacting
    const isOwner = userEmail === 'hossiani961@gmail.com';
    if (isOwner) {
      console.log(`[OWNER AUDIT LOG] Owner session active for query: "${message}"`);
    }

    let fullPrompt = message;
    if (explorerData) {
      fullPrompt = `[Roblox Explorer Hierarchy Context]:\n${explorerData}\n\n[User Request]: ${message}`;
    }

    const targetModelName = 'gemini-2.5-flash';

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
   
