import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const { userId, newEmail } = await request.json();

        console.log('[RequestEmailChange] Request received for user:', userId, 'newEmail:', newEmail);

        if (!userId || !newEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[RequestEmailChange] Missing Supabase configuration');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        if (!resendApiKey || resendApiKey === 'your_resend_api_key_here') {
            console.error('[RequestEmailChange] Missing or invalid Resend API key');
            return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
        }

        const resend = new Resend(resendApiKey);

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Check if email is already in use
        const { data: existingUser } = await supabaseAdmin
            .from('profiles')
            .select('auth_user_id')
            .eq('email', newEmail)
            .neq('auth_user_id', userId)
            .single();

        if (existingUser) {
            return NextResponse.json({ error: 'Email is already in use' }, { status: 400 });
        }

        // Generate a secure token for email verification
        const token = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        console.log('[RequestEmailChange] Storing pending email change...');

        // Store the pending email change in the profile
        const { data: updateData, error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                pending_email: newEmail,
                email_change_token: token,
                email_change_token_expires: tokenExpiry.toISOString(),
            })
            .eq('auth_user_id', userId)
            .select();

        if (updateError) {
            console.error('[RequestEmailChange] Update error:', updateError);
            return NextResponse.json({ error: `Database error: ${updateError.message}` }, { status: 500 });
        }

        if (!updateData || updateData.length === 0) {
            console.error('[RequestEmailChange] No profile found for user:', userId);
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        console.log('[RequestEmailChange] Pending email stored successfully');

        // Build the confirmation URL
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lqani.ma';
        const confirmUrl = `${baseUrl}/api/auth/confirm-email-change?token=${token}&user_id=${userId}`;

        console.log('[RequestEmailChange] Sending email to:', newEmail);
        console.log('[RequestEmailChange] Confirm URL:', confirmUrl);

        // Use custom domain if configured, otherwise use Resend's default for testing
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

        // Send confirmation email to the NEW email only
        const { data: emailData, error: emailError } = await resend.emails.send({
            from: fromEmail,
            to: newEmail,
            subject: 'Confirm Email Change - Lqani.ma',
            html: getEmailTemplate(confirmUrl),
        });

        if (emailError) {
            console.error('[RequestEmailChange] Email send error:', JSON.stringify(emailError, null, 2));
            console.error('[RequestEmailChange] From email used:', fromEmail);
            console.error('[RequestEmailChange] To email:', newEmail);
            // Rollback the pending change
            await supabaseAdmin
                .from('profiles')
                .update({
                    pending_email: null,
                    email_change_token: null,
                    email_change_token_expires: null,
                })
                .eq('auth_user_id', userId);
            return NextResponse.json({ 
                error: 'Failed to send confirmation email', 
                details: emailError.message || emailError.name || 'Unknown error'
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Confirmation email sent to new address' });

    } catch (err) {
        console.error('[RequestEmailChange] Unexpected error:', err);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}

function getEmailTemplate(confirmUrl) {
    return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Confirm Email Change - Lqani.ma</title>
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
                            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; display: inline-block;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="80" height="80">
                                    <tr>
                                        <td align="center" valign="middle">
                                            <span style="font-size: 36px; line-height: 1;">📧</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 16px 0;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; line-height: 1.4;">
                                Confirm Email Change
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <p style="margin: 0; font-size: 16px; color: #64748b; line-height: 1.7; text-align: center;">
                                You requested to change your email address on Lqani.ma. Click the button below to confirm this change.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 14px;">
                                        <a href="${confirmUrl}" 
                                           target="_blank"
                                           style="display: inline-block; padding: 18px 56px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                            Confirm New Email
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
                                    <td style="background-color: #fef3c7; border-radius: 12px; padding: 16px 20px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td width="32" valign="top">
                                                    <span style="font-size: 20px;">⏰</span>
                                                </td>
                                                <td style="padding-left: 12px;">
                                                    <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
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
                                If you didn't request this email change, please ignore this email.
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
