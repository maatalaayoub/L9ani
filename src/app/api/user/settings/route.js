import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch user settings
export async function GET(request) {
    try {
        // Check if supabaseAdmin is available
        if (!supabaseAdmin) {
            console.error('supabaseAdmin is not initialized - check SUPABASE_SERVICE_ROLE_KEY');
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }

        // Check for userId query param (for password reset page - returns only language)
        const { searchParams } = new URL(request.url);
        const userIdParam = searchParams.get('userId');
        
        if (userIdParam) {
            // Public endpoint for fetching just the language by userId
            // This is used by the password reset page before user is authenticated
            console.log('[Settings] Fetching language for userId:', userIdParam);
            
            const { data: settings, error: fetchError } = await supabaseAdmin
                .from('user_settings')
                .select('language')
                .eq('user_id', userIdParam)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('[Settings] Error fetching language:', fetchError);
                return NextResponse.json({ language: 'en' });
            }

            return NextResponse.json({
                language: settings?.language || 'en',
            });
        }

        // Authenticated endpoint - requires Bearer token
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify the token and get user
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Fetch user settings
        const { data: settings, error: fetchError } = await supabaseAdmin
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 = no rows found, which is OK for new users
            console.error('Error fetching settings:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
        }

        // Return settings or defaults
        return NextResponse.json({
            theme: settings?.theme || 'system',
            language: settings?.language || 'en',
            sighting_alerts: settings?.sighting_alerts ?? true,
            new_device_login: settings?.new_device_login ?? true,
        });
    } catch (error) {
        console.error('Settings GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create or update user settings
export async function POST(request) {
    try {
        // Check if supabaseAdmin is available
        if (!supabaseAdmin) {
            console.error('supabaseAdmin is not initialized - check SUPABASE_SERVICE_ROLE_KEY');
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify the token and get user
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const body = await request.json();
        const { theme, language, sighting_alerts, new_device_login } = body;

        // Validate theme value
        if (theme && !['light', 'dark', 'system'].includes(theme)) {
            return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 });
        }

        // Validate language value
        if (language && !['en', 'ar'].includes(language)) {
            return NextResponse.json({ error: 'Invalid language value' }, { status: 400 });
        }

        // Build update object with only provided fields
        const updateData = { updated_at: new Date().toISOString() };
        if (theme !== undefined) updateData.theme = theme;
        if (language !== undefined) updateData.language = language;
        if (sighting_alerts !== undefined) updateData.sighting_alerts = sighting_alerts;
        if (new_device_login !== undefined) updateData.new_device_login = new_device_login;

        // Check if settings already exist for this user
        const { data: existingSettings } = await supabaseAdmin
            .from('user_settings')
            .select('user_id')
            .eq('user_id', user.id)
            .single();

        let settings;
        let error;

        if (existingSettings) {
            // Update existing settings
            const result = await supabaseAdmin
                .from('user_settings')
                .update(updateData)
                .eq('user_id', user.id)
                .select()
                .single();
            settings = result.data;
            error = result.error;
        } else {
            // Insert new settings with defaults
            const result = await supabaseAdmin
                .from('user_settings')
                .insert({
                    user_id: user.id,
                    theme: theme || 'system',
                    language: language || 'en',
                    sighting_alerts: sighting_alerts ?? true,
                    new_device_login: new_device_login ?? true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            settings = result.data;
            error = result.error;
        }

        if (error) {
            console.error('Error saving settings:', error);
            return NextResponse.json({ error: 'Failed to save settings', details: error.message }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Settings saved successfully',
            theme: settings.theme,
            language: settings.language,
            sighting_alerts: settings.sighting_alerts,
            new_device_login: settings.new_device_login
        });
    } catch (error) {
        console.error('Settings POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
