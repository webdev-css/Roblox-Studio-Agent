import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

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

    const hf = new HfInference(apiKey);

    try {
      const response = await hf.textGeneration({
        model: "mrfirex79/RDM-ENGINE",
        inputs: "### Instruction:\n" + prompt + "\n\n### Response:\n",
        parameters: {
          max_new_tokens: 256,
          temperature: 0.7,
        },
      });

      return NextResponse.json({ 
        success: true, 
        response: response.generated_text || "No response generated" 
      });

    } catch (hfError: any) {
      // Handle model loading state gracefully if it's spinning up
      if (hfError.message && hfError.message.includes("loading")) {
        return NextResponse.json(
          { error: "Model is currently warming up on Hugging Face. Please try again in 30 seconds." },
          { status: 503 }
        );
      }
      throw hfError;
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: `Error processing request: ${error.message || error}` },
      { status: 500 }
    );
  }
      }
