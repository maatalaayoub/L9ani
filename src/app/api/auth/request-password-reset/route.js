import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';
import { getPasswordResetEmailTemplate, getUserLanguage } from '@/lib/emailTemplates';

export async function POST(request) {
    try {
        const { email } = await request.json();

        console.log('[RequestPasswordReset] Request received for:', email);

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[RequestPasswordReset] Missing Supabase configuration');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        if (!resendApiKey || resendApiKey === 'your_resend_api_key_here') {
            console.error('[RequestPasswordReset] Missing Resend API key');
            return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Find the user's profile by email
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('auth_user_id, email, first_name, has_password')
            .ilike('email', email)
            .single();

        if (fetchError || !profile) {
            console.log('[RequestPasswordReset] Profile not found for email:', email);
            // Don't reveal if email exists or not for security
            return NextResponse.json({ 
                success: true, 
                message: 'If an account exists with this email, a password reset link has been sent.' 
            });
        }

        // Check if user has a password (OAuth-only users can't reset password)
        if (!profile.has_password) {
            console.log('[RequestPasswordReset] User has no password (OAuth-only):', email);
            // Still return success for security reasons
            return NextResponse.json({ 
                success: true, 
                message: 'If an account exists with this email, a password reset link has been sent.' 
            });
        }

        // Generate a secure token for password reset
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        console.log('[RequestPasswordReset] Storing reset token for user:', profile.auth_user_id);

        // Store the reset token in the profile
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                password_reset_token: resetToken,
                password_reset_token_expires: tokenExpiry.toISOString(),
            })
            .eq('auth_user_id', profile.auth_user_id);

        if (updateError) {
            console.error('[RequestPasswordReset] Update error:', updateError);
            return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 });
        }

        console.log('[RequestPasswordReset] Token saved, sending email...');

        // Get user's preferred language
        const userLanguage = await getUserLanguage(supabaseAdmin, profile.auth_user_id);
        console.log('[RequestPasswordReset] User language:', userLanguage);

        // Build the reset URL
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lqani.ma';
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&user_id=${profile.auth_user_id}`;

        // Send password reset email
        const resend = new Resend(resendApiKey);
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

        // Get localized email template
        const emailTemplate = getPasswordResetEmailTemplate(resetUrl, userLanguage);

        const { data: emailData, error: emailError } = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
        });

        if (emailError) {
            console.error('[RequestPasswordReset] Email send error:', emailError);
            // Clear the token since email failed
            await supabaseAdmin
                .from('profiles')
                .update({
                    password_reset_token: null,
                    password_reset_token_expires: null,
                })
                .eq('auth_user_id', profile.auth_user_id);
            
            return NextResponse.json({ 
                error: 'Failed to send password reset email',
                emailFailed: true
            }, { status: 500 });
        }

        console.log('[RequestPasswordReset] Email sent successfully to:', email);

        return NextResponse.json({ 
            success: true, 
            message: 'Password reset email sent successfully' 
        });

    } catch (err) {
        console.error('[RequestPasswordReset] Unexpected error:', err);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
