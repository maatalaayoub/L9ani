"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Mic } from 'lucide-react';

export default function ChatInput({ onSend, disabled, placeholder, isRTL }) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);
    
    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    }, [message]);
    
    // Handle submit
    const handleSubmit = (e) => {
        e?.preventDefault();
        if (message.trim() && !disabled) {
            onSend(message.trim());
            setMessage('');
            // Reset textarea height
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
    
    return (
        <div className="p-3">
            <div className="flex items-end gap-2">
                {/* Text input */}
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={disabled}
                        rows={1}
                        className={`w-full px-4 py-2.5
                            bg-gray-100 dark:bg-gray-800 
                            border border-gray-300 dark:border-gray-700
                            focus:border-orange-500 focus:bg-white dark:focus:bg-gray-700
                            rounded-2xl resize-none
                            text-gray-800 dark:text-gray-200
                            placeholder-gray-500 dark:placeholder-gray-400
                            focus:outline-none focus:ring-2 focus:ring-orange-500/20
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200 text-sm leading-relaxed
                            ${isRTL ? 'text-right' : 'text-left'}`}
                        style={{ 
                            minHeight: '44px',
                            maxHeight: '120px',
                            direction: isRTL ? 'rtl' : 'ltr'
                        }}
                    />
                </div>
                
                {/* Send button */}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={disabled || !message.trim()}
                    className={`flex-shrink-0 w-11 h-11 rounded-full 
                        flex items-center justify-center
                        transition-all duration-200
                        ${message.trim() && !disabled
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                    aria-label={isRTL ? 'إرسال الرسالة' : 'Send message'}
                >
                    <Send className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
            </div>
            
            {/* Helper text */}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                {isRTL 
                    ? 'اضغط Enter للإرسال • Shift+Enter لسطر جديد'
                    : 'Enter to send • Shift+Enter for new line'}
            </p>
        </div>
    );
}
