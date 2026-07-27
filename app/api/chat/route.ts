import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const completion = await client.chat.completions.create({
      model: "poolside/laguna-s-2.1:free",
      messages: [
        {
          role: "system",
          content: "You are RDM-ENGINE, an elite Roblox Luau developer and UI/UX expert developed by Google. Provide clean, high-performance Roblox scripts and technical solutions."
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
    });

    return Response.json({ result: completion.choices[0].message.content });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
      }
