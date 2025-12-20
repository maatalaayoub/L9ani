-- ==============================================
-- L9ani Database Migration: Drop AI Chatbot Tables
-- ==============================================
-- This migration removes all chatbot-related tables from the database.
-- The chatbot now uses browser localStorage only - no database storage needed.
-- ==============================================

-- Drop tables in correct order (respecting foreign key constraints)
-- Child tables first, then parent tables

-- Drop chat_searches table (references chat_sessions)
DROP TABLE IF EXISTS chat_searches CASCADE;

-- Drop chat_report_drafts table (references chat_messages and chat_sessions)
DROP TABLE IF EXISTS chat_report_drafts CASCADE;

-- Drop chat_messages table (references chat_sessions)
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Drop chat_sessions table (parent table)
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Drop any related indexes (these are dropped automatically with tables, but just to be safe)
DROP INDEX IF EXISTS idx_chat_sessions_user_id;
DROP INDEX IF EXISTS idx_chat_sessions_last_activity;
DROP INDEX IF EXISTS idx_chat_sessions_current_intent;
DROP INDEX IF EXISTS idx_chat_messages_session_id;
DROP INDEX IF EXISTS idx_chat_messages_created_at;
DROP INDEX IF EXISTS idx_chat_messages_intent;
DROP INDEX IF EXISTS idx_chat_report_drafts_session;
DROP INDEX IF EXISTS idx_chat_searches_session;
DROP INDEX IF EXISTS idx_chat_searches_query;

-- Drop any related types if they exist
DROP TYPE IF EXISTS chat_message_role CASCADE;
DROP TYPE IF EXISTS chat_report_status CASCADE;

-- ==============================================
-- Migration complete!
-- The chatbot now operates entirely client-side.
-- ==============================================
