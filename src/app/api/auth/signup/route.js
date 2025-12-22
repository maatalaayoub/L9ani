
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password, confirmPassword, firstName, lastName, phoneNumber } = body;

        // 1. Basic Validation
        if (!email || !password || !confirmPassword) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 2. Email Format Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // 3. Password Strength Validation
        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }
        if (!/\d/.test(password)) {
            return NextResponse.json(
                { error: 'Password must contain at least one number' },
                { status: 400 }
            );
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return NextResponse.json(
                { error: 'Password must contain at least one symbol' },
                { status: 400 }
            );
        }

        // 4. Passwords Match
        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: 'Passwords do not match' },
                { status: 400 }
            );
        }

        // 5. Check if email already exists in profiles table
        if (!supabaseAdmin) {
            console.error('Supabase Service Role Key is missing on server');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // Check if email is already registered
        const { data: existingProfile, error: checkError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .ilike('email', email)
            .maybeSingle();

        if (checkError) {
            console.error('Error checking existing email:', checkError);
            return NextResponse.json(
                { error: 'Error checking email availability' },
                { status: 500 }
            );
        }

        if (existingProfile) {
            return NextResponse.json(
                { error: 'Email is already registered' },
                { status: 400 }
            );
        }

        // Also check auth.users table directly
        const { data: authUsers, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers();
        if (!authCheckError && authUsers?.users) {
            const emailExists = authUsers.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
            if (emailExists) {
                return NextResponse.json(
                    { error: 'Email is already registered' },
                    { status: 400 }
                );
            }
        }

        // 6. Create User using Service Role Key

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                firstName: firstName || "",
                lastName: lastName || "",
                phoneNumber: phoneNumber || ""
            }
        });

        if (error) {
            console.error('Supabase createUser error:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        // Insert into profiles table
        if (data.user) {
            // Generate base username
            let baseUsername = "";
            if (firstName && lastName) {
                baseUsername = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '');
            } else if (firstName) {
                baseUsername = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
            } else {
                baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            }

            // Generate secure token for email verification (instead of code)
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Append random suffix to ensure uniqueness
            const suffix = Math.floor(1000 + Math.random() * 9000);
            const username = `${baseUsername}${suffix}`;

            const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
                auth_user_id: data.user.id,
                username: username,
                email: email,
                first_name: firstName || "",
                last_name: lastName || "",
                phone: phoneNumber || "",
                avatar_url: null,
                email_verified: false,
                email_verification_token: verificationToken,
                email_verification_token_expires: tokenExpiry.toISOString(),
                has_password: true,
                terms_accepted: true,
                terms_accepted_at: new Date().toISOString()
            }, { onConflict: 'auth_user_id' });

            if (profileError) {
                console.error('Error creating/updating profile:', profileError);
                return NextResponse.json(
                    { error: 'Profile creation failed: ' + profileError.message },
                    { status: 500 }
                );
            }

            // Send verification email via Resend
            const resendApiKey = process.env.RESEND_API_KEY;
            if (resendApiKey && resendApiKey !== 'your_resend_api_key_here') {
                try {
                    const resend = new Resend(resendApiKey);
                    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lqani.ma';
                    const confirmUrl = `${baseUrl}/api/auth/confirm-signup?token=${verificationToken}&user_id=${data.user.id}`;
                    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

                    const { error: emailError } = await resend.emails.send({
                        from: fromEmail,
                        to: email,
                        subject: 'Verify Your Email - Lqani.ma',
                        html: getSignupEmailTemplate(confirmUrl, firstName || 'there'),
                    });

                    if (emailError) {
                        console.error('[Signup] Email send error:', emailError);
                        // Don't fail signup if email fails - user can request resend later
                    } else {
                        console.log(`[Signup] Verification email sent to ${email}`);
                    }
                } catch (emailErr) {
                    console.error('[Signup] Email service error:', emailErr);
                    // Don't fail signup
                }
            } else {
                console.log(`[TESTING] Verification token for ${email}: ${verificationToken}`);
            }

            // Create default settings for the new user
            const { error: settingsError } = await supabaseAdmin.from('user_settings').insert({
                user_id: data.user.id,
                theme: 'system',
                language: 'en',
                sighting_alerts: true,
                new_device_login: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            if (settingsError) {
                console.error('Error creating default settings:', settingsError);
                // Don't fail signup if settings creation fails - it's not critical
            }
        }

        return NextResponse.json(
            { message: 'User created successfully', user: data.user },
            { status: 201 }
        );

    } catch (err) {
        console.error('Signup route error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

function getSignupEmailTemplate(confirmUrl, firstName) {
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
                                Welcome to Lqani.ma!
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <p style="margin: 0; font-size: 16px; color: #64748b; line-height: 1.7; text-align: center;">
                                Hi ${firstName}, thank you for signing up! Please verify your email address by clicking the button below.
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
                                            Verify Email Address
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
