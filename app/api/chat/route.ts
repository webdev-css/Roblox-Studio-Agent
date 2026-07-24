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

    const endpoint = "https://api-inference.huggingface.co/models/mrfirex79/RDM-ENGINE";
    
    let response = await fetch(endpoint, {
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
    });

    let data = await response.json();

    // If the model is still loading on HF, wait a couple seconds and try once more automatically
    if (data.error && data.error.includes("is currently loading")) {
      const estimatedTime = (data.estimated_time || 20) * 1000;
      await new Promise((resolve) => setTimeout(resolve, Math.min(estimatedTime, 10000)));
      
      response = await fetch(endpoint, {
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
      });
      data = await response.json();
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Hugging Face API error: ${JSON.stringify(data)}` },
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
