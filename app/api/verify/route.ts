// app/api/verify/route.ts (or app/api/auth/verify/route.ts)
import { NextResponse } from "next/server";
import { verificationCodes } from "../store"; // <-- Import from the same shared file

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    // Read from the shared map
    const storedCode = verificationCodes.get(email);

    if (!storedCode || storedCode !== code) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    verificationCodes.delete(email);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
}
