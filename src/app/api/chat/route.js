import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { processMessage, detectLanguage, isCancelRequest } from '@/lib/chatbot/core';
import { parseSearchQuery, searchReports, formatSearchResults } from '@/lib/chatbot/search';
import { initReportSession, processReportAnswer, generateReportSummary, getProgressMessage } from '@/lib/chatbot/reportAssistant';

/**
 * POST /api/chat
 * Main chat endpoint for processing messages
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { message, sessionId, context = {} } = body;
        
        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }
        
        // Get user from auth header (optional - chat works for anonymous users too)
        let user = null;
        const authHeader = request.headers.get('authorization');
        
        if (authHeader && authHeader.startsWith('Bearer ') && supabaseAdmin) {
            const token = authHeader.split(' ')[1];
            const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(token);
            
            if (authUser) {
                // Fetch user profile
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('username, first_name, last_name')
                    .eq('id', authUser.id)
                    .single();
                
                user = {
                    id: authUser.id,
                    email: authUser.email,
                    username: profile?.username,
                    firstName: profile?.first_name,
                    lastName: profile?.last_name
                };
            }
        }
        
        // Get or create session
        let session = null;
        const userAgent = request.headers.get('user-agent');
        
        if (sessionId && supabaseAdmin) {
            const { data } = await supabaseAdmin
                .from('chat_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();
            session = data;
        }
        
        // Detect language from message
        const detectedLanguage = detectLanguage(message);
        
        // Check for cancel request FIRST - this should interrupt any flow
        if (isCancelRequest(message, detectedLanguage)) {
            const cancelResponse = getCancelResponse(detectedLanguage);
            
            if (session && supabaseAdmin) {
                await saveMessages(session.id, message, cancelResponse.text, {
                    intent: 'cancel',
                    language: detectedLanguage
                });
            }
            
            return NextResponse.json({
                success: true,
                response: cancelResponse,
                context: { mode: null }, // Reset context
                sessionId: session?.id,
                intent: 'cancel'
            });
        }
        
        // Check if we're in a multi-turn conversation (report creation)
        if (context.mode === 'report_creation' && context.reportContext) {
            const result = await handleReportCreation(message, context.reportContext, detectedLanguage, user);
            
            // Save message to database if we have a session
            if (session && supabaseAdmin) {
                await saveMessages(session.id, message, result.response.text, {
                    intent: 'create_report',
                    language: detectedLanguage
                });
            }
            
            return NextResponse.json({
                success: true,
                response: result.response,
                context: result.context,
                sessionId: session?.id
            });
        }
        
        // Check if this is a search query continuation
        if (context.mode === 'search' && context.searchContext) {
            const result = await handleSearchContinuation(message, context.searchContext, detectedLanguage);
            
            if (session && supabaseAdmin) {
                await saveMessages(session.id, message, result.response.text, {
                    intent: 'search_reports',
                    language: detectedLanguage
                });
            }
            
            return NextResponse.json({
                success: true,
                response: result.response,
                context: result.context,
                sessionId: session?.id
            });
        }
        
        // Process new message
        const processed = processMessage(message, context, user);
        
        // Create session if needed
        if (!session && supabaseAdmin) {
            const { data: newSession } = await supabaseAdmin
                .from('chat_sessions')
                .insert({
                    user_id: user?.id || null,
                    detected_language: detectedLanguage,
                    current_intent: processed.intent,
                    user_agent: userAgent
                })
                .select()
                .single();
            session = newSession;
        }
        
        // Handle different intents
        let response = processed.response;
        let newContext = { ...context };
        
        switch (processed.intent) {
            case 'create_report':
                // Check if we should start report creation flow
                if (processed.entities.reportType) {
                    const reportSession = initReportSession(processed.entities.reportType, detectedLanguage);
                    
                    if (!reportSession.error) {
                        response = {
                            text: reportSession.question,
                            quickReplies: [],
                            progress: getProgressMessage(reportSession.progress, detectedLanguage)
                        };
                        newContext = {
                            mode: 'report_creation',
                            reportContext: reportSession
                        };
                    }
                }
                break;
                
            case 'search_reports':
                // Execute search if we have enough info
                if (processed.entities.reportType || processed.entities.city || message.length > 10) {
                    const searchResult = await executeSearch(message, detectedLanguage);
                    response = searchResult.response;
                    newContext = {
                        mode: 'search',
                        searchContext: searchResult.context
                    };
                }
                break;
                
            case 'check_status':
                if (user) {
                    const statusResult = await getUserReportStatus(user.id, detectedLanguage);
                    response = statusResult;
                }
                break;
        }
        
        // Save messages
        if (session && supabaseAdmin) {
            await saveMessages(session.id, message, response.text, {
                intent: processed.intent,
                confidence: processed.confidence,
                language: detectedLanguage
            });
            
            // Update session
            await supabaseAdmin
                .from('chat_sessions')
                .update({
                    current_intent: processed.intent,
                    detected_language: detectedLanguage,
                    context_data: newContext
                })
                .eq('id', session.id);
        }
        
        return NextResponse.json({
            success: true,
            response,
            language: detectedLanguage,
            intent: processed.intent,
            confidence: processed.confidence,
            entities: processed.entities,
            context: newContext,
            sessionId: session?.id
        });
        
    } catch (error) {
        console.error('[Chat API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * Handle report creation flow
 */
async function handleReportCreation(message, reportContext, language, user) {
    // Handle special actions
    if (message === '__COMPLETE__' || message === '__SKIP_OPTIONAL__') {
        return {
            response: {
                text: {
                    en: "Perfect! I'll take you to the form now. Review the pre-filled information, add photos if you have them, and submit.",
                    ar: "ممتاز! سأنقلك إلى النموذج الآن. راجع المعلومات المعبأة، أضف صوراً إذا كانت لديك، وأرسل.",
                    darija: "مزيان! دابا غادي ناخدك للفورم. شوف المعلومات، زيد التصاور إلا عندك، وأرسل."
                }[language],
                action: {
                    type: 'navigate_with_data',
                    route: '/report-missing',
                    params: {
                        type: reportContext.reportType,
                        prefill: reportContext.collectedData
                    }
                }
            },
            context: { mode: null }
        };
    }
    
    // Process the answer
    const updatedContext = processReportAnswer(reportContext, message, language);
    
    // Generate response
    let responseText = updatedContext.question;
    
    if (updatedContext.progress) {
        responseText = getProgressMessage(updatedContext.progress, language) + '\n\n' + responseText;
    }
    
    return {
        response: {
            text: responseText,
            quickReplies: updatedContext.quickReplies || [],
            action: updatedContext.action
        },
        context: {
            mode: updatedContext.isComplete ? null : 'report_creation',
            reportContext: updatedContext.isComplete ? null : updatedContext
        }
    };
}

/**
 * Execute a search query
 */
async function executeSearch(query, language) {
    try {
        const params = parseSearchQuery(query);
        const results = await searchReports(params);
        const formatted = formatSearchResults(results, language);
        
        return {
            response: formatted,
            context: {
                lastQuery: query,
                lastParams: params,
                resultCount: results.totalCount
            }
        };
    } catch (error) {
        console.error('[Chat Search] Error:', error);
        return {
            response: {
                text: {
                    en: "Sorry, I had trouble searching. Please try again or browse reports directly.",
                    ar: "عذراً، واجهت مشكلة في البحث. يرجى المحاولة مرة أخرى أو تصفح البلاغات مباشرة.",
                    darija: "سمحلي، كاين شي مشكل فالبحث. عاود حاول ولا شوف البلاغات مباشرة."
                }[language],
                quickReplies: [
                    { text: language === 'ar' ? 'حاول مرة أخرى' : language === 'darija' ? 'عاود' : 'Try again', action: 'search_reports' }
                ]
            },
            context: {}
        };
    }
}

/**
 * Generate cancel response in appropriate language
 */
function getCancelResponse(language) {
    const responses = {
        en: {
            text: `No problem! I've cancelled the current operation. 🔄\n\nWhat would you like to do instead?\n\n• Report something missing\n• Search reports\n• Get help`,
            quickReplies: [
                { text: 'Report missing', action: 'create_report' },
                { text: 'Search reports', action: 'search_reports' },
                { text: 'Help', action: 'platform_help' }
            ]
        },
        ar: {
            text: `لا مشكلة! لقد ألغيت العملية الحالية. 🔄\n\nماذا تريد أن تفعل بدلاً من ذلك؟\n\n• الإبلاغ عن مفقود\n• البحث في البلاغات\n• الحصول على مساعدة`,
            quickReplies: [
                { text: 'إبلاغ عن مفقود', action: 'create_report' },
                { text: 'بحث', action: 'search_reports' },
                { text: 'مساعدة', action: 'platform_help' }
            ]
        },
        darija: {
            text: `ما كاين باس! كانسيليت اللي كنتي كدير. 🔄\n\nشنو بغيتي دير دابا؟\n\n• بلغ على شي حاجة ضايعة\n• قلب على البلاغات\n• عاوني`,
            quickReplies: [
                { text: 'بلغ', action: 'create_report' },
                { text: 'قلب', action: 'search_reports' },
                { text: 'عاوني', action: 'platform_help' }
            ]
        }
    };
    
    return responses[language] || responses.en;
}

/**
 * Handle search refinement
 */
async function handleSearchContinuation(message, searchContext, language) {
    // User might be refining their search
    const refinedQuery = `${searchContext.lastQuery} ${message}`;
    return executeSearch(refinedQuery, language);
}

/**
 * Get user's report status
 */
async function getUserReportStatus(userId, language) {
    if (!supabaseAdmin) {
        return {
            text: {
                en: "Sorry, I can't check reports right now. Please visit the My Reports page.",
                ar: "عذراً، لا أستطيع التحقق من البلاغات الآن. يرجى زيارة صفحة بلاغاتي.",
                darija: "سمحلي، ما نقدرش نشوف البلاغات دابا. سير لصفحة البلاغات ديالي."
            }[language]
        };
    }
    
    try {
        const { data: reports, error } = await supabaseAdmin
            .from('reports')
            .select('id, report_type, status, city, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        if (!reports || reports.length === 0) {
            return {
                text: {
                    en: "You don't have any reports yet. Would you like to create one?",
                    ar: "ليس لديك أي بلاغات حتى الآن. هل تريد إنشاء واحد؟",
                    darija: "ما عندكش شي بلاغ. بغيتي دير واحد؟"
                }[language],
                quickReplies: [
                    { text: language === 'ar' ? 'إنشاء بلاغ' : language === 'darija' ? 'دير بلاغ' : 'Create report', action: 'create_report' }
                ]
            };
        }
        
        const statusLabels = {
            pending: { en: '⏳ Pending review', ar: '⏳ قيد المراجعة', darija: '⏳ كيتراجع' },
            approved: { en: '✅ Approved', ar: '✅ تمت الموافقة', darija: '✅ مقبول' },
            rejected: { en: '❌ Rejected', ar: '❌ مرفوض', darija: '❌ مرفوض' },
            found: { en: '🎉 Found!', ar: '🎉 تم العثور!', darija: '🎉 تلقا!' },
            closed: { en: '📁 Closed', ar: '📁 مغلق', darija: '📁 مسدود' }
        };
        
        const typeLabels = {
            person: { en: 'Person', ar: 'شخص', darija: 'واحد' },
            pet: { en: 'Pet', ar: 'حيوان', darija: 'حيوان' },
            document: { en: 'Document', ar: 'وثيقة', darija: 'ورقة' },
            electronics: { en: 'Electronics', ar: 'إلكترونيات', darija: 'جهاز' },
            vehicle: { en: 'Vehicle', ar: 'مركبة', darija: 'طوموبيل' },
            other: { en: 'Item', ar: 'غرض', darija: 'حاجة' }
        };
        
        let responseText = {
            en: `📋 **Your Reports (${reports.length}):**\n\n`,
            ar: `📋 **بلاغاتك (${reports.length}):**\n\n`,
            darija: `📋 **البلاغات ديالك (${reports.length}):**\n\n`
        }[language];
        
        for (const report of reports) {
            const status = statusLabels[report.status]?.[language] || report.status;
            const type = typeLabels[report.report_type]?.[language] || report.report_type;
            const date = new Date(report.created_at).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'en-US');
            
            responseText += `• ${type} - ${report.city}\n  ${status} | ${date}\n\n`;
        }
        
        return {
            text: responseText,
            action: {
                type: 'navigate',
                route: '/my-report'
            },
            quickReplies: [
                { text: language === 'ar' ? 'عرض الكل' : language === 'darija' ? 'شوف كلشي' : 'View all', action: 'navigate', data: { route: '/my-report' } },
                { text: language === 'ar' ? 'بلاغ جديد' : language === 'darija' ? 'بلاغ جديد' : 'New report', action: 'create_report' }
            ]
        };
        
    } catch (error) {
        console.error('[Chat Status] Error:', error);
        return {
            text: {
                en: "Sorry, I had trouble fetching your reports. Please try the My Reports page.",
                ar: "عذراً، واجهت مشكلة في جلب بلاغاتك. يرجى تجربة صفحة بلاغاتي.",
                darija: "سمحلي، ما قدرتش نجيب البلاغات ديالك. جرب صفحة البلاغات ديالي."
            }[language]
        };
    }
}

/**
 * Save messages to database
 */
async function saveMessages(sessionId, userMessage, assistantMessage, metadata) {
    if (!supabaseAdmin) return;
    
    try {
        await supabaseAdmin.from('chat_messages').insert([
            {
                session_id: sessionId,
                role: 'user',
                content: userMessage,
                detected_intent: metadata.intent,
                intent_confidence: metadata.confidence,
                detected_language: metadata.language
            },
            {
                session_id: sessionId,
                role: 'assistant',
                content: assistantMessage,
                detected_language: metadata.language
            }
        ]);
    } catch (error) {
        console.error('[Chat] Error saving messages:', error);
    }
}
