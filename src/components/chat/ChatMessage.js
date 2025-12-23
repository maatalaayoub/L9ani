"use client";

import { memo } from 'react';
import { Bot, User } from 'lucide-react';

/**
 * Single chat message component
 * Handles both old format (role) and new format (type)
 */
function ChatMessage({ message, isRTL, onResultClick, onNavigate, onAction }) {
    // Support both old (role) and new (type) message formats
    const { 
        type,
        role,
        content, 
        quickReplies, 
        results, 
        action, 
        progress, 
        isError, 
        timestamp,
        prefillData,
        navigateTo
    } = message;
    
    // Determine if this is a user message
    const isUser = type === 'user' || role === 'user';
    const isBot = type === 'bot' || role === 'assistant' || role === 'bot';
    
    // Format time
    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    }) : '';
    
    return (
        <div className={`flex items-start gap-2 ${isUser ? (isRTL ? 'flex-row' : 'flex-row-reverse') : (isRTL ? 'flex-row-reverse' : 'flex-row')}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                ${isUser 
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20' 
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
            </div>
            
            {/* Message bubble */}
            <div
                className={`max-w-[80%] ${
                    isUser
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-md shadow-blue-500/20'
                        : isError
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-2xl rounded-tl-sm border border-red-200 dark:border-red-800'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm shadow-sm border border-gray-200 dark:border-gray-700'
                } px-4 py-3`}
            >
                {/* Progress indicator for report creation */}
                {progress && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {progress}
                    </div>
                )}
                
                {/* Message content with markdown-like formatting */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {formatContent(content)}
                </div>
                
                {/* Search results */}
                {results && results.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {results.map((result) => (
                            <SearchResultCard
                                key={result.id}
                                result={result}
                                onClick={() => onResultClick?.(result)}
                            />
                        ))}
                    </div>
                )}
                
                {/* Navigation button from message (only if no action with route) */}
                {navigateTo && !action?.route && (
                    <button
                        onClick={() => onNavigate?.(navigateTo, prefillData)}
                        className="mt-3 w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 
                            text-white text-sm font-medium rounded-lg transition-all shadow-md shadow-blue-500/20
                            flex items-center justify-center gap-2"
                    >
                        {isRTL ? (
                            <>
                                <span>← الذهاب للنموذج</span>
                            </>
                        ) : (
                            <>
                                <span>Go to Form</span>
                                <span>→</span>
                            </>
                        )}
                    </button>
                )}
                
                {/* Navigation action button with prefill data */}
                {action?.type === 'navigate_with_data' && action.route && (
                    <button
                        onClick={() => onNavigate?.(action.route, action.params || action.data)}
                        className="mt-3 w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 
                            text-white text-sm font-medium rounded-lg transition-all shadow-md shadow-blue-500/20
                            flex items-center justify-center gap-2"
                    >
                        {isRTL ? '← الذهاب للنموذج' : 'Go to Form →'}
                    </button>
                )}
                
                {action?.type === 'navigate' && action.route && (
                    <button
                        onClick={() => onNavigate?.(action.route)}
                        className="mt-3 w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 
                            hover:bg-gray-200 dark:hover:bg-gray-600
                            text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
                    >
                        {isRTL ? 'عرض المزيد' : 'View More'}
                    </button>
                )}
                
                {/* Timestamp */}
                <div className={`text-xs mt-2 opacity-70 ${isUser ? 'text-white/70' : 'text-gray-400'}`}>
                    {timeStr}
                </div>
            </div>
        </div>
    );
}

/**
 * Format message content with basic markdown support
 */
function formatContent(content) {
    if (!content) return null;
    
    // Split by newlines and process each line
    const lines = content.split('\n');
    
    return lines.map((line, index) => {
        // Bold text: **text**
        let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Bullet points
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
            return (
                <div key={index} className="flex items-start gap-2 my-1">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span dangerouslySetInnerHTML={{ __html: processedLine.replace(/^[•-]\s*/, '') }} />
                </div>
            );
        }
        
        // Regular line
        return (
            <span key={index}>
                <span dangerouslySetInnerHTML={{ __html: processedLine }} />
                {index < lines.length - 1 && <br />}
            </span>
        );
    });
}

/**
 * Search result card component
 */
function SearchResultCard({ result, onClick }) {
    return (
        <button
            onClick={onClick}
            className="w-full p-3 bg-gray-50 dark:bg-gray-600 rounded-lg 
                hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors
                text-left flex items-start gap-3"
        >
            {/* Thumbnail */}
            {result.thumbnail ? (
                <img
                    src={result.thumbnail}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
            ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-500 
                    flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📋</span>
                </div>
            )}
            
            {/* Info */}
            <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                    {result.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    📍 {result.location} • {result.date}
                </p>
                {result.relevanceScore > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                        <div className="h-1.5 w-16 bg-gray-200 dark:bg-gray-500 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${Math.min(result.relevanceScore * 2, 100)}%` }}
                            />
                        </div>
                        <span className="text-xs text-gray-400">match</span>
                    </div>
                )}
            </div>
            
            {/* Arrow */}
            <span className="text-gray-400 flex-shrink-0">→</span>
        </button>
    );
}

export default memo(ChatMessage);
