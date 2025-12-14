import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

        // Check if profile already exists
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('auth_user_id', userId)
            .maybeSingle();

        if (existingProfile) {
            return NextResponse.json({ profile: existingProfile });
        }

        // Generate unique username if not provided
        const finalUsername = username || `${email.split('@')[0]}${Math.floor(1000 + Math.random() * 9000)}`;

        // Generate verification code for email signup users
        const verificationCode = isEmailSignup ? Math.floor(100000 + Math.random() * 900000).toString() : null;

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
            phone: phone || null,
            email_verified: false,
            email_verified_code: verificationCode
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

        return NextResponse.json({ profile: createdProfile }, { status: 201 });
    } catch (err) {
        console.error('[API Profile] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
