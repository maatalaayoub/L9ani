"use client";

import { memo } from 'react';

/**
 * Quick reply buttons component
 * Handles different reply types: action, navigateTo, value, text
 */
function ChatQuickReplies({ replies, onSelect, isRTL }) {
    if (!replies || replies.length === 0) return null;
    
    // Get appropriate icon or emoji for the reply
    const getReplyStyle = (reply) => {
        // Check if it's a cancel/negative action
        const isCancelAction = reply.action === 'cancel' || 
            reply.text?.toLowerCase().includes('cancel') ||
            reply.text?.includes('إلغاء') ||
            reply.text?.toLowerCase().includes('no') ||
            reply.text?.includes('لا');
        
        if (isCancelAction) {
            return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40';
        }
        
        // Default style - orange color with good contrast
        return 'bg-orange-50 dark:bg-gray-700 text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30';
    };
    
    return (
        <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
            {replies.map((reply, index) => (
                <button
                    key={`${reply.text || reply.value}-${index}`}
                    onClick={() => onSelect(reply)}
                    className={`px-4 py-2 text-sm font-semibold
                        rounded-full
                        transition-all duration-200
                        whitespace-nowrap
                        shadow-md hover:shadow-lg
                        transform hover:scale-105 active:scale-95
                        ${getReplyStyle(reply)}`}
                >
                    {reply.text || reply.value}
                </button>
            ))}
        </div>
    );
}

export default memo(ChatQuickReplies);
