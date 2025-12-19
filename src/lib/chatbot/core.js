// =====================================================
// L9ani Chatbot - Core AI Logic
// =====================================================
// This module handles:
// - Language detection (AR, EN, Darija)
// - Intent classification
// - Entity extraction
// - Response generation
// - Cancel/Reset functionality
// =====================================================

// Language detection patterns
const ARABIC_PATTERN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const DARIJA_MARKERS = [
    'كيفاش', 'فين', 'شنو', 'علاش', 'واش', 'ديال', 'ليا', 'ليك',
    'بغيت', 'خصني', 'عندي', 'ماشي', 'هاد', 'داك', 'شي', 'كاين',
    'مكاينش', 'ضاع', 'ضايع', 'تلف', 'لقيت', 'شفت', 'راه', 'دابا',
    'مزيان', 'خايب', 'بزاف', 'شوية', 'يالاه', 'سير', 'آجي',
    'ولدي', 'بنتي', 'راجلي', 'مراتي', 'صاحبي', 'ختي', 'خويا'
];

// Cancel/Reset keywords for interrupting flows
const CANCEL_KEYWORDS = {
    en: ['cancel', 'stop', 'quit', 'exit', 'restart', 'start over', 'never mind', 'nevermind', 'forget it', 'back', 'go back', 'main menu', 'reset'],
    ar: ['إلغاء', 'توقف', 'خروج', 'رجوع', 'إبدأ من جديد', 'ارجع', 'القائمة الرئيسية', 'من البداية'],
    darija: ['كانسيلي', 'وقف', 'خرج', 'رجع', 'بدا من الأول', 'سمح ليا', 'خليها', 'بلاش', 'نسى', 'رجعني', 'لور']
};

// Question type patterns for smarter classification
const QUESTION_PATTERNS = {
    how: {
        en: ['how do', 'how can', 'how to', 'how does', "how's"],
        ar: ['كيف', 'كيفية'],
        darija: ['كيفاش', 'كيف']
    },
    what: {
        en: ['what is', 'what are', "what's", 'what does', 'what do'],
        ar: ['ما هو', 'ما هي', 'ماذا'],
        darija: ['شنو', 'آش', 'اشنو']
    },
    where: {
        en: ['where is', 'where are', 'where can', "where's"],
        ar: ['أين', 'في أي'],
        darija: ['فين', 'فاين']
    },
    when: {
        en: ['when is', 'when can', 'when does', "when's"],
        ar: ['متى', 'إيمتا'],
        darija: ['إمتا', 'وقتاش', 'فوقاش']
    },
    why: {
        en: ['why is', 'why are', 'why do', 'why does', "why's"],
        ar: ['لماذا', 'ليش'],
        darija: ['علاش', 'لاش', 'عله']
    },
    can: {
        en: ['can i', 'can you', 'could i', 'could you', 'is it possible'],
        ar: ['هل يمكن', 'هل أستطيع'],
        darija: ['واش نقدر', 'واش تقدر', 'واش ممكن', 'يقدر']
    }
};

// Intent keywords mapping - expanded with many variations and synonyms
const INTENT_KEYWORDS = {
    create_report: {
        en: [
            // Core actions
            'report', 'create', 'submit', 'file', 'register', 'add', 'make', 'write', 'post',
            // Lost/missing terms
            'lost', 'missing', 'gone', 'disappeared', 'vanished', 'misplaced', 'forgotten',
            // Expressions
            'i lost', 'went missing', 'cant find', "can't find", 'cannot find', 'unable to find',
            'have lost', 'has gone', 'is missing', 'is gone', 'is lost', 'went away',
            'new report', 'i need to report', 'want to report', 'help me report',
            'something missing', 'someone missing', 'my', 'stolen', 'took', 'taken',
            // Questions that indicate report intent
            'how do i report', 'how to report', 'where to report', 'can i report',
            'how can i file', 'want to file', 'need to file', 'report a'
        ],
        ar: [
            'بلاغ', 'أبلغ', 'بلّغ', 'مفقود', 'مفقودة', 'ضائع', 'ضائعة', 'سجل', 'أضف', 'أنشئ',
            'فقدت', 'ضاع', 'ضاعت', 'اختفى', 'اختفت', 'لا أجد', 'لم أجد', 'ضيعت',
            'أريد أن أبلغ', 'كيف أبلغ', 'أين أبلغ', 'راح', 'راحت', 'سرق', 'سرقت',
            'شخص مفقود', 'طفل مفقود', 'ابني ضاع', 'ابنتي ضاعت', 'تلف', 'محفظة'
        ],
        darija: [
            'بلغ', 'بلّغ', 'دير بلاغ', 'ضاع', 'ضاعت', 'ضايع', 'ضايعة', 'تلف', 'تلفت',
            'فقدت', 'ضيعت', 'راح', 'راحت', 'ما لقيتش', 'ما لقيتوش', 'تسرق', 'تشفر',
            'بغيت نبلغ', 'كيفاش نبلغ', 'فين نبلغ', 'خاصني نبلغ',
            'ولدي ضاع', 'بنتي ضاعت', 'تيليفوني ضاع', 'بورطابلي راح', 'بزطامي'
        ]
    },
    search_reports: {
        en: [
            // Search actions
            'search', 'find', 'look', 'looking for', 'browse', 'explore', 'check', 'see',
            // Finding expressions
            'found', 'seen', 'spotted', 'discovered', 'noticed',
            // Questions
            'where', 'where is', 'anyone', 'have you seen', 'did anyone', 'has anyone',
            'looking for', 'trying to find', 'searching for', 'need to find',
            // View expressions
            'view reports', 'show me', 'show reports', 'display', 'list', 'all reports',
            'see reports', 'check reports', 'any reports', 'reports about', 'reports for',
            // Descriptive searches
            'black cat', 'white dog', 'small child', 'old man', 'young woman',
            'near', 'around', 'close to', 'in the area'
        ],
        ar: [
            'بحث', 'أبحث', 'ابحث', 'وجدت', 'شاهدت', 'رأيت', 'لاحظت',
            'أين', 'هل شاهد', 'هل رأى', 'هل وجد', 'من رأى', 'من شاهد',
            'عرض', 'أرني', 'أظهر', 'البلاغات', 'قائمة', 'كل البلاغات',
            'أبحث عن', 'أقلب على', 'فتش', 'دور على', 'قرب', 'بالقرب', 'في منطقة'
        ],
        darija: [
            'قلب', 'بحث', 'لقيت', 'شفت', 'لقاو', 'صبت',
            'فين', 'واش شي حد', 'شكون شاف', 'شكون لقا', 'واش كاين',
            'وريني', 'شوفلي', 'البلاغات', 'كلشي', 'جميع',
            'كنقلب على', 'باغي نلقى', 'قريب', 'حدا', 'فالمنطقة'
        ]
    },
    check_status: {
        en: [
            'status', 'check', 'my report', 'my reports', 'update', 'updates', 'progress',
            'what happened', 'any news', 'news on', 'updates on', 'track', 'tracking',
            'follow up', 'following', 'how is my', 'where is my report', 'did anyone respond',
            'any response', 'any match', 'any leads', 'notifications', 'history'
        ],
        ar: [
            'حالة', 'بلاغي', 'بلاغاتي', 'تحديث', 'تحديثات', 'تقدم',
            'ماذا حدث', 'أين وصل', 'أخبار', 'متابعة', 'تتبع',
            'هل رد أحد', 'هل من جديد', 'أي تطور', 'إشعارات', 'سجل'
        ],
        darija: [
            'كيفاش', 'بلاغي', 'البلاغ ديالي', 'شنو وقع', 'فين وصل',
            'شي جديد', 'شي خبر', 'واش جاوبو', 'واش لقاو شي حاجة',
            'تابع', 'نوتيفيكاسيون', 'الإشعارات'
        ]
    },
    platform_help: {
        en: [
            // Help requests
            'help', 'assist', 'support', 'guide', 'guidance', 'tutorial', 'instructions',
            // Questions
            'how to', 'how do i', 'how does', 'how can', 'what is', 'what are', 'what does',
            'explain', 'tell me', 'teach me', 'show me how',
            // About platform
            'about', 'works', 'working', 'use', 'using', 'steps', 'process',
            'features', 'options', 'commands', 'what can you do', 'what can i do',
            // Problems
            'problem', 'issue', 'stuck', 'confused', 'dont understand', "don't understand",
            'not working', 'help me', 'i need help', 'can you help'
        ],
        ar: [
            'مساعدة', 'ساعدني', 'كيف', 'كيفية', 'شرح', 'اشرح', 'دليل', 'إرشاد',
            'ما هو', 'ما هي', 'ماذا', 'علمني', 'فهمني', 'وضح',
            'خطوات', 'طريقة', 'استخدام', 'كيف أستخدم', 'ما الذي',
            'دعم', 'مشكلة', 'لا أفهم', 'أحتاج مساعدة', 'عندي سؤال'
        ],
        darija: [
            'عاوني', 'عاونني', 'كيفاش', 'شنو هو', 'شنو هي', 'فهمني', 'شرح لي',
            'وريني كيفاش', 'كيف نستعمل', 'شنو الطريقة', 'الخطوات',
            'مشكل', 'ما فهمتش', 'محتاج مساعدة', 'سؤال', 'باغي نفهم'
        ]
    },
    greeting: {
        en: [
            'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening',
            'yo', 'hiya', 'howdy', 'sup', "what's up", 'whats up', 'morning', 'evening',
            'hi there', 'hello there', 'hey there', 'anyone there', 'is anyone there'
        ],
        ar: [
            'مرحبا', 'أهلا', 'السلام عليكم', 'سلام', 'صباح الخير', 'مساء الخير',
            'هلا', 'أهلين', 'تحية', 'صباح النور', 'مساء النور'
        ],
        darija: [
            'سلام', 'لاباس', 'أهلا', 'كيداير', 'كيدايرة', 'كيدايرين',
            'صباح الخير', 'مسا الخير', 'واش لاباس', 'آش خبارك', 'لاباس عليك'
        ]
    },
    emergency: {
        en: [
            'urgent', 'emergency', 'police', 'help me', 'danger', 'critical', 'immediately',
            'kidnapped', 'abducted', 'stolen', 'thief', 'robbery', 'violence', 'attack',
            'life threatening', 'call police', 'need police', 'crime', 'dangerous',
            'right now', 'asap', 'quickly', 'hurry', 'urgent help', 'scared', 'afraid'
        ],
        ar: [
            'طوارئ', 'عاجل', 'شرطة', 'ساعدوني', 'خطر', 'حرج', 'فورا',
            'خطف', 'اختطاف', 'سرقة', 'لص', 'جريمة', 'اعتداء', 'خطير',
            'حياة', 'اتصل بالشرطة', 'خائف', 'خائفة', 'بسرعة'
        ],
        darija: [
            'بالزربة', 'ضروري', 'بوليس', 'عاوني', 'خطير', 'دغية',
            'تشفر', 'تسرق', 'شفار', 'خطاف', 'جريمة', 'خايف', 'خايفة',
            'عيط للبوليس', 'بالعجل', 'فيسع', 'الحالة خايبة'
        ]
    },
    thanks: {
        en: [
            'thank', 'thanks', 'thank you', 'thx', 'ty', 'appreciate', 'grateful',
            'helpful', 'great', 'awesome', 'perfect', 'wonderful', 'excellent',
            'good job', 'well done', 'nice', 'cool', 'thanks a lot', 'many thanks'
        ],
        ar: [
            'شكرا', 'شكراً', 'جزاك الله', 'جزاكم الله', 'ممتن', 'ممتنة',
            'بارك الله', 'أحسنت', 'ممتاز', 'رائع', 'جميل'
        ],
        darija: [
            'شكرا', 'الله يخليك', 'الله يحفظك', 'بارك الله فيك',
            'تبارك الله', 'مزيان', 'واعر', 'نيشان'
        ]
    },
    goodbye: {
        en: [
            'bye', 'goodbye', 'good bye', 'see you', 'later', 'take care', 'good night',
            'farewell', 'cya', 'ttyl', 'gotta go', 'leaving', 'exit', 'close'
        ],
        ar: [
            'مع السلامة', 'وداعا', 'إلى اللقاء', 'تصبح على خير', 'باي'
        ],
        darija: [
            'بسلامة', 'تهلا فراسك', 'الله يسهل', 'نشوفك', 'باي', 'الله يعاونك'
        ]
    },
    found_item: {
        en: [
            'found', 'i found', 'we found', 'someone found', 'discovered', 'spotted',
            'saw', 'i saw', 'picked up', 'came across', 'stumbled upon',
            'found a', 'found someone', 'found something', 'there is a', 'i have found'
        ],
        ar: [
            'وجدت', 'لقيت', 'عثرت', 'شاهدت', 'رأيت', 'وجدنا', 'لقينا', 'صادفت'
        ],
        darija: [
            'لقيت', 'صبت', 'شفت', 'لقاو', 'صابو', 'شافو', 'لقينا', 'جات عندي'
        ]
    }
};

// Report type detection
const REPORT_TYPE_KEYWORDS = {
    person: {
        en: ['person', 'child', 'kid', 'boy', 'girl', 'man', 'woman', 'father', 'mother', 'son', 'daughter', 'brother', 'sister', 'elderly', 'grandpa', 'grandma', 'baby', 'toddler', 'teenager', 'adult', 'relative', 'family member'],
        ar: ['شخص', 'طفل', 'ولد', 'بنت', 'رجل', 'امرأة', 'أب', 'أم', 'ابن', 'ابنة', 'أخ', 'أخت', 'مسن', 'جد', 'جدة', 'رضيع'],
        darija: ['واحد', 'درّي', 'بنت', 'راجل', 'مرا', 'بّا', 'مّا', 'ولدي', 'بنتي', 'خويا', 'ختي', 'شيباني', 'عجوز']
    },
    pet: {
        en: ['pet', 'dog', 'cat', 'bird', 'animal', 'puppy', 'kitten', 'parrot', 'rabbit', 'hamster'],
        ar: ['حيوان', 'كلب', 'قط', 'طائر', 'أرنب', 'ببغاء'],
        darija: ['حيوان', 'كلب', 'مش', 'قطوس', 'طير', 'قنية']
    },
    document: {
        en: ['document', 'id', 'passport', 'license', 'card', 'certificate', 'papers', 'wallet', 'driving license'],
        ar: ['وثيقة', 'هوية', 'جواز', 'رخصة', 'بطاقة', 'شهادة', 'أوراق', 'محفظة'],
        darija: ['ورقة', 'كارطة', 'باسبور', 'بيرمي', 'وراق', 'بزطام']
    },
    electronics: {
        en: ['phone', 'laptop', 'computer', 'tablet', 'camera', 'mobile', 'iphone', 'samsung', 'device'],
        ar: ['هاتف', 'حاسوب', 'لوحي', 'كاميرا', 'جوال', 'موبايل'],
        darija: ['تيليفون', 'بورطابل', 'كومبيوتر', 'طابليط']
    },
    vehicle: {
        en: ['car', 'vehicle', 'motorcycle', 'bike', 'bicycle', 'scooter', 'truck', 'van'],
        ar: ['سيارة', 'مركبة', 'دراجة', 'شاحنة', 'دراجة نارية'],
        darija: ['طوموبيل', 'موطور', 'بيكالا', 'تريبورتور']
    }
};

// City name variations (Moroccan cities)
const MOROCCAN_CITIES = {
    'casablanca': ['casablanca', 'casa', 'الدار البيضاء', 'كازا', 'كازابلانكا'],
    'rabat': ['rabat', 'الرباط', 'رباط'],
    'marrakech': ['marrakech', 'marrakesh', 'مراكش'],
    'fes': ['fes', 'fez', 'فاس', 'فاس'],
    'tangier': ['tangier', 'tanger', 'طنجة'],
    'agadir': ['agadir', 'أكادير', 'أڭادير'],
    'meknes': ['meknes', 'meknas', 'مكناس'],
    'oujda': ['oujda', 'وجدة'],
    'kenitra': ['kenitra', 'القنيطرة'],
    'tetouan': ['tetouan', 'tetuan', 'تطوان'],
    'safi': ['safi', 'آسفي', 'أسفي'],
    'el jadida': ['el jadida', 'الجديدة', 'لجديدة'],
    'beni mellal': ['beni mellal', 'beni-mellal', 'بني ملال'],
    'nador': ['nador', 'الناظور', 'الناضور'],
    'taza': ['taza', 'تازة'],
    'settat': ['settat', 'سطات'],
    'mohammedia': ['mohammedia', 'المحمدية'],
    'khouribga': ['khouribga', 'خريبكة'],
    'laayoune': ['laayoune', 'العيون'],
    'dakhla': ['dakhla', 'الداخلة']
};

/**
 * Detect the language of a message
 * @param {string} text - The input text
 * @returns {string} - 'en', 'ar', or 'darija'
 */
export function detectLanguage(text) {
    const lowerText = text.toLowerCase();
    
    // Check for Arabic script
    if (ARABIC_PATTERN.test(text)) {
        // Check for Darija markers
        const darijaCount = DARIJA_MARKERS.filter(marker => 
            text.includes(marker)
        ).length;
        
        if (darijaCount >= 1) {
            return 'darija';
        }
        return 'ar';
    }
    
    return 'en';
}

/**
 * Check if message is a cancel/reset request
 * @param {string} text - The input text
 * @param {string} language - Detected language
 * @returns {boolean}
 */
export function isCancelRequest(text, language) {
    const lowerText = text.toLowerCase().trim();
    
    // Check all language cancel keywords
    for (const lang of ['en', 'ar', 'darija']) {
        for (const keyword of CANCEL_KEYWORDS[lang]) {
            if (lowerText === keyword.toLowerCase() || lowerText.includes(keyword.toLowerCase())) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Calculate string similarity using Levenshtein distance (0 to 1, where 1 is exact match)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score 0-1
 */
function calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    
    // Check if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
        return minLen / maxLen;
    }
    
    // Levenshtein distance calculation
    const matrix = [];
    for (let i = 0; i <= s2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
        for (let j = 1; j <= s1.length; j++) {
            if (s2[i - 1] === s1[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    const distance = matrix[s2.length][s1.length];
    return 1 - (distance / maxLen);
}

/**
 * Check if a word approximately matches a keyword (fuzzy match)
 * @param {string} word - Word to check
 * @param {string} keyword - Keyword to match against
 * @param {number} threshold - Minimum similarity threshold
 * @returns {number} - Match score (0 if no match)
 */
function fuzzyMatchKeyword(word, keyword, threshold = 0.7) {
    const wordLower = word.toLowerCase();
    const keywordLower = keyword.toLowerCase();
    
    // Exact match
    if (wordLower === keywordLower) return 1;
    
    // Contains check
    if (wordLower.includes(keywordLower)) return 0.9;
    if (keywordLower.includes(wordLower) && wordLower.length >= 3) return 0.85;
    
    // Skip fuzzy for very short strings
    if (wordLower.length < 3 || keywordLower.length < 3) return 0;
    
    const similarity = calculateSimilarity(wordLower, keywordLower);
    return similarity >= threshold ? similarity : 0;
}

/**
 * Normalize text for better matching
 * @param {string} text - Input text
 * @returns {string} - Normalized text
 */
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract n-grams from text (for phrase matching)
 * @param {string} text - Input text
 * @returns {string[]} - Array of tokens and n-grams
 */
function extractNgrams(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const ngrams = [];
    
    // Add individual words
    ngrams.push(...words);
    
    // Add 2-grams and 3-grams for phrase matching
    for (let i = 0; i < words.length - 1; i++) {
        ngrams.push(words.slice(i, i + 2).join(' '));
        if (i < words.length - 2) {
            ngrams.push(words.slice(i, i + 3).join(' '));
        }
    }
    
    return ngrams;
}

/**
 * Detect question type for better understanding
 * @param {string} text - The input text
 * @param {string} language - Detected language
 * @returns {string|null} - Question type or null
 */
function detectQuestionType(text, language) {
    const lowerText = text.toLowerCase();
    
    for (const [questionType, patterns] of Object.entries(QUESTION_PATTERNS)) {
        const langPatterns = patterns[language] || patterns.en;
        for (const pattern of langPatterns) {
            if (lowerText.includes(pattern.toLowerCase())) {
                return questionType;
            }
        }
    }
    return null;
}

/**
 * Classify the intent of a message with improved fuzzy matching and semantic analysis
 * @param {string} text - The input text
 * @param {string} language - Detected language
 * @param {Object} context - Current conversation context
 * @returns {Object} - { intent: string, confidence: number, isQuestion: boolean, questionType: string|null }
 */
export function classifyIntent(text, language, context = {}) {
    const normalizedText = normalizeText(text);
    const messageTokens = extractNgrams(normalizedText);
    const scores = {};
    
    // Check for cancel first
    if (isCancelRequest(text, language)) {
        return {
            intent: 'cancel',
            confidence: 1.0,
            isQuestion: false,
            questionType: null
        };
    }
    
    // Detect if it's a question
    const questionType = detectQuestionType(text, language);
    const isQuestion = questionType !== null || text.includes('?') || text.includes('؟');
    
    // Initialize scores
    Object.keys(INTENT_KEYWORDS).forEach(intent => {
        scores[intent] = 0;
    });
    
    // Process each intent with fuzzy matching
    for (const [intent, langKeywords] of Object.entries(INTENT_KEYWORDS)) {
        let totalScore = 0;
        
        // Get keywords for detected language plus English as fallback
        const keywordsToCheck = [
            ...(langKeywords[language] || []),
            ...(language !== 'en' ? (langKeywords.en || []) : []),
            ...(language === 'ar' ? (langKeywords.darija || []) : []),
            ...(language === 'darija' ? (langKeywords.ar || []) : [])
        ];
        
        const matchedKeywords = new Set();
        
        for (const keyword of keywordsToCheck) {
            if (matchedKeywords.has(keyword.toLowerCase())) continue;
            
            const keywordLower = keyword.toLowerCase();
            
            // Check for exact phrase match in full normalized text
            if (normalizedText.includes(keywordLower)) {
                // Longer keyword matches are more valuable
                const lengthBonus = Math.min(keywordLower.split(' ').length * 0.5, 2);
                totalScore += 1.5 + lengthBonus;
                matchedKeywords.add(keywordLower);
                continue;
            }
            
            // Fuzzy match against each token/ngram
            for (const token of messageTokens) {
                const similarity = fuzzyMatchKeyword(token, keywordLower, 0.75);
                if (similarity > 0) {
                    const scoreToAdd = similarity * (token.split(' ').length > 1 ? 1.2 : 0.8);
                    totalScore += scoreToAdd;
                    matchedKeywords.add(keywordLower);
                    break;
                }
            }
        }
        
        // Apply intent-specific boosting based on regex patterns
        const intentPatterns = {
            create_report: [/i (lost|miss|can'?t find)/i, /went missing/i, /(report|create|submit).*(lost|missing)/i, /ضاع|فقدت|تلف/, /بغيت نبلغ/],
            search_reports: [/where (is|are|can)/i, /have you seen/i, /looking for/i, /أين|فين|شفت/, /كنقلب/],
            platform_help: [/how (do|can|to)/i, /what (is|are|does)/i, /explain/i, /كيف|شنو|شرح/, /كيفاش/],
            check_status: [/my report/i, /status/i, /update/i, /بلاغي|حالة/, /البلاغ ديالي/],
            emergency: [/urgent|emergency|police|danger/i, /طوارئ|خطر|شرطة/, /بوليس|خطير/]
        };
        
        if (intentPatterns[intent]) {
            for (const pattern of intentPatterns[intent]) {
                if (pattern.test(text)) {
                    totalScore *= 1.5;
                    break;
                }
            }
        }
        
        scores[intent] = totalScore;
    }
    
    // Context-aware boosting for short messages
    const wordCount = normalizedText.split(' ').length;
    if (wordCount <= 2) {
        if (scores.greeting) scores.greeting *= 1.3;
        if (scores.goodbye) scores.goodbye *= 1.3;
        if (scores.thanks) scores.thanks *= 1.3;
    }
    
    // Question word boosting
    const questionWords = ['how', 'what', 'where', 'why', 'when', 'كيف', 'ماذا', 'أين', 'لماذا', 'شنو', 'فين', 'علاش', 'كيفاش'];
    if (questionWords.some(qw => normalizedText.includes(qw))) {
        if (scores.platform_help) scores.platform_help *= 1.2;
    }
    
    // Context mode boosting
    if (context.mode === 'report_creation') {
        scores.create_report = (scores.create_report || 0) + 0.5;
    } else if (context.mode === 'search') {
        scores.search_reports = (scores.search_reports || 0) + 0.5;
    }
    
    // If it's a "how" question and no clear intent, boost help
    if (questionType === 'how' && Math.max(...Object.values(scores)) < 1) {
        scores.platform_help = (scores.platform_help || 0) + 1;
    }
    
    // Find highest scoring intent
    let maxIntent = 'unknown';
    let maxScore = 0;
    
    for (const [intent, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            maxIntent = intent;
        }
    }
    
    // Calculate confidence (0-1)
    const confidence = maxScore > 0 ? Math.min(maxScore / 5, 1) : 0;
    
    // Minimum threshold for valid intent
    if (maxScore < 0.5) {
        return {
            intent: 'unknown',
            confidence: 0,
            isQuestion: isQuestion,
            questionType: questionType
        };
    }
    
    return {
        intent: maxIntent,
        confidence: confidence,
        isQuestion: isQuestion,
        questionType: questionType
    };
}

/**
 * Extract report type from message
 * @param {string} text - The input text
 * @param {string} language - Detected language
 * @returns {string|null} - Report type or null
 */
export function extractReportType(text, language) {
    const lowerText = text.toLowerCase();
    
    for (const [reportType, keywords] of Object.entries(REPORT_TYPE_KEYWORDS)) {
        const langKeywords = keywords[language] || keywords.en;
        
        for (const keyword of langKeywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                return reportType;
            }
        }
    }
    
    return null;
}

/**
 * Extract city from message
 * @param {string} text - The input text
 * @returns {string|null} - Normalized city name or null
 */
export function extractCity(text) {
    const lowerText = text.toLowerCase();
    
    for (const [normalizedCity, variations] of Object.entries(MOROCCAN_CITIES)) {
        for (const variation of variations) {
            if (lowerText.includes(variation.toLowerCase())) {
                return normalizedCity;
            }
        }
    }
    
    return null;
}

/**
 * Extract entities from a message
 * @param {string} text - The input text
 * @param {string} language - Detected language
 * @returns {Object} - Extracted entities
 */
export function extractEntities(text, language) {
    return {
        reportType: extractReportType(text, language),
        city: extractCity(text),
        // Add more entity extraction as needed
    };
}

/**
 * Generate appropriate response based on intent and context
 * @param {Object} params - Parameters
 * @param {string} params.intent - Detected intent
 * @param {string} params.language - Detected language
 * @param {Object} params.entities - Extracted entities
 * @param {Object} params.context - Session context
 * @param {Object} params.user - User object (if authenticated)
 * @param {boolean} params.isQuestion - Whether message is a question
 * @param {string} params.questionType - Type of question
 * @returns {Object} - Response object
 */
export function generateResponse({ intent, language, entities, context, user, isQuestion, questionType }) {
    const responses = {
        greeting: {
            en: `Hello${user ? `, ${user.username || 'there'}` : ''}! 👋 I'm here to help you with L9ani. What would you like to do?\n\n• Report something missing\n• Search existing reports\n• Check your report status\n• Get help with the platform`,
            ar: `مرحباً${user ? ` ${user.username || ''}` : ''}! 👋 أنا هنا لمساعدتك في لقاني. ماذا تريد أن تفعل؟\n\n• الإبلاغ عن شيء مفقود\n• البحث في البلاغات الموجودة\n• التحقق من حالة بلاغك\n• الحصول على مساعدة`,
            darija: `سلام${user ? ` ${user.username || ''}` : ''}! 👋 أنا هنا باش نعاونك فـ لقاني. شنو بغيتي دير؟\n\n• بلغ على شي حاجة ضايعة\n• قلب فالبلاغات اللي كاينين\n• شوف كيفاش بلاغك\n• خذ المساعدة`
        },
        create_report: {
            en: `I'll help you create a report. What type of report would you like to create?\n\n• Missing Person 👤\n• Lost Pet 🐾\n• Lost Document 📄\n• Lost Electronics 📱\n• Lost Vehicle 🚗\n• Other Item`,
            ar: `سأساعدك في إنشاء بلاغ. ما نوع البلاغ الذي تريد إنشاءه؟\n\n• شخص مفقود 👤\n• حيوان مفقود 🐾\n• وثيقة مفقودة 📄\n• جهاز إلكتروني 📱\n• مركبة مفقودة 🚗\n• غرض آخر`,
            darija: `غادي نعاونك دير بلاغ. شنو نوع البلاغ اللي بغيتي ديرو؟\n\n• واحد ضايع 👤\n• حيوان ضايع 🐾\n• ورقة ضايعة 📄\n• تيليفون/جهاز 📱\n• طوموبيل/موطور 🚗\n• شي حاجة خرا`
        },
        search_reports: {
            en: `I can help you search for reports. What are you looking for? You can describe it naturally, for example:\n\n"Black cat lost near Casablanca"\n"Child missing in Marrakech yesterday"`,
            ar: `يمكنني مساعدتك في البحث عن البلاغات. عن ماذا تبحث؟ يمكنك وصفه بشكل طبيعي، مثلاً:\n\n"قط أسود مفقود قرب الدار البيضاء"\n"طفل مفقود في مراكش أمس"`,
            darija: `نقدر نعاونك تقلب على البلاغات. على شنو كتقلب؟ قول لي بالعربية ديالك، مثلاً:\n\n"مش كحل ضاع قريب من كازا"\n"درّي ضاع فمراكش البارح"`
        },
        check_status: {
            en: user 
                ? `I'll help you check your report status. Let me look up your reports...`
                : `To check your report status, you'll need to log in first. Would you like to log in now?`,
            ar: user
                ? `سأساعدك في التحقق من حالة بلاغك. دعني أبحث عن بلاغاتك...`
                : `للتحقق من حالة بلاغك، تحتاج إلى تسجيل الدخول أولاً. هل تريد تسجيل الدخول الآن؟`,
            darija: user
                ? `غادي نعاونك تشوف كيفاش بلاغك. خليني نقلب على البلاغات ديالك...`
                : `باش تشوف كيفاش بلاغك، خاصك تسجل الدخول أولاً. بغيتي تسجل دابا؟`
        },
        platform_help: {
            en: `I'm happy to help! Here are some things I can assist with:\n\n📝 **Creating Reports** - Step-by-step guidance\n🔍 **Searching** - Find reports using natural language\n📊 **Your Reports** - Check status and updates\n❓ **General Questions** - How the platform works\n\nWhat would you like help with?`,
            ar: `يسعدني مساعدتك! إليك بعض الأشياء التي يمكنني مساعدتك بها:\n\n📝 **إنشاء البلاغات** - إرشاد خطوة بخطوة\n🔍 **البحث** - ابحث باللغة الطبيعية\n📊 **بلاغاتك** - تحقق من الحالة والتحديثات\n❓ **أسئلة عامة** - كيف تعمل المنصة\n\nبماذا تريد المساعدة؟`,
            darija: `مرحبا بيك! هاشنو نقدر نعاونك فيه:\n\n📝 **دير بلاغ** - نوريك خطوة بخطوة\n🔍 **قلب** - لقى البلاغات بالدارجة\n📊 **البلاغات ديالك** - شوف الحالة\n❓ **أسئلة** - كيفاش خدامة المنصة\n\nشنو بغيتي نعاونك فيه؟`
        },
        emergency: {
            en: `⚠️ **If this is an emergency, please contact the authorities immediately:**\n\n🚨 Police: 19\n🚑 Emergency: 15\n🏥 SAMU: 141\n\nI can still help you create a report on L9ani to spread awareness. Would you like to continue?`,
            ar: `⚠️ **إذا كانت هذه حالة طوارئ، يرجى الاتصال بالسلطات فوراً:**\n\n🚨 الشرطة: 19\n🚑 الطوارئ: 15\n🏥 الإسعاف: 141\n\nيمكنني مساعدتك في إنشاء بلاغ على لقاني لنشر الوعي. هل تريد المتابعة؟`,
            darija: `⚠️ **إلا كانت حالة طوارئ، عيط للسلطات دابا:**\n\n🚨 البوليس: 19\n🚑 الطوارئ: 15\n🏥 الإسعاف: 141\n\nنقدر نعاونك دير بلاغ فـ لقاني باش الناس يعرفو. بغيتي نكملو؟`
        },
        cancel: {
            en: `No problem! I've cancelled the current operation. 🔄\n\nWhat would you like to do instead?\n\n• Report something missing\n• Search reports\n• Get help`,
            ar: `لا مشكلة! لقد ألغيت العملية الحالية. 🔄\n\nماذا تريد أن تفعل بدلاً من ذلك؟\n\n• الإبلاغ عن مفقود\n• البحث في البلاغات\n• الحصول على مساعدة`,
            darija: `ما كاين باس! كانسيليت اللي كنتي كدير. 🔄\n\nشنو بغيتي دير دابا؟\n\n• بلغ على شي حاجة ضايعة\n• قلب على البلاغات\n• عاوني`
        },
        thanks: {
            en: `You're welcome! 😊 Is there anything else I can help you with?`,
            ar: `على الرحب والسعة! 😊 هل هناك شيء آخر يمكنني مساعدتك به؟`,
            darija: `لا شكر على واجب! 😊 شي حاجة خرا نقدر نعاونك فيها؟`
        },
        goodbye: {
            en: `Goodbye! Take care and good luck! 👋 If you need anything, I'm always here.`,
            ar: `مع السلامة! اعتنِ بنفسك وحظاً موفقاً! 👋 إذا احتجت أي شيء، أنا هنا دائماً.`,
            darija: `بسلامة! تهلا فراسك والله يسهل! 👋 إلا حتاجيتي شي حاجة، أنا هنا.`
        },
        found_item: {
            en: `That's great that you found something! 🎉 You can:\n\n• **Report the found item** - Help reunite it with its owner\n• **Search reports** - See if someone is looking for it\n\nWhat would you like to do?`,
            ar: `هذا رائع أنك وجدت شيئاً! 🎉 يمكنك:\n\n• **الإبلاغ عن الغرض الموجود** - ساعد في إعادته لصاحبه\n• **البحث في البلاغات** - شوف إذا شي حد كيقلب عليه\n\nماذا تريد أن تفعل؟`,
            darija: `مزيان أنك لقيتي شي حاجة! 🎉 تقدر:\n\n• **بلغ على اللي لقيتي** - عاون مولاها يلقاها\n• **قلب فالبلاغات** - شوف واش شي حد كيقلب عليها\n\nشنو بغيتي دير؟`
        },
        unknown: {
            en: `I'm not sure I understood that. Could you please rephrase? I can help you:\n\n• Report something missing\n• Search for existing reports\n• Get help with the platform\n\n💡 **Tip:** Type "cancel" anytime to start over.`,
            ar: `لم أفهم ذلك جيداً. هل يمكنك إعادة الصياغة؟ يمكنني مساعدتك في:\n\n• الإبلاغ عن شيء مفقود\n• البحث في البلاغات الموجودة\n• الحصول على مساعدة\n\n💡 **نصيحة:** اكتب "إلغاء" في أي وقت للبدء من جديد.`,
            darija: `ما فهمتش مزيان. عاود قول لي بطريقة خرا؟ نقدر نعاونك فـ:\n\n• بلغ على شي حاجة ضايعة\n• قلب على البلاغات\n• خذ المساعدة\n\n💡 **نصيحة:** كتب "كانسيلي" ولا "رجع" باش تبدا من الأول.`
        }
    };
    
    const responseText = responses[intent]?.[language] || responses[intent]?.en || responses.unknown.en;
    
    // Generate quick replies based on intent
    const quickReplies = generateQuickReplies(intent, language, context);
    
    return {
        text: responseText,
        quickReplies,
        action: getActionForIntent(intent, entities),
        requiresAuth: intent === 'check_status' && !user,
        shouldResetContext: intent === 'cancel'
    };
}

/**
 * Generate quick reply buttons based on intent and context
 */
function generateQuickReplies(intent, language, context = {}) {
    const replies = {
        greeting: [
            { text: { en: 'Report missing', ar: 'إبلاغ عن مفقود', darija: 'بلغ' }, action: 'create_report' },
            { text: { en: 'Search reports', ar: 'بحث', darija: 'قلب' }, action: 'search_reports' },
            { text: { en: 'Help', ar: 'مساعدة', darija: 'عاوني' }, action: 'platform_help' }
        ],
        create_report: [
            { text: { en: 'Person', ar: 'شخص', darija: 'واحد' }, action: 'select_type', data: { type: 'person' } },
            { text: { en: 'Pet', ar: 'حيوان', darija: 'حيوان' }, action: 'select_type', data: { type: 'pet' } },
            { text: { en: 'Document', ar: 'وثيقة', darija: 'ورقة' }, action: 'select_type', data: { type: 'document' } },
            { text: { en: 'Electronics', ar: 'جهاز', darija: 'تيليفون' }, action: 'select_type', data: { type: 'electronics' } },
            { text: { en: 'Vehicle', ar: 'مركبة', darija: 'طوموبيل' }, action: 'select_type', data: { type: 'vehicle' } },
            { text: { en: 'Other', ar: 'آخر', darija: 'حاجة خرا' }, action: 'select_type', data: { type: 'other' } }
        ],
        search_reports: [
            { text: { en: 'Persons', ar: 'أشخاص', darija: 'ناس' }, action: 'search', data: { type: 'person' } },
            { text: { en: 'Pets', ar: 'حيوانات', darija: 'حيوانات' }, action: 'search', data: { type: 'pet' } },
            { text: { en: 'Documents', ar: 'وثائق', darija: 'وراق' }, action: 'search', data: { type: 'document' } },
            { text: { en: 'All types', ar: 'الكل', darija: 'كلشي' }, action: 'search', data: {} }
        ],
        cancel: [
            { text: { en: 'Report missing', ar: 'إبلاغ عن مفقود', darija: 'بلغ' }, action: 'create_report' },
            { text: { en: 'Search reports', ar: 'بحث', darija: 'قلب' }, action: 'search_reports' },
            { text: { en: 'Help', ar: 'مساعدة', darija: 'عاوني' }, action: 'platform_help' }
        ],
        thanks: [
            { text: { en: 'Report missing', ar: 'إبلاغ عن مفقود', darija: 'بلغ' }, action: 'create_report' },
            { text: { en: 'Search reports', ar: 'بحث', darija: 'قلب' }, action: 'search_reports' },
            { text: { en: "That's all", ar: 'هذا كل شيء', darija: 'هادشي كلشي' }, action: 'goodbye' }
        ],
        goodbye: [],
        found_item: [
            { text: { en: 'Report found item', ar: 'بلغ عن موجود', darija: 'بلغ على اللي لقيت' }, action: 'create_report' },
            { text: { en: 'Search reports', ar: 'بحث في البلاغات', darija: 'قلب فالبلاغات' }, action: 'search_reports' }
        ],
        unknown: [
            { text: { en: 'Report missing', ar: 'إبلاغ', darija: 'بلغ' }, action: 'create_report' },
            { text: { en: 'Search', ar: 'بحث', darija: 'قلب' }, action: 'search_reports' },
            { text: { en: 'Help', ar: 'مساعدة', darija: 'عاوني' }, action: 'platform_help' }
        ]
    };
    
    let intentReplies = replies[intent] || replies.unknown;
    
    // Add cancel option if user is in a flow (report creation or search)
    if (context.mode === 'report_creation' || context.mode === 'search') {
        intentReplies = [
            ...intentReplies,
            { text: { en: '❌ Cancel', ar: '❌ إلغاء', darija: '❌ كانسيلي' }, action: 'cancel' }
        ];
    }
    
    return intentReplies.map(reply => ({
        text: reply.text[language] || reply.text.en,
        action: reply.action,
        data: reply.data
    }));
}

/**
 * Get navigation action based on intent
 */
function getActionForIntent(intent, entities) {
    switch (intent) {
        case 'create_report':
            return {
                type: 'navigate',
                route: '/report-missing',
                params: entities.reportType ? { type: entities.reportType } : {}
            };
        case 'search_reports':
            return {
                type: 'search',
                params: {
                    reportType: entities.reportType,
                    city: entities.city
                }
            };
        case 'check_status':
            return {
                type: 'navigate',
                route: '/my-report'
            };
        case 'emergency':
            return {
                type: 'show_emergency_contacts'
            };
        default:
            return null;
    }
}

/**
 * Process a user message and generate a response
 * @param {string} message - User's message
 * @param {Object} context - Session context
 * @param {Object} user - User object (if authenticated)
 * @returns {Object} - Full response object
 */
export function processMessage(message, context = {}, user = null) {
    // Detect language
    const language = detectLanguage(message);
    
    // Classify intent with context awareness
    const { intent, confidence, isQuestion, questionType } = classifyIntent(message, language, context);
    
    // Extract entities
    const entities = extractEntities(message, language);
    
    // Generate response
    const response = generateResponse({
        intent,
        language,
        entities,
        context,
        user,
        isQuestion,
        questionType
    });
    
    return {
        language,
        intent,
        confidence,
        entities,
        response,
        isQuestion,
        questionType
    };
}
