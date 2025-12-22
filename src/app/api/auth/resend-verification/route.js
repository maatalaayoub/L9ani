import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';
import { notifyEmailVerificationSent } from '@/lib/notifications';

export async function POST(request) {
    try {
        const { email } = await request.json();

        console.log('[ResendVerification] Request received for:', email);

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[ResendVerification] Missing Supabase configuration');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        if (!resendApiKey || resendApiKey === 'your_resend_api_key_here') {
            console.error('[ResendVerification] Missing Resend API key');
            return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Find the user's profile
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('auth_user_id, email, first_name, email_verified')
            .ilike('email', email)
            .single();

        if (fetchError || !profile) {
            console.error('[ResendVerification] Profile not found:', fetchError);
            // Don't reveal if email exists or not for security
            return NextResponse.json({ 
                success: true, 
                message: 'If an account exists with this email, a verification link has been sent.' 
            });
        }

        // Check if already verified
        if (profile.email_verified) {
            return NextResponse.json({ 
                error: 'Email is already verified. You can log in now.',
                alreadyVerified: true 
            }, { status: 400 });
        }

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Update the profile with new token
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                email_verification_token: verificationToken,
                email_verification_token_expires: tokenExpiry.toISOString(),
            })
            .eq('auth_user_id', profile.auth_user_id);

        if (updateError) {
            console.error('[ResendVerification] Update error:', updateError);
            return NextResponse.json({ error: 'Failed to generate verification link' }, { status: 500 });
        }

        // Send verification email
        const resend = new Resend(resendApiKey);
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lqani.ma';
        const confirmUrl = `${baseUrl}/api/auth/confirm-signup?token=${verificationToken}&user_id=${profile.auth_user_id}`;
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

        const { error: emailError } = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: 'Verify Your Email - Lqani.ma',
            html: getVerificationEmailTemplate(confirmUrl, profile.first_name || 'there'),
        });

        if (emailError) {
            console.error('[ResendVerification] Email send error:', emailError);
            return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
        }

        console.log('[ResendVerification] Email sent successfully to:', email);

        // Create notification that verification email was sent
        await notifyEmailVerificationSent(profile.auth_user_id, email, { locale: 'en' });

        return NextResponse.json({ 
            success: true, 
            message: 'Verification email sent successfully' 
        });

    } catch (err) {
        console.error('[ResendVerification] Unexpected error:', err);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}

function getVerificationEmailTemplate(confirmUrl, firstName) {
    return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Verify Your Email - Lqani.ma</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, Arial, sans-serif;">
    
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff;">
        <tr>
            <td align="center" style="padding: 48px 24px;">
                
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 480px;">
                    
                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <img src="https://nqzjimrupjergwtwzlok.supabase.co/storage/v1/object/public/logo/Untitled%20folder/logo.svg" alt="Lqani.ma" width="140" height="40" style="display: block;">
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 32px 0;">
                            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 50%; display: inline-block;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="80" height="80">
                                    <tr>
                                        <td align="center" valign="middle">
                                            <span style="font-size: 36px; line-height: 1;">✉️</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 16px 0;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; line-height: 1.4;">
                                Verify Your Email
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <p style="margin: 0; font-size: 16px; color: #64748b; line-height: 1.7; text-align: center;">
                                Hi ${firstName}! Click the button below to verify your email address and activate your Lqani.ma account.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 14px;">
                                        <a href="${confirmUrl}" 
                                           target="_blank"
                                           style="display: inline-block; padding: 18px 56px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                            Verify Email
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td style="background-color: #dbeafe; border-radius: 12px; padding: 16px 20px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td width="32" valign="top">
                                                    <span style="font-size: 20px;">⏰</span>
                                                </td>
                                                <td style="padding-left: 12px;">
                                                    <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
                                                        This link expires in <strong>24 hours</strong>
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 0 0 32px 0;">
                            <div style="height: 1px; background-color: #e2e8f0;"></div>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 48px 0;">
                            <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.6; text-align: center;">
                                If you didn't create an account on Lqani.ma, please ignore this email.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 0 0 32px 0;">
                            <div style="height: 1px; background-color: #e2e8f0;"></div>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 16px 0;">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                © 2025 Lqani.ma. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>`;
}
