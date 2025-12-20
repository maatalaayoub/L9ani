'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatQuickReplies from './ChatQuickReplies';
import { 
  MessageCircle, 
  X, 
  Minimize2, 
  Maximize2, 
  Trash2,
  RotateCcw,
  Send,
  Bot,
  User
} from 'lucide-react';

export default function ChatWidget() {
  const locale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  
  // Storage key for conversation persistence
  const STORAGE_KEY = 'l9ani_chat_history';
  
  // Chat state
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [conversationContext, setConversationContext] = useState({}); // Track conversation flow context
  
  // Refs
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  
  // Load conversation from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { messages: savedMessages, quickReplies: savedReplies, context: savedContext } = JSON.parse(saved);
        if (savedMessages && savedMessages.length > 0) {
          setMessages(savedMessages);
          setQuickReplies(savedReplies || []);
          setConversationContext(savedContext || {});
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }, []);
  
  // Save conversation to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          messages,
          quickReplies,
          context: conversationContext,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Error saving chat history:', error);
      }
    }
  }, [messages, quickReplies, conversationContext]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isOpen && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);
  
  // Mark messages as read when chat is opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setHasUnreadMessages(false);
    }
  }, [isOpen, isMinimized]);

  // Send message to API
  const sendMessage = useCallback(async (text, isUserMessage = true) => {
    if (!text.trim()) return;
    
    // Add user message to local state
    let updatedMessages = messages;
    if (isUserMessage) {
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: text,
        timestamp: new Date().toISOString()
      };
      updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
    }
    
    setIsLoading(true);
    setQuickReplies([]);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          // Send conversation history for ChatGPT context (client-side only)
          conversationHistory: updatedMessages.slice(-6)
        })
      });
      
      const data = await response.json();
      
      // Log API response for debugging
      console.log('[ChatWidget] API response:', { success: data.success, hasError: !!data.error, hasResponse: !!data.response });
      
      // Check for HTTP errors (not API-level errors which include fallback responses)
      if (!response.ok && !data.response) {
        throw new Error(data.error || 'API request failed');
      }
      
      // Extract response content
      // API returns: { response: { text: "...", quickReplies: [...] } }
      // Or sometimes: { response: "..." }
      const responseContent = typeof data.response === 'object' 
        ? data.response 
        : { text: data.response };
      
      const messageText = responseContent.text || data.response;
      const responseQuickReplies = responseContent.quickReplies || data.quickReplies || [];
      const responseAction = responseContent.action || data.action;
      
      // Add bot response
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: messageText,
        timestamp: new Date().toISOString(),
        action: responseAction,
        // Store complete params for navigation (includes type and prefill data)
        prefillData: responseAction?.params || data.prefillData,
        navigateTo: responseAction?.route || data.navigateTo,
        progress: responseContent.progress
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Set quick replies if available
      if (responseQuickReplies.length > 0) {
        setQuickReplies(responseQuickReplies);
      }
      
      // Handle unread indicator when minimized
      if (isMinimized || !isOpen) {
        setHasUnreadMessages(true);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: locale === 'ar' 
          ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
          : 'Sorry, an error occurred. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [locale, isMinimized, isOpen, messages]);
  
  // Handle navigation - defined first since other handlers depend on it
  const handleNavigate = useCallback((path, prefillData = null) => {
    // Store prefill data if available - use the key that report-missing page expects
    if (prefillData) {
      // Structure the data as expected by report-missing page
      // prefillData can be { type, prefill } or { type, data } from different sources
      const dataToStore = {
        type: prefillData.type || prefillData.reportType,
        data: prefillData.prefill || prefillData.data || prefillData
      };
      console.log('[ChatWidget] Storing prefill data:', dataToStore);
      sessionStorage.setItem('reportPrefill', JSON.stringify(dataToStore));
    }
    
    // Navigate to the page
    const fullPath = path.startsWith('/') ? `/${locale}${path}` : path;
    router.push(fullPath);
    
    // Optionally close or minimize chat after navigation
    setIsMinimized(true);
  }, [locale, router]);
  
  // Clear conversation - defined before handleAction since it depends on it
  const clearConversation = useCallback(() => {
    // Clear from localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
    
    // Clear messages, context, and reset
    setMessages([]);
    setQuickReplies([]);
    setConversationContext({}); // Reset conversation context
    
    // Send greeting to get fresh response from chatbot
    setTimeout(() => {
      sendMessage(locale === 'ar' ? 'مرحبا' : 'Hello', false);
    }, 100);
  }, [locale, sendMessage]);
  
  // Handle actions from quick replies or bot responses
  const handleAction = useCallback((action, data) => {
    switch (action) {
      case 'report_missing':
      case 'create_report':
        // Check if data has reportType to determine which form
        if (data?.reportType === 'sighting') {
          handleNavigate('/report-sighting', data);
        } else {
          handleNavigate('/report-missing', data);
        }
        break;
      case 'report_sighting':
        handleNavigate('/report-sighting', data);
        break;
      case 'search_reports':
        // For search, send a message to start search flow
        sendMessage(locale === 'ar' ? 'أريد البحث' : 'I want to search');
        break;
      case 'view_my_reports':
        handleNavigate('/my-report');
        break;
      case 'go_home':
        handleNavigate('/');
        break;
      case 'contact_support':
        handleNavigate('/contact');
        break;
      case 'view_about':
        handleNavigate('/about');
        break;
      case 'view_privacy':
        handleNavigate('/privacy');
        break;
      case 'view_settings':
        handleNavigate('/settings');
        break;
      case 'view_profile':
        handleNavigate('/profile');
        break;
      case 'clear_chat':
        clearConversation();
        break;
      case 'cancel':
        // Send cancel message
        sendMessage(locale === 'ar' ? 'إلغاء' : 'cancel');
        break;
      case 'platform_help':
        // Send help request
        sendMessage(locale === 'ar' ? 'مساعدة' : 'help');
        break;
      case 'navigate':
        // Direct navigation action
        if (data?.route) {
          handleNavigate(data.route, data.prefillData);
        }
        break;
      default:
        console.log('Unknown action:', action);
        // Try sending the action as a message if it looks like a command
        if (typeof action === 'string' && action.length < 50) {
          sendMessage(action);
        } else if (data?.message) {
          sendMessage(data.message);
        }
    }
  }, [locale, sendMessage, handleNavigate, clearConversation]);
  
  // Handle quick reply selection
  const handleQuickReply = useCallback((reply) => {
    console.log('[ChatWidget] Quick reply clicked:', reply);
    
    // Handle 'navigate' action type (from new guidance chatbot)
    if (reply.action === 'navigate' && reply.route) {
      handleNavigate(reply.route, reply.data);
      return;
    }
    
    // Handle 'explain' action type (for how_it_works)
    if (reply.action === 'explain') {
      sendMessage(reply.text || (locale === 'ar' ? 'كيف يعمل الموقع' : 'How does it work'));
      return;
    }
    
    // Check if it's an action or navigation
    if (reply.action) {
      handleAction(reply.action, reply.data);
    } else if (reply.navigateTo) {
      handleNavigate(reply.navigateTo, reply.prefillData);
    } else if (reply.value) {
      // Send the value as a message
      sendMessage(reply.value);
    } else if (reply.text) {
      // Send the text as a message
      sendMessage(reply.text);
    }
  }, [handleAction, handleNavigate, sendMessage, locale]);
  
  // Toggle chat open/close
  const toggleChat = useCallback(() => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
      setHasUnreadMessages(false);
      
      // Send initial greeting if no messages
      if (messages.length === 0) {
        // Send a greeting message to get the proper response from the guidance chatbot
        sendMessage(locale === 'ar' ? 'مرحبا' : 'Hello', false).then(() => {
          // The chatbot will respond with proper greeting and quick replies
        });
      }
    } else {
      setIsOpen(false);
      setIsMinimized(false);
    }
  }, [isOpen, messages.length, locale, sendMessage]);
  
  // Minimize chat
  const minimizeChat = useCallback(() => {
    setIsMinimized(true);
  }, []);
  
  // Maximize chat (restore from minimized)
  const maximizeChat = useCallback(() => {
    setIsMinimized(false);
    setHasUnreadMessages(false);
  }, []);
  
  // Close chat completely
  const closeChat = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);
  
  const isRTL = locale === 'ar';
  
  return (
    <>
      {/* Floating Action Button - Always visible when chat is closed */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className={`fixed ${isRTL ? 'left-4' : 'right-4'} z-[100] 
            w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-orange-600
            text-white shadow-lg hover:shadow-xl 
            transform hover:scale-110 transition-all duration-300 ease-in-out
            flex items-center justify-center group
            bottom-20 md:bottom-6`}
          aria-label={locale === 'ar' ? 'فتح المساعد الذكي' : 'Open Smart Assistant'}
        >
          <MessageCircle className="w-6 h-6" />
          {hasUnreadMessages && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full 
              animate-pulse flex items-center justify-center">
              <span className="text-xs text-white font-bold">!</span>
            </span>
          )}
          {/* Tooltip */}
          <span className={`absolute ${isRTL ? 'right-full mr-3' : 'left-full ml-3'} 
            whitespace-nowrap bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg
            opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}>
            {locale === 'ar' ? 'المساعد الذكي' : 'Smart Assistant'}
          </span>
        </button>
      )}
      
      {/* Minimized Chat - Shows as a bar */}
      {isOpen && isMinimized && (
        <div
          className={`fixed ${isRTL ? 'left-4' : 'right-4'} z-[100]
            bg-white dark:bg-gray-800 rounded-full shadow-lg
            flex items-center gap-2 px-4 py-2 cursor-pointer
            hover:shadow-xl transition-all duration-300
            border border-gray-200 dark:border-gray-700
            bottom-20 md:bottom-6`}
          onClick={maximizeChat}
        >
          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {locale === 'ar' ? 'المساعد الذكي' : 'Smart Assistant'}
          </span>
          {hasUnreadMessages && (
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeChat();
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}
      
      {/* Main Chat Window */}
      {isOpen && !isMinimized && (
        <div
          className={`fixed ${isRTL ? 'left-2 sm:left-4' : 'right-2 sm:right-4'} z-[100]
            w-[calc(100vw-16px)] sm:w-[380px] max-w-[400px] 
            h-[calc(100vh-160px)] sm:h-[600px] max-h-[calc(100vh-100px)]
            bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
            flex flex-col overflow-hidden
            border border-gray-200 dark:border-gray-700
            bottom-20 md:bottom-6`}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 
            bg-gradient-to-r from-orange-500 to-orange-600 text-white min-h-[60px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white">
                  {locale === 'ar' ? 'المساعد الذكي' : 'Smart Assistant'}
                </h3>
                <p className="text-xs text-white/80">
                  {locale === 'ar' ? 'متصل الآن' : 'Online now'}
                </p>
              </div>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-1">
              {/* Clear Conversation Button */}
              <button
                onClick={clearConversation}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                title={locale === 'ar' ? 'مسح المحادثة' : 'Clear Conversation'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              {/* Minimize Button */}
              <button
                onClick={minimizeChat}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                title={locale === 'ar' ? 'تصغير' : 'Minimize'}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              
              {/* Close Button */}
              <button
                onClick={closeChat}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                title={locale === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Messages Area */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50"
          >
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                isRTL={isRTL}
                onAction={handleAction}
                onNavigate={handleNavigate}
              />
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Quick Replies - Modern card style */}
          {quickReplies.length > 0 && !isLoading && (
            <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 
              bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-900
              backdrop-blur-sm">
              <ChatQuickReplies 
                replies={quickReplies} 
                onSelect={handleQuickReply}
                isRTL={isRTL}
              />
            </div>
          )}
          
          {/* Input Area - Modern floating style */}
          <div className="border-t border-gray-100 dark:border-gray-800">
            <ChatInput 
              onSend={sendMessage}
              disabled={isLoading}
              placeholder={locale === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
              isRTL={isRTL}
            />
          </div>
        </div>
      )}
    </>
  );
}
