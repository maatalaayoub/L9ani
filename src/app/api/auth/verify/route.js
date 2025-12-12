
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, code } = body;

        // Diagnostic checks
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        const checks = {
            hasUrl: !!url,
            urlProtocol: url.startsWith('https://') ? 'https' : (url.startsWith('http://') ? 'http' : 'missing'),
            hasKey: !!key,
            keyLength: key.length,
            keyLooksLikeJWT: key.split('.').length === 3
        };

        console.log("Verify API Debug:", checks);

        if (!userId || !code) {
            return NextResponse.json(
                { error: 'Missing user ID or verification code' },
                { status: 400 }
            );
        }

        if (!supabaseAdmin) {
            console.error("Verify API Critical: supabaseAdmin client is NULL");
            return NextResponse.json(
                { error: `Server misconfiguration: Database client not initialized. Checks: URL=${checks.urlProtocol}, KeyJWT=${checks.keyLooksLikeJWT}` },
                { status: 500 }
            );
        }

        // Fetch current profile to check code
        let profile, fetchError;
        try {
            const result = await supabaseAdmin
                .from('profiles')
                .select('email_verified_code, email_verified')
                .eq('auth_user_id', userId)
                .single();
            profile = result.data;
            fetchError = result.error;
        } catch (err) {
            console.error('Verify API - Supabase fetch exception:', err);
            console.error('Error name:', err.name);
            console.error('Error message:', err.message);
            console.error('Error cause:', err.cause);
            fetchError = err;
        }

        if (fetchError || !profile) {
            console.error('Verify API - Profile Fetch Error:', fetchError);

            const diagMsg = `Checks: URL=${checks.urlProtocol}, KeyJWT=${checks.keyLooksLikeJWT}`;

            return NextResponse.json(
                { error: `Connection failed: ${fetchError?.message || 'No profile'}. ${diagMsg}` },
                { status: 404 }
            );
        }

        if (profile.email_verified) {
            return NextResponse.json(
                { message: 'Email already verified' },
                { status: 200 }
            );
        }

        if (profile.email_verified_code !== code) {
            return NextResponse.json(
                { error: 'Invalid verification code' },
                { status: 400 }
            );
        }

        // Code matches, update status
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                email_verified: true,
                email_verified_code: null
            })
            .eq('auth_user_id', userId);

        if (updateError) {
            return NextResponse.json(
                { error: 'Failed to update verification status' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: 'Email verified successfully' },
            { status: 200 }
        );

    } catch (err) {
        console.error('Verify route error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
