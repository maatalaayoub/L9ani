-- =====================================================
-- Migration: Fix Notifications Realtime
-- Date: 2025-01-XX
-- Description: Enables REPLICA IDENTITY FULL for realtime filters to work
--              with RLS policies on the notifications table.
-- =====================================================

-- Enable REPLICA IDENTITY FULL so that realtime filters work correctly
-- This is required for filters like `user_id=eq.{uuid}` to function
-- when RLS is enabled on the table
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Verify the table is in the realtime publication (should already be, but ensure)
-- Note: This will error if already added, which is fine
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END
$$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
