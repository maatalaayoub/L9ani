"use client"

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Link } from "@/i18n/navigation";
import LoginDialog from "@/components/LoginDialog";

function formatRelativeTime(dateString, locale = 'en') {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return locale === 'ar' ? 'الآن' : 'Now';
    if (diffMins < 60) return locale === 'ar' ? `${diffMins}د` : `${diffMins}m`;
    if (diffHours < 24) return locale === 'ar' ? `${diffHours}س` : `${diffHours}h`;
    if (diffDays < 7) return locale === 'ar' ? `${diffDays}ي` : `${diffDays}d`;
    return date.toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'en-US', { month: 'short', day: 'numeric' });
}

function formatMessageTime(dateString, locale = 'en') {
    const date = new Date(dateString);
    return date.toLocaleTimeString(locale === 'ar' ? 'ar-MA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateString, locale = 'en') {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return locale === 'ar' ? 'اليوم' : 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return locale === 'ar' ? 'أمس' : 'Yesterday';
    }
    return date.toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'en-US', {
        weekday: 'long', month: 'short', day: 'numeric'
    });
}

export default function Messages() {
    const { user, profile, isAuthLoading } = useAuth();
    const t = useTranslations('messages');
    const { locale } = useLanguage();
    const isRTL = locale === 'ar';

    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [otherUser, setOtherUser] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMobileChat, setShowMobileChat] = useState(false);

    const messagesEndRef = useRef(null);
    const messageInputRef = useRef(null);
    const pollIntervalRef = useRef(null);

    const getToken = () => localStorage.getItem('supabase_token');

    const scrollToBottom = useCallback((instant = false) => {
        messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' });
    }, []);

    // Fetch conversations list
    const fetchConversations = useCallback(async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch('/api/messages', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations || []);
            }
        } catch (err) {
            console.error('Error fetching conversations:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch messages for a conversation
    const fetchMessages = useCallback(async (conversationId, { showLoading = true, markRead = true } = {}) => {
        const token = getToken();
        if (!token) return;

        if (showLoading) setMessagesLoading(true);
        try {
            const res = await fetch(`/api/messages/${conversationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const newMsgs = data.messages || [];
                setMessages(prev => {
                    if (prev.length !== newMsgs.length || (newMsgs.length > 0 && prev[prev.length - 1]?.id !== newMsgs[newMsgs.length - 1]?.id)) {
                        return newMsgs;
                    }
                    return prev;
                });
                setOtherUser(data.other_user || null);

                // Mark messages as read only on first open
                if (markRead) {
                    await fetch(`/api/messages/${conversationId}`, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setConversations(prev => prev.map(c =>
                        c.id === conversationId ? { ...c, unread_count: 0 } : c
                    ));
                }
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            if (showLoading) setMessagesLoading(false);
        }
    }, [scrollToBottom]);

    // Send a message
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending || !otherUser) return;
        if (!selectedConversation) return;

        const token = getToken();
        if (!token) return;

        setSending(true);
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipient_id: otherUser.id,
                    content: newMessage.trim()
                })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, data.message]);
                setNewMessage('');
                setTimeout(scrollToBottom, 100);

                // If this was a new conversation, update the selected conversation ID
                if (selectedConversation === 'new') {
                    const newConvId = data.conversation_id || data.message?.conversation_id;
                    if (newConvId) setSelectedConversation(newConvId);
                    fetchConversations();
                } else {
                    // Update conversation in list
                    setConversations(prev => {
                        const updated = prev.map(c =>
                            c.id === selectedConversation
                                ? { ...c, last_message: { content: data.message.content, sender_id: user.id, created_at: data.message.created_at }, last_message_at: data.message.created_at }
                                : c
                        );
                        return updated.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
                    });
                }
            } else {
                const data = await res.json();
                alert(data.error || t('sendError'));
            }
        } catch (err) {
            console.error('Error sending message:', err);
        } finally {
            setSending(false);
        }
    };

    // Select a conversation
    const openConversation = (conv) => {
        setSelectedConversation(conv.id);
        setOtherUser(conv.other_user);
        setShowMobileChat(true);
        fetchMessages(conv.id);
    };

    // Refresh current conversation
    const refreshMessages = async () => {
        if (refreshing) return;
        setRefreshing(true);
        await fetchConversations();
        if (selectedConversation && selectedConversation !== 'new') {
            await fetchMessages(selectedConversation, { showLoading: false, markRead: true });
        }
        setRefreshing(false);
    };

    // Go back to conversation list on mobile
    const goBack = () => {
        setShowMobileChat(false);
        setSelectedConversation(null);
        setMessages([]);
        setOtherUser(null);
        fetchConversations();
    };

    // Initial fetch
    useEffect(() => {
        if (user) {
            fetchConversations();
        }
    }, [user, fetchConversations]);

    // Lightweight polling - only check for new messages, no loading spinners
    useEffect(() => {
        if (!user) return;
        pollIntervalRef.current = setInterval(() => {
            fetchConversations();
            if (selectedConversation && selectedConversation !== 'new') {
                fetchMessages(selectedConversation, { showLoading: false, markRead: false });
            }
        }, 30000);
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [user, fetchConversations, fetchMessages, selectedConversation]);

    // Filter conversations by search
    const filteredConversations = conversations.filter(conv => {
        if (!searchQuery) return true;
        const name = conv.other_user?.first_name || conv.other_user?.username || '';
        const lastName = conv.other_user?.last_name || '';
        return `${name} ${lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Group messages by date
    const groupedMessages = messages.reduce((groups, msg) => {
        const date = new Date(msg.created_at).toDateString();
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {});

    const getUserDisplayName = (u) => {
        if (!u) return '?';
        if (u.first_name) return u.last_name ? `${u.first_name} ${u.last_name}` : u.first_name;
        return u.username || '?';
    };

    const getInitial = (u) => {
        if (!u) return '?';
        return (u.first_name?.[0] || u.username?.[0] || '?').toUpperCase();
    };

    // Not logged in state
    if (!isAuthLoading && !user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] transition-colors duration-300">
                <main className="max-w-4xl mx-auto p-6 pt-24 md:p-12 md:pt-28">
                    <div className="bg-white dark:bg-[#1e293b] rounded-[7px] border border-gray-300 dark:border-gray-700 p-12 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 dark:bg-blue-500/10 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t('loginRequired')}</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">{t('loginDescription')}</p>
                        <button
                            onClick={() => setIsLoginDialogOpen(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            {t('loginButton')}
                        </button>
                    </div>
                </main>
                <LoginDialog isOpen={isLoginDialogOpen} onClose={() => setIsLoginDialogOpen(false)} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#1e293b] transition-colors duration-300">
            <main className="h-screen pt-16">
                {/* Messages Container */}
                <div className="h-full flex">

                    {/* Conversations Sidebar */}
                    <div className={`w-full md:w-[360px] md:min-w-[300px] border-e border-gray-200 dark:border-gray-800 flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                        {/* Search + Refresh */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <svg className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                    placeholder={t('searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`w-full py-2.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                                />
                                </div>
                                <button
                                    onClick={refreshMessages}
                                    disabled={refreshing}
                                    className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors flex-shrink-0"
                                >
                                    <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Conversations List */}
                        <div className="flex-1 overflow-y-auto flex flex-col">
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
                                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-5">
                                        <svg className="w-10 h-10 text-blue-400 dark:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg mb-1">{t('noConversations')}</p>
                                    <p className="text-gray-400 dark:text-gray-500 text-sm leading-relaxed max-w-[220px]">{t('noConversationsHint')}</p>
                                </div>
                            ) : (
                                filteredConversations.map((conv) => (
                                    <button
                                        key={conv.id}
                                        onClick={() => openConversation(conv)}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-start ${
                                            selectedConversation === conv.id
                                                ? 'bg-blue-50 dark:bg-blue-500/10 border-e-2 border-blue-500'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                        }`}
                                    >
                                        {/* Avatar */}
                                        {conv.other_user?.avatar_url ? (
                                            <img
                                                src={conv.other_user.avatar_url}
                                                alt=""
                                                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                                {getInitial(conv.other_user)}
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-sm font-semibold truncate ${conv.unread_count > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {getUserDisplayName(conv.other_user)}
                                                </p>
                                                <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0 ms-2">
                                                    {conv.last_message ? formatRelativeTime(conv.last_message.created_at, locale) : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-0.5">
                                                <p className={`text-[13px] truncate ${conv.unread_count > 0 ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    {conv.last_message
                                                        ? (conv.last_message.sender_id === user?.id ? `${t('you')}: ` : '') + conv.last_message.content
                                                        : t('noMessages')
                                                    }
                                                </p>
                                                {conv.unread_count > 0 && (
                                                    <span className="ms-2 min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                                                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className={`flex-1 flex flex-col ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
                        {selectedConversation && otherUser ? (
                            <>
                                {/* Chat Header */}
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b]">
                                    {/* Back button (mobile) */}
                                    <button
                                        onClick={goBack}
                                        className="md:hidden p-1.5 -ms-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                                    >
                                        <svg className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>

                                    {/* User Info */}
                                    <Link href={`/profile?id=${otherUser.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                        {otherUser.avatar_url ? (
                                            <img src={otherUser.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                                {getInitial(otherUser)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                {getUserDisplayName(otherUser)}
                                            </p>
                                        </div>
                                    </Link>

                                    {/* Refresh button */}
                                    <button
                                        onClick={refreshMessages}
                                        disabled={refreshing}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                                    >
                                        <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50 dark:bg-[#0f172a]/50">
                                    {messagesLoading ? (
                                        <div className="flex items-center justify-center py-20">
                                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <p className="text-gray-400 dark:text-gray-500 text-sm">{t('startConversation')}</p>
                                        </div>
                                    ) : (
                                        Object.entries(groupedMessages).map(([date, msgs]) => (
                                            <div key={date}>
                                                {/* Date separator */}
                                                <div className="flex items-center justify-center my-4">
                                                    <span className="px-3 py-1 bg-gray-200/70 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 text-[11px] font-medium rounded-full">
                                                        {formatDateSeparator(msgs[0].created_at, locale)}
                                                    </span>
                                                </div>
                                                {msgs.map((msg) => {
                                                    const isMine = msg.sender_id === user?.id;
                                                    return (
                                                        <div key={msg.id} className={`flex mb-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`max-w-[75%] md:max-w-[65%] px-3.5 py-2 rounded-2xl ${
                                                                isMine
                                                                    ? 'bg-blue-600 text-white rounded-br-md'
                                                                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md'
                                                            }`}>
                                                                <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                                                                <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                                    <span className={`text-[10px] ${isMine ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                        {formatMessageTime(msg.created_at, locale)}
                                                                    </span>
                                                                    {isMine && (
                                                                        <svg className={`w-3.5 h-3.5 ${msg.is_read ? 'text-blue-200' : 'text-blue-300/50'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={msg.is_read ? "M5 13l4 4L19 7M5 13l4 4L19 7" : "M5 13l4 4L19 7"} />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Message Input */}
                                <form onSubmit={sendMessage} className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] fixed bottom-16 left-0 right-0 z-30 sm:static sm:z-auto">
                                    <div className="flex-1 relative">
                                        <textarea
                                            ref={messageInputRef}
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    sendMessage(e);
                                                }
                                            }}
                                            placeholder={t('messagePlaceholder')}
                                            rows={1}
                                            maxLength={2000}
                                            className="w-full resize-none py-2.5 px-4 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none max-h-32"
                                            style={{ minHeight: '40px' }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || sending}
                                        className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                                            newMessage.trim() && !sending
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        {sending ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <svg className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </form>
                            </>
                        ) : (
                            /* Empty State - No conversation selected */
                            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                                <div className="w-28 h-28 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                                    <svg className="w-14 h-14 text-blue-400 dark:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('selectConversation')}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs leading-relaxed">{t('selectConversationHint')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <LoginDialog isOpen={isLoginDialogOpen} onClose={() => setIsLoginDialogOpen(false)} />
        </div>
    );
}
