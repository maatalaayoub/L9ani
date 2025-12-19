import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/chat/quick-replies
 * Get quick reply suggestions based on context
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const intent = searchParams.get('intent');
        const language = searchParams.get('language') || 'en';
        
        if (!supabaseAdmin) {
            // Return default quick replies if database not configured
            return NextResponse.json({
                success: true,
                quickReplies: getDefaultQuickReplies(intent, language)
            });
        }
        
        // Build query
        let query = supabaseAdmin
            .from('chat_quick_replies')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });
        
        if (intent) {
            query = query.eq('trigger_intent', intent);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('[Chat Quick Replies] Error:', error);
            return NextResponse.json({
                success: true,
                quickReplies: getDefaultQuickReplies(intent, language)
            });
        }
        
        // Format replies for the requested language
        const quickReplies = data.map(reply => ({
            id: reply.id,
            text: language === 'ar' ? reply.text_ar : 
                  language === 'darija' && reply.text_darija ? reply.text_darija : 
                  reply.text_en,
            action: reply.action_type,
            data: reply.action_data
        }));
        
        return NextResponse.json({
            success: true,
            quickReplies
        });
        
    } catch (error) {
        console.error('[Chat Quick Replies] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Get default quick replies when database is not available
 */
function getDefaultQuickReplies(intent, language) {
    const defaults = {
        greeting: [
            {
                text: { en: 'Report missing', ar: 'الإبلاغ عن مفقود', darija: 'بلغ على ضايع' },
                action: 'navigate',
                data: { route: '/report-missing' }
            },
            {
                text: { en: 'Search reports', ar: 'البحث', darija: 'قلب' },
                action: 'start_search',
                data: {}
            },
            {
                text: { en: 'Help', ar: 'مساعدة', darija: 'عاوني' },
                action: 'show_help',
                data: {}
            }
        ],
        create_report: [
            {
                text: { en: 'Person', ar: 'شخص', darija: 'واحد' },
                action: 'select_type',
                data: { type: 'person' }
            },
            {
                text: { en: 'Pet', ar: 'حيوان', darija: 'حيوان' },
                action: 'select_type',
                data: { type: 'pet' }
            },
            {
                text: { en: 'Document', ar: 'وثيقة', darija: 'ورقة' },
                action: 'select_type',
                data: { type: 'document' }
            },
            {
                text: { en: 'Other', ar: 'آخر', darija: 'حاجة خرا' },
                action: 'select_type',
                data: { type: 'other' }
            }
        ],
        search_reports: [
            {
                text: { en: 'All types', ar: 'الكل', darija: 'كلشي' },
                action: 'search',
                data: {}
            },
            {
                text: { en: 'Persons only', ar: 'أشخاص فقط', darija: 'غير الناس' },
                action: 'search',
                data: { type: 'person' }
            },
            {
                text: { en: 'Near me', ar: 'بالقرب مني', darija: 'قريب مني' },
                action: 'search_nearby',
                data: {}
            }
        ]
    };
    
    const replies = defaults[intent] || defaults.greeting;
    
    return replies.map(reply => ({
        text: reply.text[language] || reply.text.en,
        action: reply.action,
        data: reply.data
    }));
}
