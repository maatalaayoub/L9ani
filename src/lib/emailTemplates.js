/**
 * Email Templates Service
 * 
 * Centralized email templates with multi-language support (English and Arabic).
 * 
 * @module lib/emailTemplates
 */

// =====================================================
// VERIFICATION EMAIL TEMPLATE
// =====================================================

/**
 * Generates a verification email template
 * 
 * @param {string} confirmUrl - The verification URL
 * @param {string} firstName - User's first name
 * @param {string} locale - Language locale ('en' or 'ar')
 * @returns {Object} Object with subject and html
 */
export function getVerificationEmailTemplate(confirmUrl, firstName, locale = 'en') {
    const isArabic = locale === 'ar';
    const dir = isArabic ? 'rtl' : 'ltr';
    const lang = isArabic ? 'ar' : 'en';
    const textAlign = isArabic ? 'right' : 'center';
    const paddingDir = isArabic ? 'padding-right' : 'padding-left';

    const content = {
        en: {
            subject: 'Verify Your Email - Lqani.ma',
            title: 'Verify Your Email',
            greeting: `Hi ${firstName}! Click the button below to verify your email address and activate your Lqani.ma account.`,
            button: 'Verify Email',
            expiryNote: 'This link expires in <strong>24 hours</strong>',
            ignoreNote: "If you didn't create an account on Lqani.ma, please ignore this email.",
            copyright: '© 2025 Lqani.ma. All rights reserved.',
        },
        ar: {
            subject: 'تأكيد بريدك الإلكتروني - Lqani.ma',
            title: 'تأكيد بريدك الإلكتروني',
            greeting: `مرحباً ${firstName}! انقر على الزر أدناه لتأكيد عنوان بريدك الإلكتروني وتفعيل حسابك على Lqani.ma.`,
            button: 'تأكيد البريد الإلكتروني',
            expiryNote: 'ينتهي هذا الرابط خلال <strong>24 ساعة</strong>',
            ignoreNote: 'إذا لم تقم بإنشاء حساب على Lqani.ma، يرجى تجاهل هذا البريد الإلكتروني.',
            copyright: '© 2025 Lqani.ma. جميع الحقوق محفوظة.',
        },
    };

    const t = content[locale] || content.en;

    const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${t.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, Arial, sans-serif;">
    
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff;">
        <tr>
            <td align="center" style="padding: 48px 24px;">
                
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 480px;">
                    
                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <img src="https://nqzjimrupjergwtwzlok.supabase.co/storage/v1/object/public/logo/Untitled%20folder/logo.svg" alt="Lqani.ma" width="140" height="40" style="display: block;">
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 32px 0;">
                            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 50%; display: inline-block;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="80" height="80">
                                    <tr>
                                        <td align="center" valign="middle">
                                            <span style="font-size: 36px; line-height: 1;">✉️</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 16px 0;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; line-height: 1.4;">
                                ${t.title}
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <p style="margin: 0; font-size: 16px; color: #64748b; line-height: 1.7; text-align: center;">
                                ${t.greeting}
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 14px;">
                                        <a href="${confirmUrl}" 
                                           target="_blank"
                                           style="display: inline-block; padding: 18px 56px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                            ${t.button}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td style="background-color: #dbeafe; border-radius: 12px; padding: 16px 20px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td width="32" valign="top">
                                                    <span style="font-size: 20px;">⏰</span>
                                                </td>
                                                <td style="${paddingDir}: 12px;">
                                                    <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
                                                        ${t.expiryNote}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 0 0 32px 0;">
                            <div style="height: 1px; background-color: #e2e8f0;"></div>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 48px 0;">
                            <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.6; text-align: center;">
                                ${t.ignoreNote}
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 0 0 32px 0;">
                            <div style="height: 1px; background-color: #e2e8f0;"></div>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 16px 0;">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                ${t.copyright}
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>`;

    return { subject: t.subject, html };
}

// =====================================================
// EMAIL CHANGE CONFIRMATION TEMPLATE
// =====================================================

/**
 * Generates an email change confirmation template
 * 
 * @param {string} confirmUrl - The confirmation URL
 * @param {string} locale - Language locale ('en' or 'ar')
 * @returns {Object} Object with subject and html
 */
export function getEmailChangeTemplate(confirmUrl, locale = 'en') {
    const isArabic = locale === 'ar';
    const dir = isArabic ? 'rtl' : 'ltr';
    const lang = isArabic ? 'ar' : 'en';
    const paddingDir = isArabic ? 'padding-right' : 'padding-left';

    const content = {
        en: {
            subject: 'Confirm Email Change - Lqani.ma',
            title: 'Confirm Email Change',
            description: 'You requested to change your email address on Lqani.ma. Click the button below to confirm this change.',
            button: 'Confirm New Email',
            expiryNote: 'This link expires in <strong>24 hours</strong>',
            ignoreNote: "If you didn't request this change, please ignore this email. Your email will remain unchanged.",
            copyright: '© 2025 Lqani.ma. All rights reserved.',
        },
        ar: {
            subject: 'تأكيد تغيير البريد الإلكتروني - Lqani.ma',
            title: 'تأكيد تغيير البريد الإلكتروني',
            description: 'لقد طلبت تغيير عنوان بريدك الإلكتروني على Lqani.ma. انقر على الزر أدناه لتأكيد هذا التغيير.',
            button: 'تأكيد البريد الجديد',
            expiryNote: 'ينتهي هذا الرابط خلال <strong>24 ساعة</strong>',
            ignoreNote: 'إذا لم تطلب هذا التغيير، يرجى تجاهل هذا البريد الإلكتروني. سيظل بريدك الإلكتروني كما هو.',
            copyright: '© 2025 Lqani.ma. جميع الحقوق محفوظة.',
        },
    };

    const t = content[locale] || content.en;

    const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${t.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, Arial, sans-serif;">
    
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff;">
        <tr>
            <td align="center" style="padding: 48px 24px;">
                
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 480px;">
                    
                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <img src="https://nqzjimrupjergwtwzlok.supabase.co/storage/v1/object/public/logo/Untitled%20folder/logo.svg" alt="Lqani.ma" width="140" height="40" style="display: block;">
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 32px 0;">
                            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 50%; display: inline-block;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="80" height="80">
                                    <tr>
                                        <td align="center" valign="middle">
                                            <span style="font-size: 36px; line-height: 1;">📧</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 16px 0;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; line-height: 1.4;">
                                ${t.title}
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <p style="margin: 0; font-size: 16px; color: #64748b; line-height: 1.7; text-align: center;">
                                ${t.description}
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 14px;">
                                        <a href="${confirmUrl}" 
                                           target="_blank"
                                           style="display: inline-block; padding: 18px 56px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                            ${t.button}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td style="background-color: #dbeafe; border-radius: 12px; padding: 16px 20px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td width="32" valign="top">
                                                    <span style="font-size: 20px;">⏰</span>
                                                </td>
                                                <td style="${paddingDir}: 12px;">
                                                    <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
                                                        ${t.expiryNote}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 0 0 32px 0;">
                            <div style="height: 1px; background-color: #e2e8f0;"></div>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 48px 0;">
                            <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.6; text-align: center;">
                                ${t.ignoreNote}
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 0 0 32px 0;">
                            <div style="height: 1px; background-color: #e2e8f0;"></div>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 0 16px 0;">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                ${t.copyright}
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>`;

    return { subject: t.subject, html };
}

// =====================================================
// PASSWORD RESET EMAIL TEMPLATE
// =====================================================

/**
 * Generates a password reset email template
 * 
 * @param {string} resetUrl - The password reset URL
 * @param {string} locale - Language locale ('en' or 'ar')
 * @returns {Object} Object with subject and html
 */
export function getPasswordResetEmailTemplate(resetUrl, locale = 'en') {
    const isArabic = locale === 'ar';
    const dir = isArabic ? 'rtl' : 'ltr';
    const lang = isArabic ? 'ar' : 'en';
    const paddingDir = isArabic ? 'padding-right' : 'padding-left';

    const content = {
        en: {
            subject: 'Reset Your Password - Lqani.ma',
            title: 'Reset Your Password',
            description: 'We received a request to reset the password for your account. Click the button below to create a new password.',
            button: 'Reset Password',
            expiryNote: 'This link expires in <strong>24 hours</strong>',
            altLinkNote: "If the button doesn't work, copy and paste this link into your browser:",
            ignoreNote: "If you didn't request a password reset, you can safely ignore this email.",
            needHelp: 'Need help?',
            contactUs: 'Contact us',
            copyright: '© 2025 Lqani.ma. All rights reserved.',
            privacyPolicy: 'Privacy Policy',
            termsOfService: 'Terms of Service',
        },
        ar: {
            subject: 'إعادة تعيين كلمة المرور - Lqani.ma',
            title: 'إعادة تعيين كلمة المرور',
            description: 'لقد تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك. انقر على الزر أدناه لإنشاء كلمة مرور جديدة.',
            button: 'إعادة تعيين كلمة المرور',
            expiryNote: 'ينتهي هذا الرابط خلال <strong>24 ساعة</strong>',
            altLinkNote: 'إذا لم يعمل الزر، انسخ والصق هذا الرابط في متصفحك:',
            ignoreNote: 'إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني بأمان.',
            needHelp: 'هل تحتاج مساعدة؟',
            contactUs: 'اتصل بنا',
            copyright: '© 2025 Lqani.ma. جميع الحقوق محفوظة.',
            privacyPolicy: 'سياسة الخصوصية',
            termsOfService: 'شروط الخدمة',
        },
    };

    const t = content[locale] || content.en;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lqani.ma';

    const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${t.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, Arial, sans-serif;">
    
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff;">
        <tr>
            <td align="center" style="padding: 48px 24px;">
                
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 480px;">
                    
                    <!-- Logo Section -->
                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <img src="https://nqzjimrupjergwtwzlok.supabase.co/storage/v1/object/public/logo/Untitled%20folder/logo.svg" alt="Lqani.ma" width="140" height="40" style="display: block;">
                        </td>
                    </tr>

                    <!-- Icon -->
                    <tr>
                        <td align="center" style="padding: 0 0 32px 0;">
                            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #4A3FF6 0%, #6366f1 100%); border-radius: 50%; display: inline-block;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="80" height="80">
                                    <tr>
                                        <td align="center" valign="middle">
                                            <span style="font-size: 36px; line-height: 1;">🔐</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- Title -->
                    <tr>
                        <td align="center" style="padding: 0 0 16px 0;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; line-height: 1.4;">
                                ${t.title}
                            </h1>
                        </td>
                    </tr>

                    <!-- Description -->
                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <p style="margin: 0; font-size: 16px; color: #64748b; line-height: 1.7; text-align: center;">
                                ${t.description}
                            </p>
                        </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #4A3FF6 0%, #6366f1 100%); border-radius: 14px;">
                                        <a href="${resetUrl}" 
                                           target="_blank"
                                           style="display: inline-block; padding: 18px 56px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                            ${t.button}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Expiry Notice -->
                    <tr>
                        <td align="center" style="padding: 0 0 40px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td style="background-color: #fef3c7; border-radius: 12px; padding: 16px 20px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                            <tr>
                                                <td width="32" valign="top">
                                                    <span style="font-size: 20px;">⏰</span>
                                                </td>
                                                <td style="${paddingDir}: 12px;">
                                                    <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                                                        ${t.expiryNote}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                        <td style="padding: 0 0 32px 0;">
                            <div style="height: 1px; background-color: #e2e8f0;"></div>
                        </td>
                    </tr>

                    <!-- Alternative Link -->
                    <tr>
                        <td align="center" style="padding: 0 0 32px 0;">
                            <p style="margin: 0 0 12px 0; font-size: 13px; color: #94a3b8; line-height: 1.6; text-align: center;">
                                ${t.altLinkNote}
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #4A3FF6; word-break: break-all; line-height: 1.6; text-align: center; font-family: monospace; background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px;">
                                ${resetUrl}
                            </p>
                        </td>
                    </tr>

                    <!-- Security Notice -->
                    <tr>
                        <td align="center" style="padding: 0 0 48px 0;">
                            <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.6; text-align: center;">
                                ${t.ignoreNote}
                            </p>
                        </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                        <td style="padding: 0 0 32px 0;">
                            <div style="height: 1px; background-color: #e2e8f0;"></div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 0 0 16px 0;">
                            <p style="margin: 0; font-size: 13px; color: #64748b;">
                                ${t.needHelp} 
                                <a href="mailto:support@lqani.ma" style="color: #4A3FF6; text-decoration: none; font-weight: 500;">${t.contactUs}</a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 0 0 16px 0;">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                ${t.copyright}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                <a href="${baseUrl}/privacy" style="color: #64748b; text-decoration: none;">${t.privacyPolicy}</a>
                                <span style="color: #cbd5e1; margin: 0 8px;">•</span>
                                <a href="${baseUrl}/about" style="color: #64748b; text-decoration: none;">${t.termsOfService}</a>
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>`;

    return { subject: t.subject, html };
}

/**
 * Gets the user's preferred language from their settings
 * 
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} userId - User ID
 * @returns {Promise<string>} Language code ('en' or 'ar')
 */
export async function getUserLanguage(supabaseAdmin, userId) {
    try {
        console.log('[EmailTemplates] Fetching language for user:', userId);
        
        const { data: settings, error } = await supabaseAdmin
            .from('user_settings')
            .select('language')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            console.error('[EmailTemplates] Error fetching user_settings:', error.message);
            return 'en';
        }
        
        console.log('[EmailTemplates] User settings found:', settings);
        console.log('[EmailTemplates] Language value:', settings?.language);
        
        return settings?.language || 'en';
    } catch (error) {
        console.error('[EmailTemplates] Exception getting user language:', error);
        return 'en';
    }
}
