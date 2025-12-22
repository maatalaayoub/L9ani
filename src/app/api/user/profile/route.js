import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';
import crypto from 'crypto';
import { notifyEmailVerificationSent } from '@/lib/notifications';

export async function GET(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Profile GET] supabaseAdmin is not configured - missing SUPABASE_SERVICE_ROLE_KEY');
            return NextResponse.json({ 
                error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY not set',
                profile: null 
            }, { status: 200 }); // Return 200 with null profile to allow graceful fallback
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId', profile: null }, { status: 400 });
        }

        console.log('[API Profile GET] Fetching profile for userId:', userId);

        // CRITICAL: First verify the auth user actually exists in Supabase Auth
        // This prevents "ghost" sessions where the user was deleted but the token is still valid
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (authError || !authUser?.user) {
            console.log('[API Profile GET] Auth user does not exist for userId:', userId, '- signaling logout');
            // Return a special response that tells the client to logout
            return NextResponse.json({ 
                profile: null, 
                userDeleted: true,
                error: 'User no longer exists in authentication system' 
            }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('auth_user_id', userId)
            .maybeSingle(); // Use maybeSingle to avoid error when no profile exists

        if (error) {
            console.error('[API Profile GET] Error fetching profile:', error.message, error.code);
            // Return null profile instead of error for graceful handling
            return NextResponse.json({ profile: null, error: error.message }, { status: 200 });
        }

        console.log('[API Profile GET] Profile found:', data ? 'yes' : 'no');
        return NextResponse.json({ profile: data || null });
    } catch (err) {
        console.error('[API Profile GET] Exception:', err.message);
        return NextResponse.json({ error: err.message, profile: null }, { status: 200 });
    }
}

export async function POST(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Profile POST] supabaseAdmin is not configured - missing SUPABASE_SERVICE_ROLE_KEY');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const body = await request.json();
        const { userId, email, firstName, lastName, username, avatarUrl, termsAccepted, hasPassword, phone, isEmailSignup } = body;

        console.log('[API Profile POST] Creating profile for:', { userId, email, firstName, lastName });

        if (!userId || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // CRITICAL: First verify the auth user actually exists in Supabase Auth
        // This prevents creating orphan profiles for deleted users
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (authError || !authUser?.user) {
            console.log('[API Profile POST] Auth user does not exist for userId:', userId, '- rejecting profile creation');
            return NextResponse.json({ 
                profile: null, 
                userDeleted: true,
                error: 'User no longer exists in authentication system' 
            }, { status: 401 });
        }

        // Check if profile already exists
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('auth_user_id', userId)
            .maybeSingle();

        if (existingProfile) {
            console.log('[API Profile] Profile already exists for user:', userId, '- skipping creation');
            
            // If profile exists but not verified and isEmailSignup, still send verification email
            if (isEmailSignup && !existingProfile.email_verified) {
                console.log('[API Profile] Existing unverified profile, sending verification email...');
                await sendVerificationEmail(userId, email, firstName || 'there');
            }
            
            return NextResponse.json({ profile: existingProfile });
        }

        // Generate unique username if not provided
        const finalUsername = username || `${email.split('@')[0]}${Math.floor(1000 + Math.random() * 9000)}`;

        // Generate verification token for email signup users (link-based verification)
        const verificationToken = isEmailSignup ? crypto.randomBytes(32).toString('hex') : null;
        const tokenExpiry = isEmailSignup ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null; // 24 hours

        // Ensure phone number has + prefix if provided
        const formattedPhone = phone ? (phone.startsWith('+') ? phone : `+${phone}`) : null;

        // Create new profile
        const newProfile = {
            auth_user_id: userId,
            email: email,
            first_name: firstName || '',
            last_name: lastName || '',
            username: finalUsername,
            avatar_url: avatarUrl || null,
            created_at: new Date().toISOString(),
            has_password: hasPassword || false,
            terms_accepted: termsAccepted || false,
            terms_accepted_at: termsAccepted ? new Date().toISOString() : null,
            phone: formattedPhone,
            email_verified: false,
            email_verification_token: verificationToken,
            email_verification_token_expires: tokenExpiry ? tokenExpiry.toISOString() : null
        };

        const { data: createdProfile, error: createError } = await supabaseAdmin
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

        if (createError) {
            // Handle duplicate key error - profile was created by another request
            if (createError.code === '23505' || createError.message.includes('duplicate key')) {
                console.log('[API Profile] Profile already exists (race condition), fetching existing profile');
                const { data: existingProfile } = await supabaseAdmin
                    .from('profiles')
                    .select('*')
                    .eq('auth_user_id', userId)
                    .single();
                
                if (existingProfile) {
                    return NextResponse.json({ profile: existingProfile });
                }
            }
            console.error('[API Profile] Error creating profile:', createError);
            return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        // Create default settings for the new user
        const { error: settingsError } = await supabaseAdmin.from('user_settings').insert({
            user_id: userId,
            theme: 'system',
            language: 'en',
            sighting_alerts: true,
            new_device_login: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        if (settingsError) {
            console.error('[API Profile] Error creating default settings:', settingsError);
            // Don't fail profile creation if settings creation fails
        }

        // Send verification email for email signup users
        if (isEmailSignup) {
            console.log('[API Profile] New profile created, sending verification email...');
            await sendVerificationEmail(userId, email, firstName || 'there');
        }

        return NextResponse.json({ profile: createdProfile }, { status: 201 });
    } catch (err) {
        console.error('[API Profile] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Helper function to send verification email
async function sendVerificationEmail(userId, email, firstName) {
    // First, generate and save a new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update profile with new token
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
            email_verification_token: verificationToken,
            email_verification_token_expires: tokenExpiry.toISOString(),
        })
        .eq('auth_user_id', userId);

    if (updateError) {
        console.error('[API Profile] Failed to update verification token:', updateError);
        return;
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    console.log('[API Profile] sendVerificationEmail - API key present:', !!resendApiKey);
    
    if (resendApiKey && resendApiKey !== 'your_resend_api_key_here') {
        try {
            const resend = new Resend(resendApiKey);
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lqani.ma';
            const confirmUrl = `${baseUrl}/api/auth/confirm-signup?token=${verificationToken}&user_id=${userId}`;
            const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

            console.log('[API Profile] Sending email to:', email, 'from:', fromEmail);

            const { data: emailData, error: emailError } = await resend.emails.send({
                from: fromEmail,
                to: email,
                subject: 'Verify Your Email - Lqani.ma',
                html: getVerificationEmailTemplate(confirmUrl, firstName),
            });

            if (emailError) {
                console.error('[API Profile] Email send error:', emailError);
            } else {
                console.log('[API Profile] Verification email sent successfully, ID:', emailData?.id);
                
                // Create notification
                try {
                    await notifyEmailVerificationSent(userId, email, { locale: 'en' });
                    console.log('[API Profile] Notification created');
                } catch (notifErr) {
                    console.error('[API Profile] Failed to create notification:', notifErr);
                }
            }
        } catch (emailErr) {
            console.error('[API Profile] Email service error:', emailErr);
        }
    } else {
        console.log('[API Profile] [TESTING] Would send verification email to:', email);
        // Create notification even in testing mode
        try {
            await notifyEmailVerificationSent(userId, email, { locale: 'en' });
            console.log('[API Profile] Notification created (testing mode)');
        } catch (notifErr) {
            console.error('[API Profile] Failed to create notification:', notifErr);
        }
    }
}

// Email template for verification (same design as resend-verification)
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
