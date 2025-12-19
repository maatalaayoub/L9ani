// =====================================================
// L9ani Chatbot - Report Search Engine
// =====================================================
// This module handles natural language search across reports
// =====================================================

import { supabaseAdmin } from '@/lib/supabase';
import { detectLanguage, extractCity, extractReportType } from './core';

// Search configuration
const MAX_RESULTS = 10;
const MIN_SEARCH_LENGTH = 2;

/**
 * Parse a natural language search query into structured parameters
 * @param {string} query - Natural language query
 * @returns {Object} - Parsed search parameters
 */
export function parseSearchQuery(query) {
    const language = detectLanguage(query);
    const lowerQuery = query.toLowerCase();
    
    // Extract known entities
    const reportType = extractReportType(query, language);
    const city = extractCity(query);
    
    // Extract time-related terms
    const timeParams = extractTimeParams(query, language);
    
    // Extract color mentions
    const color = extractColor(query, language);
    
    // Extract keywords (remaining meaningful words)
    const keywords = extractKeywords(query, language);
    
    return {
        reportType,
        city,
        ...timeParams,
        color,
        keywords,
        originalQuery: query,
        language
    };
}

/**
 * Extract time-related parameters from query
 */
function extractTimeParams(query, language) {
    const lowerQuery = query.toLowerCase();
    const now = new Date();
    
    const timePatterns = {
        today: {
            en: ['today', 'this morning', 'this evening'],
            ar: ['اليوم', 'هذا الصباح', 'هذا المساء'],
            darija: ['اليوم', 'هاد الصباح', 'هاد العشية']
        },
        yesterday: {
            en: ['yesterday'],
            ar: ['أمس', 'البارحة'],
            darija: ['البارح', 'مبارح']
        },
        thisWeek: {
            en: ['this week', 'few days ago', 'recent', 'recently'],
            ar: ['هذا الأسبوع', 'مؤخراً', 'قبل أيام'],
            darija: ['هاد السيمانة', 'هاد الأيام', 'دابا قريب']
        },
        thisMonth: {
            en: ['this month', 'last month'],
            ar: ['هذا الشهر', 'الشهر الماضي'],
            darija: ['هاد الشهر', 'الشهر اللي فات']
        }
    };
    
    for (const [period, patterns] of Object.entries(timePatterns)) {
        const langPatterns = patterns[language] || patterns.en;
        for (const pattern of langPatterns) {
            if (lowerQuery.includes(pattern.toLowerCase())) {
                return getDateRange(period, now);
            }
        }
    }
    
    return {};
}

/**
 * Get date range based on period
 */
function getDateRange(period, now) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    switch (period) {
        case 'today':
            return {
                dateFrom: today.toISOString(),
                dateTo: now.toISOString()
            };
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return {
                dateFrom: yesterday.toISOString(),
                dateTo: today.toISOString()
            };
        case 'thisWeek':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return {
                dateFrom: weekAgo.toISOString(),
                dateTo: now.toISOString()
            };
        case 'thisMonth':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return {
                dateFrom: monthAgo.toISOString(),
                dateTo: now.toISOString()
            };
        default:
            return {};
    }
}

/**
 * Extract color from query
 */
function extractColor(query, language) {
    const colorMap = {
        black: { en: ['black'], ar: ['أسود', 'سوداء'], darija: ['كحل', 'كحلة'] },
        white: { en: ['white'], ar: ['أبيض', 'بيضاء'], darija: ['بيض', 'بيضا'] },
        red: { en: ['red'], ar: ['أحمر', 'حمراء'], darija: ['حمر', 'حمرا'] },
        blue: { en: ['blue'], ar: ['أزرق', 'زرقاء'], darija: ['زرق', 'زرقا'] },
        green: { en: ['green'], ar: ['أخضر', 'خضراء'], darija: ['خضر', 'خضرا'] },
        yellow: { en: ['yellow'], ar: ['أصفر', 'صفراء'], darija: ['صفر', 'صفرا'] },
        brown: { en: ['brown'], ar: ['بني', 'بنية'], darija: ['قهوي', 'قهوية'] },
        gray: { en: ['gray', 'grey'], ar: ['رمادي', 'رمادية'], darija: ['رمادي'] },
        orange: { en: ['orange'], ar: ['برتقالي'], darija: ['ليموني'] }
    };
    
    const lowerQuery = query.toLowerCase();
    
    for (const [color, patterns] of Object.entries(colorMap)) {
        const langPatterns = patterns[language] || patterns.en;
        for (const pattern of langPatterns) {
            if (lowerQuery.includes(pattern.toLowerCase())) {
                return color;
            }
        }
    }
    
    return null;
}

/**
 * Extract meaningful keywords from query
 */
function extractKeywords(query, language) {
    // Common stop words to filter out
    const stopWords = {
        en: ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'what', 'which', 'who', 'this', 'that', 'these', 'those', 'am', 'lost', 'missing', 'found', 'seen', 'looking', 'search', 'help', 'please', 'anyone', 'someone'],
        ar: ['في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك', 'التي', 'الذي', 'هو', 'هي', 'هم', 'أنا', 'نحن', 'أنت', 'كان', 'كانت', 'يكون', 'قد', 'لم', 'لن', 'أن', 'إن', 'لا', 'ما', 'هل', 'أو', 'و', 'ثم', 'لكن', 'بل', 'حتى', 'إذا', 'لأن', 'منذ', 'بين', 'فوق', 'تحت', 'أمام', 'خلف', 'بعد', 'قبل', 'كل', 'بعض', 'غير', 'مثل', 'أي', 'كيف', 'أين', 'متى', 'لماذا', 'ماذا'],
        darija: ['في', 'من', 'على', 'مع', 'هاد', 'داك', 'هادي', 'ديك', 'اللي', 'شي', 'هو', 'هي', 'هما', 'أنا', 'حنا', 'نتا', 'نتي', 'كان', 'كانت', 'يكون', 'ما', 'لا', 'واش', 'ولا', 'و', 'باش', 'بلا', 'بحال', 'غير', 'كيف', 'فين', 'فاش', 'علاش', 'شنو', 'شكون']
    };
    
    const langStopWords = new Set(stopWords[language] || stopWords.en);
    
    // Split query into words and filter
    const words = query
        .toLowerCase()
        .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= MIN_SEARCH_LENGTH && !langStopWords.has(word));
    
    return [...new Set(words)]; // Remove duplicates
}

/**
 * Search reports based on parsed parameters
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} - Search results
 */
export async function searchReports(params) {
    if (!supabaseAdmin) {
        throw new Error('Database not configured');
    }
    
    const {
        reportType,
        city,
        dateFrom,
        dateTo,
        color,
        keywords,
        originalQuery
    } = params;
    
    // Start building the query
    let query = supabaseAdmin
        .from('reports')
        .select(`
            id,
            report_type,
            status,
            city,
            last_known_location,
            photos,
            created_at,
            additional_info
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(MAX_RESULTS);
    
    // Apply filters
    if (reportType) {
        query = query.eq('report_type', reportType);
    }
    
    if (city) {
        query = query.ilike('city', `%${city}%`);
    }
    
    if (dateFrom) {
        query = query.gte('created_at', dateFrom);
    }
    
    if (dateTo) {
        query = query.lte('created_at', dateTo);
    }
    
    // Execute main query
    const { data: reports, error } = await query;
    
    if (error) {
        console.error('[Chat Search] Error:', error);
        throw error;
    }
    
    // Fetch type-specific details for each report
    const enrichedReports = await enrichReportsWithDetails(reports);
    
    // Score and sort by relevance if we have keywords
    if (keywords && keywords.length > 0) {
        return scoreAndSortResults(enrichedReports, keywords, color);
    }
    
    return {
        results: enrichedReports,
        totalCount: enrichedReports.length,
        searchParams: params
    };
}

/**
 * Enrich reports with their type-specific details
 */
async function enrichReportsWithDetails(reports) {
    if (!reports || reports.length === 0) return [];
    
    const detailTables = {
        person: 'report_details_person',
        pet: 'report_details_pet',
        document: 'report_details_document',
        electronics: 'report_details_electronics',
        vehicle: 'report_details_vehicle',
        other: 'report_details_other'
    };
    
    // Group reports by type
    const reportsByType = {};
    for (const report of reports) {
        if (!reportsByType[report.report_type]) {
            reportsByType[report.report_type] = [];
        }
        reportsByType[report.report_type].push(report.id);
    }
    
    // Fetch details for each type
    const detailsMap = {};
    
    for (const [type, ids] of Object.entries(reportsByType)) {
        const table = detailTables[type];
        if (!table) continue;
        
        const { data, error } = await supabaseAdmin
            .from(table)
            .select('*')
            .in('report_id', ids);
        
        if (!error && data) {
            for (const detail of data) {
                detailsMap[detail.report_id] = detail;
            }
        }
    }
    
    // Merge details into reports
    return reports.map(report => ({
        ...report,
        details: detailsMap[report.id] || null
    }));
}

/**
 * Score and sort results by relevance
 */
function scoreAndSortResults(reports, keywords, targetColor) {
    const scoredReports = reports.map(report => {
        let score = 0;
        
        // Build searchable text from report
        const searchableText = buildSearchableText(report).toLowerCase();
        
        // Score based on keyword matches
        for (const keyword of keywords) {
            if (searchableText.includes(keyword.toLowerCase())) {
                score += 10;
            }
        }
        
        // Bonus for color match
        if (targetColor && report.details) {
            const detailColor = report.details.color?.toLowerCase();
            if (detailColor && detailColor.includes(targetColor)) {
                score += 20;
            }
        }
        
        // Recency bonus (newer = higher)
        const ageInDays = (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays < 1) score += 15;
        else if (ageInDays < 7) score += 10;
        else if (ageInDays < 30) score += 5;
        
        return { ...report, relevanceScore: score };
    });
    
    // Sort by score descending
    scoredReports.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return {
        results: scoredReports,
        totalCount: scoredReports.length,
        hasRelevanceScoring: true
    };
}

/**
 * Build searchable text from report for matching
 */
function buildSearchableText(report) {
    const parts = [
        report.city,
        report.last_known_location,
        report.additional_info
    ];
    
    // Add type-specific fields
    if (report.details) {
        const d = report.details;
        parts.push(
            d.first_name, d.last_name, // person
            d.pet_name, d.pet_type, d.breed, d.color, // pet
            d.document_type, d.owner_name, // document
            d.device_type, d.brand, d.model, // electronics
            d.vehicle_type, d.brand, d.model, d.color, d.license_plate, // vehicle
            d.item_name, d.item_description // other
        );
    }
    
    return parts.filter(Boolean).join(' ');
}

/**
 * Format search results for chat response
 * @param {Object} searchResult - Search results
 * @param {string} language - Response language
 * @returns {Object} - Formatted response
 */
export function formatSearchResults(searchResult, language) {
    const { results, totalCount } = searchResult;
    
    if (totalCount === 0) {
        const noResultsText = {
            en: "I couldn't find any reports matching your search. Would you like to:\n\n• Try a different search\n• Create a new report\n• Browse all reports",
            ar: "لم أجد أي بلاغات تطابق بحثك. هل تريد:\n\n• تجربة بحث مختلف\n• إنشاء بلاغ جديد\n• تصفح جميع البلاغات",
            darija: "ما لقيتش شي بلاغ على قد اللي قلبتي عليه. بغيتي:\n\n• تقلب على شي حاجة خرا\n• دير بلاغ جديد\n• تشوف كاع البلاغات"
        };
        
        return {
            text: noResultsText[language] || noResultsText.en,
            results: [],
            quickReplies: [
                { text: language === 'ar' ? 'بحث جديد' : language === 'darija' ? 'قلب من جديد' : 'New search', action: 'search_reports' },
                { text: language === 'ar' ? 'إنشاء بلاغ' : language === 'darija' ? 'دير بلاغ' : 'Create report', action: 'create_report' }
            ]
        };
    }
    
    const headerText = {
        en: `I found ${totalCount} report${totalCount > 1 ? 's' : ''} matching your search:`,
        ar: `وجدت ${totalCount} بلاغ${totalCount > 1 ? 'ات' : ''} تطابق بحثك:`,
        darija: `لقيت ${totalCount} بلاغ${totalCount > 1 ? 'ات' : ''} على قد اللي قلبتي عليه:`
    };
    
    // Format each result
    const formattedResults = results.slice(0, 5).map(report => formatReportSummary(report, language));
    
    return {
        text: headerText[language] || headerText.en,
        results: formattedResults,
        totalCount,
        showViewMore: totalCount > 5,
        quickReplies: [
            { text: language === 'ar' ? 'بحث جديد' : language === 'darija' ? 'قلب من جديد' : 'New search', action: 'search_reports' },
            { text: language === 'ar' ? 'تصفية النتائج' : language === 'darija' ? 'فلتر' : 'Filter results', action: 'filter_search' }
        ]
    };
}

/**
 * Format a single report for display
 */
function formatReportSummary(report, language) {
    const typeLabels = {
        person: { en: '👤 Person', ar: '👤 شخص', darija: '👤 واحد' },
        pet: { en: '🐾 Pet', ar: '🐾 حيوان', darija: '🐾 حيوان' },
        document: { en: '📄 Document', ar: '📄 وثيقة', darija: '📄 ورقة' },
        electronics: { en: '📱 Electronics', ar: '📱 إلكترونيات', darija: '📱 جهاز' },
        vehicle: { en: '🚗 Vehicle', ar: '🚗 مركبة', darija: '🚗 طوموبيل' },
        other: { en: '📦 Item', ar: '📦 غرض', darija: '📦 حاجة' }
    };
    
    const typeLabel = typeLabels[report.report_type]?.[language] || typeLabels[report.report_type]?.en || report.report_type;
    
    // Build title based on type
    let title = typeLabel;
    if (report.details) {
        const d = report.details;
        if (d.first_name && d.last_name) {
            title = `${typeLabel}: ${d.first_name} ${d.last_name}`;
        } else if (d.pet_name) {
            title = `${typeLabel}: ${d.pet_name}`;
        } else if (d.brand && d.model) {
            title = `${typeLabel}: ${d.brand} ${d.model}`;
        } else if (d.document_type) {
            title = `${typeLabel}: ${d.document_type}`;
        } else if (d.item_name) {
            title = `${typeLabel}: ${d.item_name}`;
        }
    }
    
    // Format date
    const date = new Date(report.created_at);
    const dateStr = date.toLocaleDateString(language === 'ar' ? 'ar-MA' : 'en-US', {
        month: 'short',
        day: 'numeric'
    });
    
    return {
        id: report.id,
        title,
        location: report.city,
        date: dateStr,
        thumbnail: report.photos?.[0] || null,
        relevanceScore: report.relevanceScore
    };
}
