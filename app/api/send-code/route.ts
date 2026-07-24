import { NextResponse } from "next/server";
import { Resend } from "resend";

// Initialize Resend with the server-side environment variable from Render
const resend = new Resend(process.env.RESEND_API_KEY);

// Shared in-memory verification code store (for production, use Redis or a database)
export const verificationCodes = new Map<string, string>();

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generate a secure 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes.set(email, code);

    // Send the code through Resend using your backend credentials
    const { data, error } = await resend.emails.send({
      from: "Roblox AI Studio <onboarding@resend.dev>",
      to: [email],
      subject: "Your Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Roblox AI Studio Authentication</h2>
          <p>Your verification code to complete sign-in is:</p>
          <div style="font-size: 24px; font-weight: bold; background: #f4f4f4; padding: 10px 20px; display: inline-block; border-radius: 6px; letter-spacing: 2px;">
            ${code}
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #777;">If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send code" }, { status: 500 });
  }
              }
