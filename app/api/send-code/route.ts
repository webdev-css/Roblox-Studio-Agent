import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Check if this user is the designated site owner
    const isAdminOwner = email.toLowerCase() === 'hossiani961@gmail.com';

    await resend.emails.send({
      from: 'Roblox AI Studio <onboarding@resend.dev>',
      to: email,
      subject: isAdminOwner ? '👑 Owner Verification Code - Roblox AI Studio' : '🔑 Your Verification Code - Roblox AI Studio',
      html: `
        <div style="font-family: system-ui, sans-serif; padding: 20px; background-color: #171717; color: #fff; border-radius: 12px; border: 1px solid #333;">
          <h2 style="color: #d97706; margin-top: 0;">Roblox AI Studio ⚡</h2>
          <p style="color: #e5e5e5; font-size: 14px;">
            ${isAdminOwner ? '👑 <b>Owner Account Recognized:</b> Full system admin rights will be granted upon login.' : 'Here is your single-use verification code to log in:'}
          </p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #fbbf24; background: #262626; padding: 14px 20px; border-radius: 8px; display: inline-block; margin: 10px 0;">
            ${verificationCode}
          </div>
          <p style="color: #737373; font-size: 12px; margin-top: 20px;">If you did not request this code, you can safely ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ 
      success: true, 
      code: verificationCode, 
      isAdmin: isAdminOwner 
    });
  } catch (error: any) {
    console.error('Email Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
      }
  
