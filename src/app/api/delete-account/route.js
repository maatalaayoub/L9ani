import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
        }

        if (!supabaseAdmin) {
            console.error('[Delete Account] supabaseAdmin is not configured');
            return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
        }

        // First, delete related data to avoid foreign key issues
        console.log('[Delete Account] Deleting user data for userId:', userId);

        // Delete user settings
        const { error: settingsError } = await supabaseAdmin
            .from('user_settings')
            .delete()
            .eq('user_id', userId);
        
        if (settingsError) {
            console.error('[Delete Account] Error deleting user_settings:', settingsError);
        }

        // Delete notifications
        const { error: notificationsError } = await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('user_id', userId);
        
        if (notificationsError) {
            console.error('[Delete Account] Error deleting notifications:', notificationsError);
        }

        // Delete the profile from profiles table
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('auth_user_id', userId);

        if (profileError) {
            console.error('[Delete Account] Error deleting profile:', profileError);
            // Don't throw here - continue to delete auth user
        } else {
            console.log('[Delete Account] Profile deleted successfully');
        }

        // Delete the user from authentication
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
            console.error('[Delete Account] Supabase Admin Delete Error:', authError);
            throw authError;
        }

        console.log('[Delete Account] Auth user deleted successfully');

        return NextResponse.json({ message: 'Account deleted successfully' });

    } catch (error) {
        console.error('Delete Account API Error:', error);
        return NextResponse.json(
            { message: 'Error deleting account' },
            { status: 500 }
        );
    }
}
