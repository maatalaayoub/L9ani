import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Validation
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Verify the password by attempting to sign in
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        });

        const { error: signInError } = await tempClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (signInError) {
            console.log('[VerifyPassword] Password verification failed:', signInError.message);
            return NextResponse.json(
                { valid: false, error: 'Incorrect password' },
                { status: 401 }
            );
        }

        console.log('[VerifyPassword] Password verified successfully for:', email);
        return NextResponse.json({ valid: true });

    } catch (err) {
        console.error('[VerifyPassword] Unexpected error:', err);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
