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

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/mrfirex79/RDM-ENGINE",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: "### Instruction:\n" + prompt + "\n\n### Response:\n",
          parameters: {
            max_new_tokens: 256,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Hugging Face API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data[0]?.generated_text || "No response generated";

    return NextResponse.json({ success: true, response: reply });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Error processing request: ${error.message}` },
      { status: 500 }
    );
  }
}
