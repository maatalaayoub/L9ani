
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        if (!supabase) {
            console.error('Supabase client is not initialized');
            return NextResponse.json(
                { error: 'Server configuration error: Supabase not initialized' },
                { status: 500 }
            );
        }

        // Sign in with password
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 401 }
            );
        }

        // Return the session/token
        return NextResponse.json(
            {
                session: data.session,
                user: data.user
            },
            { status: 200 }
        );

    } catch (err) {
        console.error('Login route error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
