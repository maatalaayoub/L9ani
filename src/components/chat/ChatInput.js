"use client";

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function ChatInput({ onSend, disabled, placeholder, isRTL }) {
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef(null);
    
    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
        }
    }, [message]);
    
    // Handle submit
    const handleSubmit = (e) => {
        e?.preventDefault();
        if (message.trim() && !disabled) {
            onSend(message.trim());
            setMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };
    
    // Handle key press
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };
    
    const hasText = message.trim().length > 0;
    
    return (
        <div className="p-3 bg-gradient-to-t from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            {/* Input Container */}
            <div className={`relative flex items-end gap-2 p-1.5 
                bg-white dark:bg-gray-800 
                rounded-2xl
                border-2 transition-all duration-300
                ${isFocused 
                    ? 'border-orange-400 dark:border-orange-500 shadow-lg shadow-orange-100 dark:shadow-orange-900/20' 
                    : 'border-gray-200 dark:border-gray-700 shadow-sm'
                }`}>
                
                {/* Text input */}
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        disabled={disabled}
                        rows={1}
                        className={`w-full px-3 py-2
                            bg-transparent
                            border-0
                            resize-none
                            text-gray-800 dark:text-gray-200
                            placeholder-gray-400 dark:placeholder-gray-500
                            focus:outline-none
                            disabled:opacity-50 disabled:cursor-not-allowed
                            text-sm leading-relaxed
                            ${isRTL ? 'text-right' : 'text-left'}`}
                        style={{ 
                            minHeight: '36px',
                            maxHeight: '100px',
                            direction: isRTL ? 'rtl' : 'ltr'
                        }}
                    />
                </div>
                
                {/* Send button */}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={disabled || !hasText}
                    className={`flex-shrink-0 w-9 h-9 rounded-xl 
                        flex items-center justify-center
                        transition-all duration-300
                        ${hasText && !disabled
                            ? 'bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30 hover:shadow-lg transform hover:scale-105 active:scale-95'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        }`}
                    aria-label={isRTL ? 'إرسال' : 'Send'}
                >
                    <Send className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''} 
                        ${hasText ? 'animate-pulse' : ''}`} />
                </button>
            </div>
        </div>
    );
}
