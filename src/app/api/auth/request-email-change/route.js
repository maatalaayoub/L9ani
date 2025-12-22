import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getEmailChangeTemplate, getUserLanguage } from '@/lib/emailTemplates';

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

        // Check if user has changed email in the last 24 hours
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('last_email_change')
            .eq('auth_user_id', userId)
            .single();

        if (profileError) {
            console.error('[RequestEmailChange] Error fetching profile:', profileError);
            return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
        }

        if (profile?.last_email_change) {
            const lastChange = new Date(profile.last_email_change);
            const now = new Date();
            const hoursSinceLastChange = (now - lastChange) / (1000 * 60 * 60);
            
            if (hoursSinceLastChange < 24) {
                const hoursRemaining = Math.ceil(24 - hoursSinceLastChange);
                console.log('[RequestEmailChange] Rate limit: user changed email', hoursSinceLastChange.toFixed(1), 'hours ago');
                return NextResponse.json({ 
                    error: 'rate_limit',
                    hoursRemaining: hoursRemaining,
                    message: `You can only change your email once every 24 hours. Please try again in ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}.`
                }, { status: 429 });
            }
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

        // Get user's preferred language
        const userLanguage = await getUserLanguage(supabaseAdmin, userId);
        console.log('[RequestEmailChange] User language:', userLanguage);

        // Build the confirmation URL
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lqani.ma';
        const confirmUrl = `${baseUrl}/api/auth/confirm-email-change?token=${token}&user_id=${userId}`;

        console.log('[RequestEmailChange] Sending email to:', newEmail);
        console.log('[RequestEmailChange] Confirm URL:', confirmUrl);

        // Use custom domain if configured, otherwise use Resend's default for testing
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

        // Get localized email template
        const emailTemplate = getEmailChangeTemplate(confirmUrl, userLanguage);

        // Send confirmation email to the NEW email only
        const { data: emailData, error: emailError } = await resend.emails.send({
            from: fromEmail,
            to: newEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
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
