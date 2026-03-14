"use client";

import { useState } from 'react';
import { useLanguage } from "@/context/LanguageContext";

export default function ContactOwnerDialog({ isOpen, onClose, recipientId }) {
    const { locale } = useLanguage();
    const isRTL = locale === 'ar';
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const texts = {
        title: isRTL ? 'تواصل مع صاحب البلاغ' : 'Contact Owner',
        placeholder: isRTL ? 'اكتب رسالتك هنا...' : 'Write your message here...',
        send: isRTL ? 'إرسال' : 'Send',
        sending: isRTL ? 'جاري الإرسال...' : 'Sending...',
        cancel: isRTL ? 'إلغاء' : 'Cancel',
        sent: isRTL ? 'تم إرسال الرسالة بنجاح!' : 'Message sent successfully!',
        sentSub: isRTL ? 'يمكنك متابعة المحادثة من صفحة الرسائل' : 'You can continue the conversation from the messages page',
        close: isRTL ? 'إغلاق' : 'Close',
        blocked: isRTL ? 'هذا المستخدم لا يقبل الرسائل' : 'This user does not accept messages',
    };

    const handleSend = async () => {
        if (!message.trim() || sending) return;

        const token = localStorage.getItem('supabase_token');
        if (!token) return;

        setSending(true);
        setError('');

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipient_id: recipientId,
                    content: message.trim()
                })
            });

            if (res.ok) {
                setSent(true);
                setMessage('');
            } else {
                const data = await res.json();
                if (res.status === 403) {
                    setError(texts.blocked);
                } else {
                    setError(data.error || 'Failed to send message');
                }
            }
        } catch {
            setError('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleClose = () => {
        setMessage('');
        setSent(false);
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={handleClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6"
                dir={isRTL ? 'rtl' : 'ltr'}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {texts.title}
                    </h3>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {sent ? (
                    /* Success state */
                    <div className="text-center py-4">
                        <div className="w-14 h-14 mx-auto mb-3 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-gray-900 dark:text-white font-medium">{texts.sent}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{texts.sentSub}</p>
                        <button
                            onClick={handleClose}
                            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                        >
                            {texts.close}
                        </button>
                    </div>
                ) : (
                    /* Message input */
                    <>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={texts.placeholder}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            dir={isRTL ? 'rtl' : 'ltr'}
                            autoFocus
                        />

                        {error && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                        )}

                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={handleClose}
                                className="flex-1 px-4 py-2.5 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                {texts.cancel}
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={!message.trim() || sending}
                                className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {sending ? texts.sending : texts.send}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
