import { NextResponse } from 'next/server';

/**
 * L9ani Smart Local Assistant
 * 100% local - no external API calls
 * Uses semantic keyword analysis for intelligent responses
 */

// ============================================================================
// KEYWORD DICTIONARIES - Semantic analysis across 3 languages
// ============================================================================

const KEYWORDS = {
    // LOST/MISSING something
    lost: {
        en: ['lost', 'lose', 'missing', 'misplaced', 'cant find', "can't find", 'cannot find', 'disappeared', 'gone', 'stolen', 'theft', 'where is my', 'help find', 'i lost', 'my lost'],
        ar: ['ضاع', 'ضايع', 'ضائع', 'مفقود', 'فقدت', 'فقدان', 'أضعت', 'سرق', 'سرقة', 'اختفى', 'راح', 'وين', 'ما لقيت', 'ضيعت', 'تيهان'],
        darija: ['ضاع', 'ضيعت', 'راح', 'تسرق', 'مالقيتش', 'فين', 'شفت', 'مشى', 'طار', 'ضاعت', 'ضيعته', 'ما بقاش', 'تلف']
    },
    
    // FOUND something
    found: {
        en: ['found', 'find', 'discovered', 'saw', 'spotted', 'seen', 'picked up', 'someone lost', 'belongs to', 'owner', 'return', 'i found', 'found this', 'found a', 'found an'],
        ar: ['وجدت', 'لقيت', 'عثرت', 'شاهدت', 'رأيت', 'صاحب', 'صاحبه', 'يعود لـ', 'لمين', 'إرجاع', 'أرجع', 'مشاهدة'],
        darija: ['لقيت', 'لقيته', 'لقيتها', 'شفت', 'صبت', 'ديال شي واحد', 'منو', 'باش نرجع', 'نرد']
    },
    
    // SEARCH/BROWSE
    search: {
        en: ['search', 'browse', 'look for', 'looking for', 'find report', 'all reports', 'list', 'show me', 'see reports', 'view reports', 'check reports', 'explore'],
        ar: ['بحث', 'ابحث', 'أبحث', 'البحث', 'عرض', 'استعراض', 'كل البلاغات', 'قائمة', 'أرني', 'شوف'],
        darija: ['قلب', 'نقلب', 'بحث', 'شوف', 'ورني', 'فين نلقى', 'كيفاش نلقى', 'البلاغات']
    },
    
    // MY REPORTS
    myReports: {
        en: ['my report', 'my reports', 'my submission', 'my listings', 'edit report', 'delete report', 'update report', 'manage report', 'change my report', 'submitted', 'my post', 'my posts', 'track report'],
        ar: ['بلاغاتي', 'بلاغي', 'تقاريري', 'تعديل البلاغ', 'حذف البلاغ', 'إدارة', 'منشوراتي', 'متابعة'],
        darija: ['البلاغات ديالي', 'بلاغاتي', 'بدل البلاغ', 'مسح البلاغ', 'شوف البلاغات ديالي', 'فين البلاغات ديالي']
    },
    
    // PROFILE/ACCOUNT
    profile: {
        en: ['profile', 'account', 'my account', 'personal info', 'change name', 'update info', 'my information', 'photo', 'picture', 'avatar', 'phone number', 'email'],
        ar: ['الملف الشخصي', 'حسابي', 'معلوماتي', 'بياناتي', 'صورتي', 'الاسم', 'رقم الهاتف', 'البريد'],
        darija: ['الحساب ديالي', 'المعلومات ديالي', 'الصورة ديالي', 'بدل السمية', 'بدل الرقم']
    },
    
    // SETTINGS
    settings: {
        en: ['settings', 'preferences', 'change password', 'password', 'language', 'notification', 'dark mode', 'theme', 'change language', 'security'],
        ar: ['الإعدادات', 'إعدادات', 'كلمة المرور', 'كلمة السر', 'اللغة', 'الإشعارات', 'الوضع الليلي', 'تغيير اللغة', 'الأمان'],
        darija: ['الإعدادات', 'الباسوورد', 'بدل الباسوورد', 'اللغة', 'بدل اللغة', 'الموضوع']
    },
    
    // CONTACT/SUPPORT
    contact: {
        en: ['contact', 'support', 'help', 'problem', 'issue', 'complaint', 'question', 'talk to', 'human', 'agent', 'customer service', 'assistance', 'bug', 'error', 'not working'],
        ar: ['تواصل', 'اتصل', 'دعم', 'مساعدة', 'مشكلة', 'شكوى', 'سؤال', 'استفسار', 'خدمة العملاء'],
        darija: ['تواصل', 'عاوني', 'مشكل', 'عندي مشكل', 'سؤال', 'بغيت نتواصل', 'كيفاش نتواصل']
    },
    
    // ABOUT
    about: {
        en: ['about', 'what is', 'how does', 'how it works', 'who are you', 'what are you', 'explain', 'tell me about', 'platform', 'mission', 'purpose', 'l9ani'],
        ar: ['عن', 'ما هو', 'ما هي', 'كيف يعمل', 'من أنتم', 'اشرح', 'المنصة', 'الموقع', 'لقاني', 'هدف'],
        darija: ['شنو هو', 'شنو هي', 'كيفاش خدام', 'شكون نتوما', 'علاش', 'لقاني', 'المنصة', 'الموقع']
    },
    
    // PRIVACY
    privacy: {
        en: ['privacy', 'policy', 'data', 'personal data', 'information security', 'terms', 'conditions', 'legal', 'rights', 'gdpr', 'delete my data', 'my data'],
        ar: ['الخصوصية', 'السياسة', 'البيانات', 'حماية البيانات', 'الشروط', 'الأحكام', 'حقوقي', 'قانوني'],
        darija: ['الخصوصية', 'البيانات', 'المعلومات ديالي', 'الشروط', 'القانون']
    },
    
    // GREETINGS
    greeting: {
        en: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'good afternoon', 'howdy', 'greetings', 'sup', 'yo', 'hola'],
        ar: ['مرحبا', 'أهلا', 'السلام عليكم', 'صباح الخير', 'مساء الخير', 'هلا', 'اهلين', 'سلام'],
        darija: ['سلام', 'اهلا', 'لاباس', 'كيداير', 'كيدايرة', 'اخويا', 'صاحبي', 'سلام عليكم']
    },
    
    // THANKS
    thanks: {
        en: ['thank', 'thanks', 'thank you', 'appreciate', 'helpful', 'great', 'awesome', 'perfect', 'good job', 'nice', 'cool'],
        ar: ['شكرا', 'شكراً', 'جزاك الله', 'مشكور', 'ممتاز', 'رائع', 'جميل'],
        darija: ['شكرا', 'بارك الله فيك', 'صحيت', 'الله يعطيك الصحة', 'مزيان', 'واعر']
    },
    
    // ITEMS (for context detection)
    items: {
        phone: ['phone', 'mobile', 'smartphone', 'iphone', 'samsung', 'هاتف', 'تليفون', 'موبايل', 'جوال', 'بورطابل'],
        wallet: ['wallet', 'purse', 'money', 'cash', 'card', 'credit card', 'محفظة', 'فلوس', 'بزطام', 'كارط', 'البطاقة'],
        keys: ['key', 'keys', 'car key', 'house key', 'مفتاح', 'مفاتيح', 'سروت', 'كليز'],
        documents: ['document', 'id', 'passport', 'license', 'cin', 'carte', 'وثيقة', 'بطاقة', 'جواز', 'رخصة', 'كارط', 'لاكارط'],
        pet: ['pet', 'dog', 'cat', 'animal', 'bird', 'حيوان', 'كلب', 'قط', 'طير', 'مول', 'قطوس'],
        person: ['person', 'child', 'kid', 'elderly', 'relative', 'family', 'شخص', 'طفل', 'ولد', 'بنت', 'مسن', 'عائلة', 'درية'],
        bag: ['bag', 'backpack', 'luggage', 'suitcase', 'briefcase', 'حقيبة', 'شنطة', 'ساك', 'فاليز'],
        jewelry: ['jewelry', 'ring', 'necklace', 'watch', 'gold', 'مجوهرات', 'خاتم', 'سلسلة', 'ساعة', 'ذهب'],
        electronics: ['laptop', 'tablet', 'camera', 'airpods', 'headphones', 'لابطوب', 'تابلت', 'كاميرا']
    }
};

// ============================================================================
// INTENT DETECTION - Smart semantic analysis
// ============================================================================

/**
 * Normalize text for matching
 */
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[؟?!.,;:'"]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Check if text contains any keyword from a list
 */
function containsKeyword(text, keywords) {
    const normalized = normalizeText(text);
    return keywords.some(keyword => {
        const normalizedKeyword = normalizeText(keyword);
        // Check for word boundary match or substring
        return normalized.includes(normalizedKeyword) ||
               new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(normalized);
    });
}

/**
 * Calculate match score for a category
 */
function getMatchScore(text, category) {
    let score = 0;
    const normalized = normalizeText(text);
    
    Object.values(category).flat().forEach(keyword => {
        const normalizedKeyword = normalizeText(keyword);
        if (normalized.includes(normalizedKeyword)) {
            // Longer keywords get higher score (more specific)
            score += normalizedKeyword.length;
        }
    });
    
    return score;
}

/**
 * Detect the primary intent from user message
 */
function detectIntent(message) {
    const text = normalizeText(message);
    
    // Calculate scores for each intent
    const scores = {
        lost: getMatchScore(text, KEYWORDS.lost),
        found: getMatchScore(text, KEYWORDS.found),
        search: getMatchScore(text, KEYWORDS.search),
        myReports: getMatchScore(text, KEYWORDS.myReports),
        profile: getMatchScore(text, KEYWORDS.profile),
        settings: getMatchScore(text, KEYWORDS.settings),
        contact: getMatchScore(text, KEYWORDS.contact),
        about: getMatchScore(text, KEYWORDS.about),
        privacy: getMatchScore(text, KEYWORDS.privacy),
        greeting: getMatchScore(text, KEYWORDS.greeting),
        thanks: getMatchScore(text, KEYWORDS.thanks)
    };
    
    // Find the highest scoring intent
    const maxScore = Math.max(...Object.values(scores));
    
    if (maxScore === 0) {
        return 'unknown';
    }
    
    // Get all intents with the max score
    const topIntents = Object.entries(scores)
        .filter(([_, score]) => score === maxScore)
        .map(([intent]) => intent);
    
    // Priority order for ties
    const priority = ['lost', 'found', 'search', 'myReports', 'profile', 'settings', 'contact', 'about', 'privacy', 'greeting', 'thanks'];
    
    for (const intent of priority) {
        if (topIntents.includes(intent)) {
            return intent;
        }
    }
    
    return topIntents[0];
}

/**
 * Detect item type mentioned in message
 */
function detectItemType(message) {
    const text = normalizeText(message);
    
    for (const [itemType, keywords] of Object.entries(KEYWORDS.items)) {
        if (containsKeyword(text, keywords)) {
            return itemType;
        }
    }
    
    return null;
}

/**
 * Detect language (English, Arabic formal, or Darija)
 */
function detectLanguage(message) {
    const hasArabic = /[\u0600-\u06FF]/.test(message);
    
    if (!hasArabic) {
        return 'en';
    }
    
    // Check for Darija indicators
    const darijaPatterns = [
        'كيفاش', 'فين', 'شنو', 'واش', 'ديال', 'بغيت', 'كيداير', 'كيدايرة',
        'نقدر', 'معرفتش', 'مالقيتش', 'صافي', 'واخا', 'بزاف', 'شوية',
        'غادي', 'كنبغي', 'راه', 'هادشي', 'ماشي', 'علاش', 'باش', 'منين'
    ];
    
    if (darijaPatterns.some(pattern => message.includes(pattern))) {
        return 'darija';
    }
    
    return 'ar';
}

// ============================================================================
// RESPONSE GENERATION - Intelligent contextual responses
// ============================================================================

const RESPONSES = {
    lost: {
        en: (item) => {
            const itemText = item ? `your ${item}` : 'something';
            return {
                text: `I'm sorry to hear you lost ${itemText}. 😔 Let me help you create a missing report so others can help find it!\n\n📝 Go to **Report Missing** (/report-missing) to:\n• Add photos and detailed description\n• Mark the location where you lost it\n• Provide your contact information\n\nThe more details you add, the better chance of recovery!`,
                route: '/report-missing'
            };
        },
        ar: (item) => {
            const itemText = item ? `${getItemArabic(item)}` : 'شيء';
            return {
                text: `آسف لسماع أنك فقدت ${itemText}. 😔 دعني أساعدك في إنشاء بلاغ مفقودات!\n\n📝 اذهب إلى **بلاغ مفقود** (/report-missing) حيث يمكنك:\n• إضافة صور ووصف تفصيلي\n• تحديد الموقع الذي فقدته فيه\n• إضافة معلومات الاتصال\n\nكلما أضفت تفاصيل أكثر، زادت فرصة الاسترداد!`,
                route: '/report-missing'
            };
        },
        darija: (item) => {
            const itemText = item ? `${getItemDarija(item)}` : 'شي حاجة';
            return {
                text: `والله يحزن! 😔 معليش، غادي نعاونك تدير بلاغ باش الناس يقدرو يعاونوك تلقاها!\n\n📝 سير لـ **بلّغ على ضايع** (/report-missing) باش:\n• تزيد تصاور ووصف مزيان\n• تحدد فين ضاعت ليك\n• تحط رقم الهاتف ديالك\n\nكلما زدتي تفاصيل، كلما كان عندك فرصة أكبر تلقاها!`,
                route: '/report-missing'
            };
        }
    },
    
    found: {
        en: (item) => {
            const itemText = item ? `a ${item}` : 'something';
            return {
                text: `That's great that you found ${itemText}! 🎉 You can help reunite it with the owner!\n\n👁️ Go to **Report Sighting** (/report-sighting) to:\n• Post what you found\n• Add photos for identification\n• Share the location where you found it\n\nYou're helping make someone's day better! 💙`,
                route: '/report-sighting'
            };
        },
        ar: (item) => {
            const itemText = item ? getItemArabic(item) : 'شيء';
            return {
                text: `رائع أنك وجدت ${itemText}! 🎉 يمكنك مساعدة صاحبه في استرداده!\n\n👁️ اذهب إلى **بلاغ مشاهدة** (/report-sighting) حيث يمكنك:\n• نشر ما وجدته\n• إضافة صور للتعريف\n• مشاركة المكان الذي وجدته فيه\n\nأنت تساعد في إسعاد شخص ما! 💙`,
                route: '/report-sighting'
            };
        },
        darija: (item) => {
            const itemText = item ? getItemDarija(item) : 'شي حاجة';
            return {
                text: `واعر! لقيتي ${itemText}! 🎉 دابا تقدر تعاون مولاها يلقاها!\n\n👁️ سير لـ **بلّغ على لقية** (/report-sighting) باش:\n• تنشر شنو لقيتي\n• تزيد تصاور\n• تقول فين لقيتيها\n\nراك غادي تفرح شي واحد! 💙`,
                route: '/report-sighting'
            };
        }
    },
    
    search: {
        en: {
            text: `Looking for a lost item? 🔍\n\n🏠 Go to the **Home Page** (/) to:\n• Browse all lost & found reports\n• Filter by category, location, or date\n• Search by keywords\n• See recent reports in your area\n\nYou might find what you're looking for!`,
            route: '/'
        },
        ar: {
            text: `تبحث عن شيء مفقود؟ 🔍\n\n🏠 اذهب إلى **الصفحة الرئيسية** (/) حيث يمكنك:\n• تصفح جميع بلاغات المفقودات والموجودات\n• التصفية حسب الفئة أو الموقع أو التاريخ\n• البحث بالكلمات المفتاحية\n• رؤية البلاغات الأخيرة في منطقتك\n\nربما تجد ما تبحث عنه!`,
            route: '/'
        },
        darija: {
            text: `كتقلب على شي حاجة؟ 🔍\n\n🏠 سير للـ **الصفحة الرئيسية** (/) باش:\n• تشوف كاع البلاغات\n• تفلتري بالنوع ولا البلاصة ولا التاريخ\n• تقلب بكلمات\n• تشوف البلاغات الجداد فالمنطقة ديالك\n\nيقدر تلقى اللي كتقلب عليه!`,
            route: '/'
        }
    },
    
    myReports: {
        en: {
            text: `Want to manage your reports? 📋\n\n📁 Go to **My Reports** (/my-report) where you can:\n• View all your submitted reports\n• Edit or update information\n• Mark items as found/recovered\n• Delete reports you no longer need\n\nKeep your reports up to date!`,
            route: '/my-report'
        },
        ar: {
            text: `تريد إدارة بلاغاتك؟ 📋\n\n📁 اذهب إلى **بلاغاتي** (/my-report) حيث يمكنك:\n• عرض جميع بلاغاتك\n• تعديل أو تحديث المعلومات\n• تحديد العناصر كمسترجعة\n• حذف البلاغات التي لم تعد بحاجتها\n\nحافظ على تحديث بلاغاتك!`,
            route: '/my-report'
        },
        darija: {
            text: `بغيتي تشوف البلاغات ديالك؟ 📋\n\n📁 سير لـ **بلاغاتي** (/my-report) باش:\n• تشوف كاع البلاغات اللي درتي\n• تبدل ولا تحدث المعلومات\n• تقول أنك لقيتي الحاجة\n• تمسح البلاغات اللي ما بقيتيش محتاجهم\n\nخلي البلاغات ديالك محدثين!`,
            route: '/my-report'
        }
    },
    
    profile: {
        en: {
            text: `Need to update your profile? 👤\n\n📝 Go to **Profile** (/profile) where you can:\n• Update your display name\n• Change your profile picture\n• Edit your phone number\n• Manage your email\n\nKeep your info current so people can reach you!`,
            route: '/profile'
        },
        ar: {
            text: `تريد تحديث ملفك الشخصي؟ 👤\n\n📝 اذهب إلى **الملف الشخصي** (/profile) حيث يمكنك:\n• تحديث اسم العرض\n• تغيير صورة الملف الشخصي\n• تعديل رقم الهاتف\n• إدارة بريدك الإلكتروني\n\nحافظ على تحديث معلوماتك!`,
            route: '/profile'
        },
        darija: {
            text: `بغيتي تبدل المعلومات ديالك؟ 👤\n\n📝 سير لـ **الحساب** (/profile) باش:\n• تبدل السمية ديالك\n• تبدل الصورة\n• تبدل رقم التليفون\n• تشوف الإيميل\n\nخلي المعلومات ديالك محدثين باش الناس يقدرو يتواصلو معاك!`,
            route: '/profile'
        }
    },
    
    settings: {
        en: {
            text: `Looking for settings? ⚙️\n\n🔧 Go to **Settings** (/settings) where you can:\n• Change your password\n• Switch language (English/Arabic/Darija)\n• Manage notifications\n• Toggle dark mode\n\nCustomize L9ani to fit your preferences!`,
            route: '/settings'
        },
        ar: {
            text: `تبحث عن الإعدادات؟ ⚙️\n\n🔧 اذهب إلى **الإعدادات** (/settings) حيث يمكنك:\n• تغيير كلمة المرور\n• تبديل اللغة (الإنجليزية/العربية/الدارجة)\n• إدارة الإشعارات\n• تفعيل الوضع الليلي\n\nخصص لقاني حسب تفضيلاتك!`,
            route: '/settings'
        },
        darija: {
            text: `كتقلب على الإعدادات؟ ⚙️\n\n🔧 سير لـ **الإعدادات** (/settings) باش:\n• تبدل الباسوورد\n• تبدل اللغة (نڭليزية/عربية/دارجة)\n• تحكم في الإشعارات\n• تشغل الوضع الليلي\n\nخصص لقاني على ذوقك!`,
            route: '/settings'
        }
    },
    
    contact: {
        en: {
            text: `Need help from our team? 📞\n\n💬 Go to **Contact Us** (/contact) to:\n• Send a message to our support team\n• Report technical issues\n• Ask questions about the platform\n• Submit feedback or suggestions\n\nWe typically respond within 24 hours!`,
            route: '/contact'
        },
        ar: {
            text: `تحتاج مساعدة من فريقنا؟ 📞\n\n💬 اذهب إلى **تواصل معنا** (/contact) حيث يمكنك:\n• إرسال رسالة لفريق الدعم\n• الإبلاغ عن مشاكل تقنية\n• طرح أسئلة حول المنصة\n• إرسال ملاحظات أو اقتراحات\n\nنرد عادة خلال 24 ساعة!`,
            route: '/contact'
        },
        darija: {
            text: `محتاج معاونة من الفريق؟ 📞\n\n💬 سير لـ **تواصل معانا** (/contact) باش:\n• تصيفط رسالة للدعم\n• تبلغ على مشاكل تقنية\n• تسأل على المنصة\n• تعطينا رأيك أو اقتراحات\n\nكنردو عادة في 24 ساعة!`,
            route: '/contact'
        }
    },
    
    about: {
        en: {
            text: `Want to know about L9ani? 🌟\n\n**L9ani** (لقاني) means "Find me" in Moroccan Arabic. It's a free platform to help people in Morocco find their lost belongings and reunite found items with their owners.\n\n📖 Visit **About Us** (/about) to learn:\n• Our mission and story\n• How the platform works\n• Our team and values\n\nTogether, we help reconnect people with what matters!`,
            route: '/about'
        },
        ar: {
            text: `تريد معرفة المزيد عن لقاني؟ 🌟\n\n**لقاني** اسم مغربي يعني "جدني". إنها منصة مجانية لمساعدة الناس في المغرب على إيجاد ممتلكاتهم المفقودة.\n\n📖 قم بزيارة **عنا** (/about) لتتعرف على:\n• رسالتنا وقصتنا\n• كيف تعمل المنصة\n• فريقنا وقيمنا\n\nمعاً نساعد في لم شمل الناس بممتلكاتهم!`,
            route: '/about'
        },
        darija: {
            text: `بغيتي تعرف على لقاني؟ 🌟\n\n**لقاني** معناها "لقاني" بالدارجة. هادي منصة بالمجان باش تعاون الناس فالمغرب يلقاو الحوايج ديالهم اللي ضاعو.\n\n📖 سير لـ **علينا** (/about) باش تعرف:\n• الرسالة والقصة ديالنا\n• كيفاش خدامة المنصة\n• الفريق والقيم ديالنا\n\nمع بعضياتنا كنعاونو الناس يلقاو حوايجهم!`,
            route: '/about'
        }
    },
    
    privacy: {
        en: {
            text: `Interested in our privacy policy? 🔒\n\n📜 Visit **Privacy Policy** (/privacy) to learn about:\n• How we collect and use your data\n• Your rights regarding your information\n• Data protection measures\n• How to delete your account/data\n\nYour privacy is important to us!`,
            route: '/privacy'
        },
        ar: {
            text: `مهتم بسياسة الخصوصية؟ 🔒\n\n📜 قم بزيارة **سياسة الخصوصية** (/privacy) للتعرف على:\n• كيف نجمع ونستخدم بياناتك\n• حقوقك المتعلقة بمعلوماتك\n• إجراءات حماية البيانات\n• كيفية حذف حسابك/بياناتك\n\nخصوصيتك مهمة لنا!`,
            route: '/privacy'
        },
        darija: {
            text: `بغيتي تعرف على الخصوصية؟ 🔒\n\n📜 سير لـ **سياسة الخصوصية** (/privacy) باش تعرف:\n• كيفاش كنجمعو ونستعملو البيانات ديالك\n• الحقوق ديالك على المعلومات\n• كيفاش كنحميو البيانات\n• كيفاش تمسح الحساب ديالك\n\nالخصوصية ديالك مهمة عندنا!`,
            route: '/privacy'
        }
    },
    
    greeting: {
        en: {
            text: `Hello! 👋 Welcome to L9ani - Morocco's Lost & Found platform!\n\nI'm here to help you with:\n• 📝 Report something you lost\n• 👁️ Report something you found\n• 🔍 Search for lost items\n• 📋 Manage your reports\n\nWhat would you like to do today?`,
            route: null
        },
        ar: {
            text: `مرحباً! 👋 أهلاً بك في لقاني - منصة المفقودات والموجودات في المغرب!\n\nأنا هنا لمساعدتك في:\n• 📝 الإبلاغ عن شيء مفقود\n• 👁️ الإبلاغ عن شيء وجدته\n• 🔍 البحث عن المفقودات\n• 📋 إدارة بلاغاتك\n\nماذا تريد أن تفعل اليوم؟`,
            route: null
        },
        darija: {
            text: `سلام! 👋 مرحبا بيك فـ لقاني - المنصة ديال المفقودات والموجودات فالمغرب!\n\nأنا هنا باش نعاونك في:\n• 📝 تبلغ على شي حاجة ضايعة\n• 👁️ تبلغ على شي حاجة لقيتيها\n• 🔍 تقلب على حاجة ضايعة\n• 📋 تشوف البلاغات ديالك\n\nشنو بغيتي دير اليوم؟`,
            route: null
        }
    },
    
    thanks: {
        en: {
            text: `You're welcome! 😊 Happy to help!\n\nIs there anything else you need?\n• 📝 Report lost item\n• 👁️ Report found item\n• 🔍 Search reports\n• 📞 Contact support`,
            route: null
        },
        ar: {
            text: `عفواً! 😊 سعيد بمساعدتك!\n\nهل تحتاج شيء آخر؟\n• 📝 بلاغ مفقود\n• 👁️ بلاغ مشاهدة\n• 🔍 بحث في البلاغات\n• 📞 تواصل مع الدعم`,
            route: null
        },
        darija: {
            text: `لا شكر على واجب! 😊 فرحان نعاونك!\n\nواش محتاج شي حاجة خرى؟\n• 📝 بلاغ ضايع\n• 👁️ بلاغ لقية\n• 🔍 قلب فالبلاغات\n• 📞 تواصل مع الدعم`,
            route: null
        }
    },
    
    unknown: {
        en: {
            text: `I'm your L9ani assistant, specialized in helping with lost & found items. 🔍\n\nI can help you with:\n• 📝 **Report Missing** - Lost something? Create a report\n• 👁️ **Report Sighting** - Found something? Help find the owner\n• 🔍 **Search** - Browse all lost & found reports\n• 📋 **My Reports** - Manage your submissions\n• 👤 **Profile** - Update your information\n• ⚙️ **Settings** - Change preferences\n• 📞 **Contact** - Get human support\n\nWhat would you like to do?`,
            route: null
        },
        ar: {
            text: `أنا مساعد لقاني، متخصص في المفقودات والموجودات. 🔍\n\nيمكنني مساعدتك في:\n• 📝 **بلاغ مفقود** - فقدت شيء؟ أنشئ بلاغ\n• 👁️ **بلاغ مشاهدة** - وجدت شيء؟ ساعد في إيجاد صاحبه\n• 🔍 **بحث** - تصفح البلاغات\n• 📋 **بلاغاتي** - إدارة بلاغاتك\n• 👤 **الملف الشخصي** - تحديث معلوماتك\n• ⚙️ **الإعدادات** - تغيير التفضيلات\n• 📞 **تواصل** - دعم بشري\n\nماذا تريد أن تفعل؟`,
            route: null
        },
        darija: {
            text: `أنا المساعد ديال لقاني، متخصص فالمفقودات والموجودات. 🔍\n\nنقدر نعاونك في:\n• 📝 **بلاغ ضايع** - ضاعت ليك شي حاجة؟ دير بلاغ\n• 👁️ **بلاغ لقية** - لقيتي شي حاجة؟ عاون مولاها يلقاها\n• 🔍 **قلب** - شوف البلاغات\n• 📋 **بلاغاتي** - شوف البلاغات ديالك\n• 👤 **الحساب** - بدل المعلومات ديالك\n• ⚙️ **الإعدادات** - بدل التفضيلات\n• 📞 **تواصل** - تكلم مع واحد من الفريق\n\nشنو بغيتي دير؟`,
            route: null
        }
    }
};

// Helper functions for item translations
function getItemArabic(item) {
    const translations = {
        phone: 'هاتفك',
        wallet: 'محفظتك',
        keys: 'مفاتيحك',
        documents: 'وثائقك',
        pet: 'حيوانك الأليف',
        person: 'شخص',
        bag: 'حقيبتك',
        jewelry: 'مجوهراتك',
        electronics: 'جهازك'
    };
    return translations[item] || 'شيء';
}

function getItemDarija(item) {
    const translations = {
        phone: 'التليفون',
        wallet: 'البزطام',
        keys: 'السروت',
        documents: 'الكارط',
        pet: 'الحيوان',
        person: 'شي واحد',
        bag: 'الساك',
        jewelry: 'الذهب',
        electronics: 'اللابطوب'
    };
    return translations[item] || 'شي حاجة';
}

/**
 * Generate response based on intent and language
 */
function generateResponse(intent, language, itemType) {
    const responseData = RESPONSES[intent];
    
    if (!responseData) {
        return RESPONSES.unknown[language];
    }
    
    // For intents that take item context (lost, found)
    if (typeof responseData[language] === 'function') {
        return responseData[language](itemType);
    }
    
    return responseData[language];
}

/**
 * Generate quick reply buttons
 */
function generateQuickReplies(intent, language) {
    const replies = [];
    
    const labels = {
        en: {
            reportMissing: '📝 Report Missing',
            reportSighting: '👁️ Report Sighting',
            search: '🔍 Search',
            myReports: '📋 My Reports',
            profile: '👤 Profile',
            settings: '⚙️ Settings',
            contact: '📞 Contact',
            about: 'ℹ️ About',
            home: '🏠 Home'
        },
        ar: {
            reportMissing: '📝 بلاغ مفقود',
            reportSighting: '👁️ بلاغ مشاهدة',
            search: '🔍 بحث',
            myReports: '📋 بلاغاتي',
            profile: '👤 الملف الشخصي',
            settings: '⚙️ الإعدادات',
            contact: '📞 تواصل',
            about: 'ℹ️ عنا',
            home: '🏠 الرئيسية'
        },
        darija: {
            reportMissing: '📝 بلّغ على ضايع',
            reportSighting: '👁️ بلّغ على لقية',
            search: '🔍 قلّب',
            myReports: '📋 بلاغاتي',
            profile: '👤 الحساب',
            settings: '⚙️ الإعدادات',
            contact: '📞 تواصل',
            about: 'ℹ️ علينا',
            home: '🏠 الرئيسية'
        }
    };
    
    const L = labels[language] || labels.en;
    
    // Context-aware quick replies
    switch (intent) {
        case 'lost':
            replies.push({ id: 'rm', text: L.reportMissing, action: 'navigate', route: '/report-missing' });
            replies.push({ id: 'search', text: L.search, action: 'navigate', route: '/' });
            replies.push({ id: 'contact', text: L.contact, action: 'navigate', route: '/contact' });
            break;
        case 'found':
            replies.push({ id: 'rs', text: L.reportSighting, action: 'navigate', route: '/report-sighting' });
            replies.push({ id: 'search', text: L.search, action: 'navigate', route: '/' });
            break;
        case 'search':
            replies.push({ id: 'home', text: L.home, action: 'navigate', route: '/' });
            replies.push({ id: 'rm', text: L.reportMissing, action: 'navigate', route: '/report-missing' });
            break;
        case 'myReports':
            replies.push({ id: 'mr', text: L.myReports, action: 'navigate', route: '/my-report' });
            replies.push({ id: 'home', text: L.home, action: 'navigate', route: '/' });
            break;
        case 'profile':
            replies.push({ id: 'profile', text: L.profile, action: 'navigate', route: '/profile' });
            replies.push({ id: 'settings', text: L.settings, action: 'navigate', route: '/settings' });
            break;
        case 'settings':
            replies.push({ id: 'settings', text: L.settings, action: 'navigate', route: '/settings' });
            replies.push({ id: 'profile', text: L.profile, action: 'navigate', route: '/profile' });
            break;
        case 'contact':
            replies.push({ id: 'contact', text: L.contact, action: 'navigate', route: '/contact' });
            replies.push({ id: 'about', text: L.about, action: 'navigate', route: '/about' });
            break;
        case 'about':
            replies.push({ id: 'about', text: L.about, action: 'navigate', route: '/about' });
            replies.push({ id: 'contact', text: L.contact, action: 'navigate', route: '/contact' });
            break;
        case 'privacy':
            replies.push({ id: 'privacy', text: '🔒 Privacy', action: 'navigate', route: '/privacy' });
            replies.push({ id: 'about', text: L.about, action: 'navigate', route: '/about' });
            break;
        default:
            // Default quick replies for greeting/thanks/unknown
            replies.push({ id: 'rm', text: L.reportMissing, action: 'navigate', route: '/report-missing' });
            replies.push({ id: 'rs', text: L.reportSighting, action: 'navigate', route: '/report-sighting' });
            replies.push({ id: 'search', text: L.search, action: 'navigate', route: '/' });
            replies.push({ id: 'contact', text: L.contact, action: 'navigate', route: '/contact' });
    }
    
    return replies.slice(0, 4);
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

/**
 * POST /api/chat
 * Processes messages locally with smart keyword analysis
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { message, conversationHistory = [] } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        console.log('[Chat API] Processing message locally:', message.substring(0, 50));

        // Detect language
        const language = detectLanguage(message);
        console.log('[Chat API] Detected language:', language);

        // Detect intent
        const intent = detectIntent(message);
        console.log('[Chat API] Detected intent:', intent);

        // Detect item type for context
        const itemType = detectItemType(message);
        if (itemType) {
            console.log('[Chat API] Detected item type:', itemType);
        }

        // Generate response
        const responseData = generateResponse(intent, language, itemType);
        
        // Generate quick replies
        const quickReplies = generateQuickReplies(intent, language);

        return NextResponse.json({
            success: true,
            response: {
                text: responseData.text,
                quickReplies: quickReplies
            },
            debug: {
                intent,
                language,
                itemType
            }
        });

    } catch (error) {
        console.error('[Chat API] Error:', error.message);
        
        return NextResponse.json({
            success: false,
            error: error.message,
            response: {
                text: `Sorry, something went wrong. Please try again or contact support at /contact.

عذراً، حدث خطأ. حاول مرة أخرى أو تواصل معنا.

سماح لينا، وقع مشكل. حاول مرة خرى أو تواصل معانا.`,
                quickReplies: [
                    { id: 'contact', text: '📞 Contact', action: 'navigate', route: '/contact' },
                    { id: 'home', text: '🏠 Home', action: 'navigate', route: '/' }
                ]
            }
        });
    }
}
