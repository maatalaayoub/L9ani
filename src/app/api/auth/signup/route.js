
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

        // 5. Create User using Service Role Key
        if (!supabaseAdmin) {
            console.error('Supabase Service Role Key is missing on server');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

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

            // Generate 6-digit verification code
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

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
                email_verified_code: verificationCode
            }, { onConflict: 'auth_user_id' });

            // TODO: Send verificationCode to user's email via an email service (e.g. Resend, SendGrid)
            // For now, logging it for testing purposes
            console.log(`[TESTING] Verification code for ${email}: ${verificationCode}`);

            if (profileError) {
                console.error('Error creating/updating profile:', profileError);
                return NextResponse.json(
                    { error: 'Profile creation failed: ' + profileError.message },
                    { status: 500 }
                );
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
