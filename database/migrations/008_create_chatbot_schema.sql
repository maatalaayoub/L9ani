-- =====================================================
-- L9ani Database Migration: AI Chatbot Schema
-- =====================================================
-- This migration creates tables for the AI-powered chatbot
-- including chat sessions, messages, and analytics.
-- 
-- Features:
-- - Multilingual support (AR, EN, Darija)
-- - Intent tracking for analytics
-- - Report creation assistance
-- - Search history
-- =====================================================

-- =====================================================
-- STEP 1: Create Chat Intent Enum
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_intent_enum') THEN
        CREATE TYPE chat_intent_enum AS ENUM (
            'create_report',      -- User wants to create a new report
            'search_reports',     -- User searching for reports
            'check_status',       -- User checking report status
            'update_report',      -- User wants to update their report
            'platform_help',      -- User needs platform guidance
            'faq',                -- General FAQ questions
            'greeting',           -- Hello/Hi messages
            'emergency',          -- Urgent/emergency situations
            'feedback',           -- User providing feedback
            'unknown'             -- Intent not detected
        );
    END IF;
END $$;

-- =====================================================
-- STEP 2: Create Chat Language Enum
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_language_enum') THEN
        CREATE TYPE chat_language_enum AS ENUM ('en', 'ar', 'darija');
    END IF;
END $$;

-- =====================================================
-- STEP 3: Create Chat Sessions Table
-- =====================================================
-- Stores conversation sessions for context retention
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User association (nullable for anonymous users)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Session metadata
    detected_language chat_language_enum DEFAULT 'en',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Session state (for multi-turn conversations)
    current_intent chat_intent_enum,
    context_data JSONB DEFAULT '{}', -- Stores form progress, search params, etc.
    
    -- Analytics
    message_count INTEGER DEFAULT 0,
    is_resolved BOOLEAN DEFAULT FALSE,
    user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),
    
    -- Device/browser info for debugging
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 4: Create Chat Messages Table
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    -- Message content
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    
    -- Intent detected for this message
    detected_intent chat_intent_enum,
    intent_confidence DECIMAL(3, 2), -- 0.00 to 1.00
    
    -- Language of the message
    detected_language chat_language_enum,
    
    -- For assistant messages that include report data
    referenced_reports UUID[], -- Array of report IDs mentioned
    
    -- For report creation flow
    collected_fields JSONB, -- Fields collected from user in this turn
    
    -- Metadata
    processing_time_ms INTEGER, -- How long the AI took to respond
    tokens_used INTEGER, -- For tracking API usage
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 5: Create Chat Quick Replies Table
-- =====================================================
-- Pre-defined quick reply suggestions
CREATE TABLE IF NOT EXISTS chat_quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trigger conditions
    trigger_intent chat_intent_enum,
    trigger_keywords TEXT[], -- Keywords that trigger these replies
    
    -- Reply content in multiple languages
    text_en TEXT NOT NULL,
    text_ar TEXT NOT NULL,
    text_darija TEXT,
    
    -- Action associated with the quick reply
    action_type VARCHAR(50), -- 'navigate', 'start_report', 'search', etc.
    action_data JSONB, -- { "route": "/report-missing", "reportType": "person" }
    
    -- Display order
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 6: Create Chat Feedback Table
-- =====================================================
-- Stores user feedback on bot responses for improvement
CREATE TABLE IF NOT EXISTS chat_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    -- Feedback type
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful', 'report')),
    feedback_text TEXT, -- Optional detailed feedback
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 7: Create Chat Search History Table
-- =====================================================
-- Tracks searches performed through the chatbot
CREATE TABLE IF NOT EXISTS chat_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Search parameters
    original_query TEXT NOT NULL, -- The natural language query
    parsed_params JSONB, -- { "reportType": "person", "city": "Casablanca", "keywords": [...] }
    
    -- Results
    results_count INTEGER DEFAULT 0,
    result_report_ids UUID[],
    
    -- User interaction with results
    clicked_report_ids UUID[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 8: Create Indexes for Performance
-- =====================================================

-- Chat sessions indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity ON chat_sessions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_current_intent ON chat_sessions(current_intent);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_intent ON chat_messages(detected_intent);

-- Chat search history indexes
CREATE INDEX IF NOT EXISTS idx_chat_search_user_id ON chat_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_search_created_at ON chat_search_history(created_at DESC);

-- Full text search index on messages for analytics
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_search 
ON chat_messages USING gin(to_tsvector('simple', content));

-- =====================================================
-- STEP 9: Create Updated_at Trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_chat_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_sessions 
    SET last_activity_at = NOW(),
        message_count = message_count + 1
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_chat_session_activity ON chat_messages;
CREATE TRIGGER trigger_update_chat_session_activity
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_session_activity();

-- =====================================================
-- STEP 10: Row Level Security Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_quick_replies ENABLE ROW LEVEL SECURITY;

-- Chat Sessions: Users can only see their own sessions
CREATE POLICY "Users can view own chat sessions"
    ON chat_sessions FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create chat sessions"
    ON chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own chat sessions"
    ON chat_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Chat Messages: Users can only see messages from their sessions
CREATE POLICY "Users can view messages from own sessions"
    ON chat_messages FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM chat_sessions 
            WHERE user_id = auth.uid() OR user_id IS NULL
        )
    );

CREATE POLICY "Users can create messages in own sessions"
    ON chat_messages FOR INSERT
    WITH CHECK (
        session_id IN (
            SELECT id FROM chat_sessions 
            WHERE user_id = auth.uid() OR user_id IS NULL
        )
    );

-- Chat Feedback: Users can provide feedback
CREATE POLICY "Users can create feedback"
    ON chat_feedback FOR INSERT
    WITH CHECK (
        session_id IN (
            SELECT id FROM chat_sessions 
            WHERE user_id = auth.uid() OR user_id IS NULL
        )
    );

-- Search History: Users can view their own search history
CREATE POLICY "Users can view own search history"
    ON chat_search_history FOR SELECT
    USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create search history"
    ON chat_search_history FOR INSERT
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Quick Replies: Everyone can read (public)
CREATE POLICY "Anyone can view quick replies"
    ON chat_quick_replies FOR SELECT
    USING (is_active = TRUE);

-- =====================================================
-- STEP 11: Insert Default Quick Replies
-- =====================================================
INSERT INTO chat_quick_replies (trigger_intent, text_en, text_ar, text_darija, action_type, action_data, display_order)
VALUES 
    -- Greeting quick replies
    ('greeting', 'Report a missing person', 'الإبلاغ عن شخص مفقود', 'بلغ على شي واحد ضايع', 'navigate', '{"route": "/report-missing", "reportType": "person"}', 1),
    ('greeting', 'Report a lost item', 'الإبلاغ عن غرض مفقود', 'بلغ على شي حاجة ضايعة', 'navigate', '{"route": "/report-missing", "reportType": "other"}', 2),
    ('greeting', 'Search for reports', 'البحث في البلاغات', 'قلب فالبلاغات', 'start_search', '{}', 3),
    ('greeting', 'Check my report status', 'التحقق من حالة بلاغي', 'شوف كيفاش بلاغي', 'navigate', '{"route": "/my-report"}', 4),
    
    -- Search quick replies
    ('search_reports', 'Missing persons', 'أشخاص مفقودون', 'ناس ضايعين', 'search', '{"reportType": "person"}', 1),
    ('search_reports', 'Lost pets', 'حيوانات مفقودة', 'حيوانات ضايعين', 'search', '{"reportType": "pet"}', 2),
    ('search_reports', 'Lost documents', 'وثائق مفقودة', 'وراق ضايعين', 'search', '{"reportType": "document"}', 3),
    ('search_reports', 'Lost vehicles', 'مركبات مفقودة', 'طوموبيلات ضايعين', 'search', '{"reportType": "vehicle"}', 4),
    
    -- Help quick replies
    ('platform_help', 'How to create a report?', 'كيف أنشئ بلاغاً؟', 'كيفاش ندير بلاغ؟', 'show_help', '{"topic": "create_report"}', 1),
    ('platform_help', 'How to search for reports?', 'كيف أبحث في البلاغات؟', 'كيفاش نقلب فالبلاغات؟', 'show_help', '{"topic": "search"}', 2),
    ('platform_help', 'Contact support', 'تواصل مع الدعم', 'تواصل مع الدعم', 'navigate', '{"route": "/contact"}', 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 12: Create View for Chat Analytics (Admin)
-- =====================================================
CREATE OR REPLACE VIEW chat_analytics AS
SELECT 
    DATE_TRUNC('day', cs.created_at) as day,
    COUNT(DISTINCT cs.id) as total_sessions,
    COUNT(cm.id) as total_messages,
    AVG(cs.message_count) as avg_messages_per_session,
    COUNT(DISTINCT CASE WHEN cs.is_resolved THEN cs.id END) as resolved_sessions,
    AVG(cs.user_satisfaction) as avg_satisfaction,
    COUNT(DISTINCT CASE WHEN cs.detected_language = 'ar' THEN cs.id END) as arabic_sessions,
    COUNT(DISTINCT CASE WHEN cs.detected_language = 'en' THEN cs.id END) as english_sessions,
    COUNT(DISTINCT CASE WHEN cs.detected_language = 'darija' THEN cs.id END) as darija_sessions
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cs.id = cm.session_id
GROUP BY DATE_TRUNC('day', cs.created_at)
ORDER BY day DESC;

-- Grant access to the view
GRANT SELECT ON chat_analytics TO authenticated;

COMMENT ON TABLE chat_sessions IS 'Stores chatbot conversation sessions for context and analytics';
COMMENT ON TABLE chat_messages IS 'Individual messages in chatbot conversations';
COMMENT ON TABLE chat_quick_replies IS 'Pre-defined quick reply buttons for common actions';
COMMENT ON TABLE chat_feedback IS 'User feedback on bot responses for ML improvement';
COMMENT ON TABLE chat_search_history IS 'Tracks natural language searches through chatbot';
