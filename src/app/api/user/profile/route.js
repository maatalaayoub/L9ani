import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('auth_user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[API Profile] Error fetching profile:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ profile: data || null });
    } catch (err) {
        console.error('[API Profile] Exception:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, email, firstName, lastName, username, avatarUrl } = body;

        if (!userId || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if profile already exists
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('auth_user_id', userId)
            .single();

        if (existingProfile) {
            return NextResponse.json({ profile: existingProfile });
        }

        // Generate unique username if not provided
        const finalUsername = username || `${email.split('@')[0]}${Math.floor(1000 + Math.random() * 9000)}`;

        // Create new profile
        const newProfile = {
            auth_user_id: userId,
            email: email,
            first_name: firstName || '',
            last_name: lastName || '',
            username: finalUsername,
            avatar_url: avatarUrl || null,
            created_at: new Date().toISOString(),
            has_password: false,
            terms_accepted: false  // OAuth users need to accept terms
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
