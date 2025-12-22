-- =====================================================
-- Migration: Notifications System Schema
-- Date: 2024-12-21
-- Description: Creates a scalable notification system for user notifications.
--              Supports extensible notification types without schema changes.
--              Prepared for Supabase Realtime integration.
-- =====================================================

-- =====================================================
-- 1. CREATE NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,  -- Extensible string type (e.g., 'REPORT_ACCEPTED', 'REPORT_REJECTED')
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,  -- Dynamic payload for any notification type
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add table comment for documentation
COMMENT ON TABLE notifications IS 'User notifications table. Supports extensible notification types via TEXT type field and dynamic JSONB data payload.';

-- Column comments
COMMENT ON COLUMN notifications.id IS 'Unique notification identifier';
COMMENT ON COLUMN notifications.user_id IS 'Reference to the user who receives this notification';
COMMENT ON COLUMN notifications.type IS 'Notification type string (e.g., REPORT_ACCEPTED, REPORT_REJECTED). Extensible without schema changes.';
COMMENT ON COLUMN notifications.title IS 'Notification title for display';
COMMENT ON COLUMN notifications.message IS 'Notification message body';
COMMENT ON COLUMN notifications.data IS 'Dynamic JSONB payload containing type-specific data (e.g., reportId, status, reason)';
COMMENT ON COLUMN notifications.is_read IS 'Whether the notification has been read by the user';
COMMENT ON COLUMN notifications.created_at IS 'Timestamp when the notification was created';

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index on user_id for fast user notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON notifications(user_id);

-- Index on is_read for filtering unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
ON notifications(is_read);

-- Composite index for common query pattern: user's notifications sorted by date
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

-- Index on type for filtering by notification type
CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON notifications(type);

-- Composite index for unread notifications per user (common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read) 
WHERE is_read = false;

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

-- Policy: Users can only SELECT their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can UPDATE only their own notifications (for marking as read)
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can DELETE only their own notifications
CREATE POLICY "Users can delete their own notifications"
ON notifications
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Policy: Users CANNOT insert notifications directly (must go through service role)
-- No INSERT policy for authenticated role = users cannot insert

-- Policy: Service role can insert notifications (bypasses RLS by default, but explicit for clarity)
-- Note: Service role bypasses RLS, so this is mainly for documentation
CREATE POLICY "Service role can insert notifications"
ON notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Service role can do anything (for admin operations)
CREATE POLICY "Service role has full access"
ON notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 5. HELPER FUNCTION: Create Notification
-- =====================================================

-- Function to create a notification (for use in triggers or server-side code)
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (p_user_id, p_type, p_title, p_message, p_data)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION create_notification IS 'Creates a notification for a user. Use SECURITY DEFINER to allow server-side code to insert notifications.';

-- =====================================================
-- 6. HELPER FUNCTION: Mark Notification as Read
-- =====================================================

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    UPDATE notifications
    SET is_read = true
    WHERE id = p_notification_id
    AND user_id = (SELECT auth.uid());
    
    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION mark_notification_read IS 'Marks a single notification as read. Uses SECURITY INVOKER to respect RLS.';

-- =====================================================
-- 7. HELPER FUNCTION: Mark All Notifications as Read
-- =====================================================

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE notifications
    SET is_read = true
    WHERE user_id = (SELECT auth.uid())
    AND is_read = false;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION mark_all_notifications_read IS 'Marks all unread notifications as read for the current user. Returns count of updated notifications.';

-- =====================================================
-- 8. HELPER FUNCTION: Get Unread Notification Count
-- =====================================================

CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM notifications
    WHERE user_id = (SELECT auth.uid())
    AND is_read = false;
    
    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION get_unread_notification_count IS 'Returns the count of unread notifications for the current user.';

-- =====================================================
-- 9. ENABLE REALTIME (for future subscription support)
-- =====================================================

-- Enable realtime for the notifications table
-- This allows clients to subscribe to INSERT events
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =====================================================
-- 10. NOTIFICATION TYPE CONSTANTS (Documentation)
-- =====================================================

-- These are the initial notification types supported:
-- 
-- REPORT_ACCEPTED - When admin accepts a user's report
--   data: { reportId: UUID, reportTitle: string }
--
-- REPORT_REJECTED - When admin rejects a user's report  
--   data: { reportId: UUID, reportTitle: string, reason?: string }
--
-- Future types can be added without schema changes:
-- - REPORT_COMMENT
-- - REPORT_MATCH_FOUND
-- - ACCOUNT_VERIFIED
-- - SYSTEM_ANNOUNCEMENT
-- - etc.

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
