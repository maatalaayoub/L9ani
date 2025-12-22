import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';
import { notifyEmailVerificationSent, notifyEmailVerificationFailed } from '@/lib/notifications';
import { getVerificationEmailTemplate, getUserLanguage } from '@/lib/emailTemplates';

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

        console.log('[ResendVerification] Updating profile with token for user:', profile.auth_user_id);

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
            console.error('[ResendVerification] This may indicate the email_verification_token column is missing. Run migration 015.');
            return NextResponse.json({ error: 'Failed to generate verification link. Database may need migration.' }, { status: 500 });
        }

        console.log('[ResendVerification] Token saved, sending email...');

        // Get user's preferred language
        const userLanguage = await getUserLanguage(supabaseAdmin, profile.auth_user_id);
        console.log('[ResendVerification] User language:', userLanguage);

        // Send verification email
        const resend = new Resend(resendApiKey);
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lqani.ma';
        const confirmUrl = `${baseUrl}/api/auth/confirm-signup?token=${verificationToken}&user_id=${profile.auth_user_id}`;
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

        // Get localized email template
        const emailTemplate = getVerificationEmailTemplate(confirmUrl, profile.first_name || 'there', userLanguage);

        const { data: emailData, error: emailError } = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
        });

        if (emailError) {
            console.error('[ResendVerification] Email send error:', emailError);
            
            // Create failure notification
            try {
                await notifyEmailVerificationFailed(profile.auth_user_id, email, { 
                    locale: 'en',
                    reason: emailError.message || 'Email delivery failed'
                });
                console.log('[ResendVerification] Failure notification created');
            } catch (notifErr) {
                console.error('[ResendVerification] Failed to create failure notification:', notifErr);
            }
            
            return NextResponse.json({ 
                error: 'Failed to send verification email. Please check your email address and try again.',
                emailFailed: true
            }, { status: 500 });
        }

        console.log('[ResendVerification] Email sent successfully to:', email);

        // Create notification that verification email was sent
        try {
            await notifyEmailVerificationSent(profile.auth_user_id, email, { locale: userLanguage });
            console.log('[ResendVerification] Notification created');
        } catch (notifErr) {
            console.error('[ResendVerification] Failed to create notification:', notifErr);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Verification email sent successfully' 
        });

    } catch (err) {
        console.error('[ResendVerification] Unexpected error:', err);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}
