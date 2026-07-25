import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.HF_TOKEN;

    if (!apiKey) {
      return NextResponse.json(
        { error: "HF_TOKEN environment variable is missing on server." },
        { status: 500 }
      );
    }

    // Target a standard compatible base model, and pass your custom LoRA adapter inside parameters
    const response = await fetch(
      "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-7B-Instruct",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            adapter_id: "mrfirex79/RDM-ENGINE",
            max_new_tokens: 256,
            temperature: 0.7,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: `API error: ${JSON.stringify(data)}` },
        { status: response.status }
      );
    }

    const reply = data[0]?.generated_text || data.generated_text || "No response generated";

    return NextResponse.json({ success: true, response: reply });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Error processing request: ${error.message}` },
      { status: 500 }
    );
  }
}
