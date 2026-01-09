-- =====================================================
-- L9ani Database Migration: Match Access Tokens
-- =====================================================
-- This migration creates a secure mechanism for matched report
-- owners to access each other's reports even if not yet approved.
-- =====================================================

-- =====================================================
-- STEP 1: Create Match Access Tokens Table
-- =====================================================
-- Stores secure tokens that grant temporary access to matched reports
CREATE TABLE IF NOT EXISTS match_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The user who owns this token
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- The face match this token is associated with
    match_id UUID NOT NULL REFERENCES face_matches(id) ON DELETE CASCADE,
    
    -- The report this token grants access to
    target_report_id UUID NOT NULL,
    
    -- Type of the target report ('missing' or 'sighting')
    target_report_type VARCHAR(20) NOT NULL CHECK (target_report_type IN ('missing', 'sighting')),
    
    -- The secure access token (randomly generated)
    token VARCHAR(64) NOT NULL UNIQUE,
    
    -- Token expiration (optional - NULL means no expiration)
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Token usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE,
    use_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one token per user per target report per match
    UNIQUE(user_id, match_id, target_report_id)
);

-- =====================================================
-- STEP 2: Create Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_match_access_tokens_user_id ON match_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_match_access_tokens_token ON match_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_match_access_tokens_target_report ON match_access_tokens(target_report_id, target_report_type);
CREATE INDEX IF NOT EXISTS idx_match_access_tokens_match_id ON match_access_tokens(match_id);

-- =====================================================
-- STEP 3: Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE match_access_tokens ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Create RLS Policies
-- =====================================================

-- Users can only view their own access tokens
DROP POLICY IF EXISTS "Users can view own match access tokens" ON match_access_tokens;
CREATE POLICY "Users can view own match access tokens" ON match_access_tokens
FOR SELECT USING (user_id = auth.uid());

-- Users can only insert tokens for themselves (through API)
DROP POLICY IF EXISTS "Users can create own match access tokens" ON match_access_tokens;
CREATE POLICY "Users can create own match access tokens" ON match_access_tokens
FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- STEP 5: Create Function to Generate Secure Token
-- =====================================================

CREATE OR REPLACE FUNCTION generate_match_access_token()
RETURNS VARCHAR(64) AS $$
DECLARE
    new_token VARCHAR(64);
BEGIN
    -- Generate a cryptographically secure random token
    new_token := encode(gen_random_bytes(32), 'hex');
    RETURN new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- STEP 6: Create Function to Validate Token Access
-- =====================================================

CREATE OR REPLACE FUNCTION validate_match_access_token(
    p_token VARCHAR(64),
    p_report_id UUID,
    p_report_type VARCHAR(20)
)
RETURNS TABLE (
    is_valid BOOLEAN,
    user_id UUID,
    match_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE as is_valid,
        mat.user_id,
        mat.match_id
    FROM match_access_tokens mat
    WHERE mat.token = p_token
      AND mat.target_report_id = p_report_id
      AND mat.target_report_type = p_report_type
      AND (mat.expires_at IS NULL OR mat.expires_at > NOW());
    
    -- Update usage tracking if token was found
    UPDATE match_access_tokens
    SET last_used_at = NOW(),
        use_count = use_count + 1
    WHERE token = p_token
      AND target_report_id = p_report_id
      AND target_report_type = p_report_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- STEP 7: Grant Permissions
-- =====================================================

-- Allow authenticated users to execute the validation function
GRANT EXECUTE ON FUNCTION validate_match_access_token(VARCHAR, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_match_access_token() TO authenticated;

-- =====================================================
-- STEP 8: Create Helper View for Match Access
-- =====================================================
-- This view helps determine if a user can access a specific report through a face match

CREATE OR REPLACE VIEW match_access_rights AS
SELECT DISTINCT
    fm.id as match_id,
    r.id as missing_report_id,
    r.user_id as missing_report_owner_id,
    r.status as missing_report_status,
    sr.id as sighting_report_id,
    sr.user_id as sighting_report_owner_id,
    sr.status as sighting_report_status,
    fm.similarity_score,
    fm.created_at as match_created_at
FROM face_matches fm
JOIN missing_report_faces mrf ON fm.missing_face_id = mrf.id
JOIN sighting_report_faces srf ON fm.sighting_face_id = srf.id
JOIN reports r ON mrf.report_id = r.id
JOIN sighting_reports sr ON srf.report_id = sr.id;

-- Grant select on view to authenticated users
GRANT SELECT ON match_access_rights TO authenticated;
