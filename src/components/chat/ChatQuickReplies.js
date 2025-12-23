"use client";

import { memo } from 'react';
import { 
    FileText, 
    Eye, 
    Search, 
    Phone, 
    Info, 
    Home,
    User,
    Settings,
    Lock,
    FileQuestion,
    ArrowRight
} from 'lucide-react';

/**
 * Quick reply buttons component - Clean pill/chip style
 */
function ChatQuickReplies({ replies, onSelect, isRTL }) {
    if (!replies || replies.length === 0) return null;
    
    // Get icon based on reply route or text
    const getIcon = (reply) => {
        const text = (reply.text || '').toLowerCase();
        const route = reply.route || '';
        
        if (route.includes('report-missing') || text.includes('missing') || text.includes('ضايع') || text.includes('مفقود')) {
            return <FileText className="w-3.5 h-3.5" />;
        }
        if (route.includes('report-sighting') || text.includes('sighting') || text.includes('لقية') || text.includes('مشاهدة')) {
            return <Eye className="w-3.5 h-3.5" />;
        }
        if (route === '/' || text.includes('search') || text.includes('قلب') || text.includes('بحث')) {
            return <Search className="w-3.5 h-3.5" />;
        }
        if (route.includes('contact') || text.includes('contact') || text.includes('تواصل')) {
            return <Phone className="w-3.5 h-3.5" />;
        }
        if (route.includes('about') || text.includes('about') || text.includes('عنا') || text.includes('علينا')) {
            return <Info className="w-3.5 h-3.5" />;
        }
        if (route.includes('my-report') || text.includes('my report') || text.includes('بلاغاتي')) {
            return <FileQuestion className="w-3.5 h-3.5" />;
        }
        if (route.includes('profile') || text.includes('profile') || text.includes('حساب') || text.includes('ملف')) {
            return <User className="w-3.5 h-3.5" />;
        }
        if (route.includes('settings') || text.includes('settings') || text.includes('إعدادات')) {
            return <Settings className="w-3.5 h-3.5" />;
        }
        if (route.includes('privacy') || text.includes('privacy') || text.includes('خصوصية')) {
            return <Lock className="w-3.5 h-3.5" />;
        }
        if (text.includes('home') || text.includes('رئيسية')) {
            return <Home className="w-3.5 h-3.5" />;
        }
        
        return <ArrowRight className="w-3.5 h-3.5" />;
    };
    
    // Get color scheme based on reply type
    const getColorScheme = (reply) => {
        const text = (reply.text || '').toLowerCase();
        const route = reply.route || '';
        
        // Report Missing - Blue
        if (route.includes('report-missing') || text.includes('missing') || text.includes('ضايع') || text.includes('مفقود')) {
            return 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50';
        }
        // Report Sighting - Teal
        if (route.includes('report-sighting') || text.includes('sighting') || text.includes('لقية') || text.includes('مشاهدة')) {
            return 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50';
        }
        // Search - Blue
        if (route === '/' || text.includes('search') || text.includes('قلب') || text.includes('بحث') || text.includes('home') || text.includes('رئيسية')) {
            return 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50';
        }
        // Contact - Purple
        if (route.includes('contact') || text.includes('contact') || text.includes('تواصل')) {
            return 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50';
        }
        
        // Default - Gray
        return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700';
    };
    
    // Remove emoji from text for cleaner look (icon replaces it)
    const cleanText = (text) => {
        return text?.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|📝|👁️|🔍|📞|ℹ️|📋|👤|⚙️|🔒|🏠/gu, '').trim();
    };
    
    return (
        <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
            {replies.map((reply, index) => (
                <button
                    key={`${reply.text || reply.value}-${index}`}
                    onClick={() => onSelect(reply)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5
                        text-xs font-medium
                        rounded-full border
                        transition-all duration-200
                        hover:scale-105 active:scale-95
                        ${getColorScheme(reply)}
                        ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                    {getIcon(reply)}
                    <span>{cleanText(reply.text || reply.value)}</span>
                </button>
            ))}
        </div>
    );
}

export default memo(ChatQuickReplies);
