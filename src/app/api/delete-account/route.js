import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
        }

        // Initialize Supabase with Service Role Key for admin privileges
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Delete the user from authentication (This should cascade to profiles if set up, or we do it manually)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            console.error('Supabase Admin Delete Error:', error);
            throw error;
        }

        return NextResponse.json({ message: 'Account deleted successfully' });

    } catch (error) {
        console.error('Delete Account API Error:', error);
        return NextResponse.json(
            { message: 'Error deleting account' },
            { status: 500 }
        );
    }
}
