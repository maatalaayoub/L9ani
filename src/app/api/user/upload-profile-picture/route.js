import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Upload Profile Picture] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const formData = await request.formData();
        const file = formData.get('file');
        const userId = formData.get('userId');

        if (!file || !userId) {
            return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ 
                error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' 
            }, { status: 400 });
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json({ 
                error: 'File too large. Maximum size is 5MB.' 
            }, { status: 400 });
        }

        // Get file extension from mime type
        const extMap = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif'
        };
        const ext = extMap[file.type] || 'jpg';

        // Create unique filename with timestamp to bust cache
        const timestamp = Date.now();
        const filePath = `${userId}/profile-${timestamp}.${ext}`;

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Delete any existing profile pictures for this user first
        const { data: existingFiles } = await supabaseAdmin.storage
            .from('profile-pictures')
            .list(userId);

        if (existingFiles && existingFiles.length > 0) {
            const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
            await supabaseAdmin.storage
                .from('profile-pictures')
                .remove(filesToDelete);
        }

        // Upload new file
        const { data, error: uploadError } = await supabaseAdmin.storage
            .from('profile-pictures')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) {
            console.error('[API Upload Profile Picture] Upload error:', uploadError);
            return NextResponse.json({ error: uploadError.message }, { status: 500 });
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // Update user profile with new avatar URL
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('auth_user_id', userId);

        if (updateError) {
            console.error('[API Upload Profile Picture] Profile update error:', updateError);
            return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }

        console.log('[API Upload Profile Picture] Success:', publicUrl);
        return NextResponse.json({ 
            success: true, 
            url: publicUrl 
        });

    } catch (err) {
        console.error('[API Upload Profile Picture] Exception:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        if (!supabaseAdmin) {
            console.error('[API Delete Profile Picture] supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // List and delete all profile pictures for this user
        const { data: existingFiles } = await supabaseAdmin.storage
            .from('profile-pictures')
            .list(userId);

        if (existingFiles && existingFiles.length > 0) {
            const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
            const { error: deleteError } = await supabaseAdmin.storage
                .from('profile-pictures')
                .remove(filesToDelete);

            if (deleteError) {
                console.error('[API Delete Profile Picture] Delete error:', deleteError);
                return NextResponse.json({ error: deleteError.message }, { status: 500 });
            }
        }

        // Clear avatar_url in profile (set to null or empty)
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ avatar_url: null })
            .eq('auth_user_id', userId);

        if (updateError) {
            console.error('[API Delete Profile Picture] Profile update error:', updateError);
            return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }

        console.log('[API Delete Profile Picture] Success for user:', userId);
        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('[API Delete Profile Picture] Exception:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
