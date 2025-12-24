-- =====================================================
-- Migration: Report Interactions System Schema
-- Date: 2024-12-24
-- Description: Creates a scalable comment and interaction system for reports.
--              Supports threaded comments (replies), reactions/support,
--              and integrates with the notification system.
-- =====================================================

-- =====================================================
-- 1. CREATE COMMENTS TABLE (Supports threaded replies)
-- =====================================================

CREATE TABLE IF NOT EXISTS report_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Polymorphic reference to support both report types
    report_id UUID,  -- References reports table (missing reports)
    sighting_report_id UUID,  -- References sighting_reports table
    
    -- Comment hierarchy for threading
    parent_comment_id UUID REFERENCES report_comments(id) ON DELETE CASCADE,
    
    -- Comment author
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Comment content
    content TEXT NOT NULL,
    
    -- Soft delete support
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    
    -- Edit tracking
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT fk_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    CONSTRAINT fk_sighting_report FOREIGN KEY (sighting_report_id) REFERENCES sighting_reports(id) ON DELETE CASCADE,
    CONSTRAINT check_report_reference CHECK (
        (report_id IS NOT NULL AND sighting_report_id IS NULL) OR
        (report_id IS NULL AND sighting_report_id IS NOT NULL)
    ),
    CONSTRAINT check_content_not_empty CHECK (char_length(trim(content)) > 0)
);

-- Table comments
COMMENT ON TABLE report_comments IS 'Comments on reports with support for threaded replies. Polymorphic design supports both missing reports and sighting reports.';
COMMENT ON COLUMN report_comments.parent_comment_id IS 'Reference to parent comment for threaded replies. NULL for top-level comments.';
COMMENT ON COLUMN report_comments.is_deleted IS 'Soft delete flag. Deleted comments show as "[deleted]" but preserve reply structure.';

-- =====================================================
-- 2. CREATE REACTIONS/SUPPORT TABLE
-- =====================================================

-- Reaction types enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reaction_type_enum') THEN
        CREATE TYPE reaction_type_enum AS ENUM (
            'support',      -- General support/solidarity
            'prayer',       -- Prayers/thoughts
            'hope',         -- Hope for finding
            'share',        -- Commitment to share
            'seen'          -- Has seen/will look out
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS report_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Polymorphic reference
    report_id UUID,
    sighting_report_id UUID,
    
    -- Reaction author
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Reaction type
    reaction_type reaction_type_enum NOT NULL DEFAULT 'support',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT fk_reaction_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    CONSTRAINT fk_reaction_sighting FOREIGN KEY (sighting_report_id) REFERENCES sighting_reports(id) ON DELETE CASCADE,
    CONSTRAINT check_reaction_report_reference CHECK (
        (report_id IS NOT NULL AND sighting_report_id IS NULL) OR
        (report_id IS NULL AND sighting_report_id IS NOT NULL)
    ),
    -- One reaction type per user per report
    CONSTRAINT unique_user_report_reaction UNIQUE (user_id, report_id, reaction_type),
    CONSTRAINT unique_user_sighting_reaction UNIQUE (user_id, sighting_report_id, reaction_type)
);

COMMENT ON TABLE report_reactions IS 'User reactions/support on reports. Each user can have one reaction of each type per report.';

-- =====================================================
-- 3. CREATE COMMENT LIKES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES report_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- One like per user per comment
    CONSTRAINT unique_user_comment_like UNIQUE (user_id, comment_id)
);

COMMENT ON TABLE comment_likes IS 'Likes on comments. Each user can like a comment once.';

-- =====================================================
-- 4. CREATE REPORT VIEWS/IMPRESSIONS TABLE (Analytics)
-- =====================================================

CREATE TABLE IF NOT EXISTS report_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Polymorphic reference
    report_id UUID,
    sighting_report_id UUID,
    
    -- Viewer (optional - can track anonymous views)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- View metadata
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source VARCHAR(50), -- 'feed', 'map', 'share', 'notification'
    
    -- Constraints
    CONSTRAINT fk_view_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    CONSTRAINT fk_view_sighting FOREIGN KEY (sighting_report_id) REFERENCES sighting_reports(id) ON DELETE CASCADE,
    CONSTRAINT check_view_report_reference CHECK (
        (report_id IS NOT NULL AND sighting_report_id IS NULL) OR
        (report_id IS NULL AND sighting_report_id IS NOT NULL)
    )
);

COMMENT ON TABLE report_views IS 'Tracks report views for analytics. Helps prioritize and understand report reach.';

-- =====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_report_id ON report_comments(report_id) WHERE report_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_sighting_id ON report_comments(sighting_report_id) WHERE sighting_report_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON report_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON report_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON report_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_not_deleted ON report_comments(id) WHERE is_deleted = false;

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_reactions_report_id ON report_reactions(report_id) WHERE report_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reactions_sighting_id ON report_reactions(sighting_report_id) WHERE sighting_report_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reactions_user ON report_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON report_reactions(reaction_type);

-- Comment likes indexes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_id);

-- Views indexes
CREATE INDEX IF NOT EXISTS idx_views_report_id ON report_views(report_id) WHERE report_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_views_sighting_id ON report_views(sighting_report_id) WHERE sighting_report_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_views_date ON report_views(viewed_at DESC);

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_views ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

-- Comments: Anyone can read, authenticated users can create, users can edit/delete their own
CREATE POLICY "Anyone can view comments"
ON report_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create comments"
ON report_comments FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own comments"
ON report_comments FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own comments"
ON report_comments FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Reactions: Anyone can view, authenticated users can manage their own
CREATE POLICY "Anyone can view reactions"
ON report_reactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can add reactions"
ON report_reactions FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can remove their own reactions"
ON report_reactions FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Comment likes: Similar to reactions
CREATE POLICY "Anyone can view comment likes"
ON comment_likes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can like comments"
ON comment_likes FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can unlike their comments"
ON comment_likes FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Views: Anyone can view stats, system can insert
CREATE POLICY "Anyone can view report views"
ON report_views FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can record views"
ON report_views FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- 8. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get comment count for a report
CREATE OR REPLACE FUNCTION get_report_comment_count(p_report_id UUID, p_is_sighting BOOLEAN DEFAULT false)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_is_sighting THEN
        RETURN (
            SELECT COUNT(*) 
            FROM report_comments 
            WHERE sighting_report_id = p_report_id AND is_deleted = false
        );
    ELSE
        RETURN (
            SELECT COUNT(*) 
            FROM report_comments 
            WHERE report_id = p_report_id AND is_deleted = false
        );
    END IF;
END;
$$;

-- Function to get reaction counts for a report
CREATE OR REPLACE FUNCTION get_report_reaction_counts(p_report_id UUID, p_is_sighting BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    IF p_is_sighting THEN
        SELECT jsonb_object_agg(reaction_type, count) INTO result
        FROM (
            SELECT reaction_type::text, COUNT(*) as count
            FROM report_reactions
            WHERE sighting_report_id = p_report_id
            GROUP BY reaction_type
        ) counts;
    ELSE
        SELECT jsonb_object_agg(reaction_type, count) INTO result
        FROM (
            SELECT reaction_type::text, COUNT(*) as count
            FROM report_reactions
            WHERE report_id = p_report_id
            GROUP BY reaction_type
        ) counts;
    END IF;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Function to check if user has reacted to a report
CREATE OR REPLACE FUNCTION get_user_reactions(p_user_id UUID, p_report_id UUID, p_is_sighting BOOLEAN DEFAULT false)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_is_sighting THEN
        RETURN ARRAY(
            SELECT reaction_type::text
            FROM report_reactions
            WHERE sighting_report_id = p_report_id AND user_id = p_user_id
        );
    ELSE
        RETURN ARRAY(
            SELECT reaction_type::text
            FROM report_reactions
            WHERE report_id = p_report_id AND user_id = p_user_id
        );
    END IF;
END;
$$;

-- =====================================================
-- 9. CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_comment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    IF OLD.content IS DISTINCT FROM NEW.content THEN
        NEW.is_edited = true;
        NEW.edited_at = now();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_comment_updated_at
    BEFORE UPDATE ON report_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_updated_at();

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON report_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON report_reactions TO authenticated;
GRANT SELECT, INSERT, DELETE ON comment_likes TO authenticated;
GRANT SELECT, INSERT ON report_views TO authenticated;

GRANT EXECUTE ON FUNCTION get_report_comment_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_report_reaction_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_reactions TO authenticated;
