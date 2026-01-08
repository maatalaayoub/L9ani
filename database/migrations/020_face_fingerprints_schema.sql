-- =====================================================
-- L9ani Database Migration: Face Fingerprints Schema
-- =====================================================
-- This migration creates tables to store face fingerprints
-- extracted from images using AWS Rekognition for face
-- comparison between missing person reports and sightings.
-- =====================================================

-- =====================================================
-- STEP 1: Create Face Fingerprints Table for Missing Reports
-- =====================================================
-- Stores face fingerprints extracted from missing person report photos
CREATE TABLE IF NOT EXISTS missing_report_faces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to the missing report
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    
    -- Reference to the specific photo URL
    photo_url TEXT NOT NULL,
    
    -- AWS Rekognition Face ID (from IndexFaces)
    aws_face_id VARCHAR(255) NOT NULL,
    
    -- AWS External Image ID (for reference)
    external_image_id VARCHAR(255) NOT NULL,
    
    -- Face bounding box (where the face is in the image)
    bounding_box JSONB, -- { Width, Height, Left, Top }
    
    -- Face confidence score from detection
    confidence DECIMAL(5,2),
    
    -- Full face details from Rekognition (stored for reference)
    face_details JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 2: Create Face Fingerprints Table for Sighting Reports
-- =====================================================
-- Stores face fingerprints extracted from sighting report photos
CREATE TABLE IF NOT EXISTS sighting_report_faces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to the sighting report
    report_id UUID NOT NULL REFERENCES sighting_reports(id) ON DELETE CASCADE,
    
    -- Reference to the specific photo URL
    photo_url TEXT NOT NULL,
    
    -- AWS Rekognition Face ID (from IndexFaces)
    aws_face_id VARCHAR(255) NOT NULL,
    
    -- AWS External Image ID (for reference)
    external_image_id VARCHAR(255) NOT NULL,
    
    -- Face bounding box (where the face is in the image)
    bounding_box JSONB, -- { Width, Height, Left, Top }
    
    -- Face confidence score from detection
    confidence DECIMAL(5,2),
    
    -- Full face details from Rekognition (stored for reference)
    face_details JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 3: Create Face Matches Table
-- =====================================================
-- Stores potential matches found between missing and sighting reports
CREATE TABLE IF NOT EXISTS face_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The missing person report face
    missing_face_id UUID NOT NULL REFERENCES missing_report_faces(id) ON DELETE CASCADE,
    
    -- The sighting report face that matched
    sighting_face_id UUID NOT NULL REFERENCES sighting_report_faces(id) ON DELETE CASCADE,
    
    -- AWS similarity score (0-100)
    similarity_score DECIMAL(5,2) NOT NULL,
    
    -- Match status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'reviewing')),
    
    -- Review details
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Notification status
    notified_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique match pairs
    UNIQUE(missing_face_id, sighting_face_id)
);

-- =====================================================
-- STEP 4: Create Indexes for Performance
-- =====================================================

-- Missing report faces indexes
CREATE INDEX IF NOT EXISTS idx_missing_report_faces_report_id ON missing_report_faces(report_id);
CREATE INDEX IF NOT EXISTS idx_missing_report_faces_aws_face_id ON missing_report_faces(aws_face_id);
CREATE INDEX IF NOT EXISTS idx_missing_report_faces_external_image_id ON missing_report_faces(external_image_id);

-- Sighting report faces indexes
CREATE INDEX IF NOT EXISTS idx_sighting_report_faces_report_id ON sighting_report_faces(report_id);
CREATE INDEX IF NOT EXISTS idx_sighting_report_faces_aws_face_id ON sighting_report_faces(aws_face_id);
CREATE INDEX IF NOT EXISTS idx_sighting_report_faces_external_image_id ON sighting_report_faces(external_image_id);

-- Face matches indexes
CREATE INDEX IF NOT EXISTS idx_face_matches_missing_face_id ON face_matches(missing_face_id);
CREATE INDEX IF NOT EXISTS idx_face_matches_sighting_face_id ON face_matches(sighting_face_id);
CREATE INDEX IF NOT EXISTS idx_face_matches_status ON face_matches(status);
CREATE INDEX IF NOT EXISTS idx_face_matches_similarity ON face_matches(similarity_score DESC);

-- =====================================================
-- STEP 5: Create Updated_at Triggers
-- =====================================================

-- Trigger for missing_report_faces
DROP TRIGGER IF EXISTS update_missing_report_faces_updated_at ON missing_report_faces;
CREATE TRIGGER update_missing_report_faces_updated_at
    BEFORE UPDATE ON missing_report_faces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for sighting_report_faces
DROP TRIGGER IF EXISTS update_sighting_report_faces_updated_at ON sighting_report_faces;
CREATE TRIGGER update_sighting_report_faces_updated_at
    BEFORE UPDATE ON sighting_report_faces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for face_matches
DROP TRIGGER IF EXISTS update_face_matches_updated_at ON face_matches;
CREATE TRIGGER update_face_matches_updated_at
    BEFORE UPDATE ON face_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 6: Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE missing_report_faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE sighting_report_faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_matches ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 7: Create RLS Policies
-- =====================================================

-- Missing report faces - Users can view faces for their own reports
DROP POLICY IF EXISTS "Users can view own missing report faces" ON missing_report_faces;
CREATE POLICY "Users can view own missing report faces" ON missing_report_faces
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM reports r 
        WHERE r.id = missing_report_faces.report_id 
        AND r.user_id = auth.uid()
    )
);

-- Sighting report faces - Users can view faces for their own reports
DROP POLICY IF EXISTS "Users can view own sighting report faces" ON sighting_report_faces;
CREATE POLICY "Users can view own sighting report faces" ON sighting_report_faces
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM sighting_reports sr 
        WHERE sr.id = sighting_report_faces.report_id 
        AND sr.user_id = auth.uid()
    )
);

-- Face matches - Users can view matches involving their reports
DROP POLICY IF EXISTS "Users can view relevant face matches" ON face_matches;
CREATE POLICY "Users can view relevant face matches" ON face_matches
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM missing_report_faces mrf
        JOIN reports r ON r.id = mrf.report_id
        WHERE mrf.id = face_matches.missing_face_id 
        AND r.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM sighting_report_faces srf
        JOIN sighting_reports sr ON sr.id = srf.report_id
        WHERE srf.id = face_matches.sighting_face_id 
        AND sr.user_id = auth.uid()
    )
);

-- Service role bypass for all tables
DROP POLICY IF EXISTS "Service role full access missing faces" ON missing_report_faces;
CREATE POLICY "Service role full access missing faces" ON missing_report_faces
FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access sighting faces" ON sighting_report_faces;
CREATE POLICY "Service role full access sighting faces" ON sighting_report_faces
FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access face matches" ON face_matches;
CREATE POLICY "Service role full access face matches" ON face_matches
FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- STEP 8: Create View for Easy Face Match Queries
-- =====================================================

CREATE OR REPLACE VIEW face_matches_details 
WITH (security_invoker = true)
AS
SELECT 
    fm.id AS match_id,
    fm.similarity_score,
    fm.status AS match_status,
    fm.created_at AS match_found_at,
    fm.reviewed_at,
    fm.review_notes,
    
    -- Missing report info
    r.id AS missing_report_id,
    r.user_id AS missing_report_user_id,
    r.city AS missing_city,
    r.status AS missing_report_status,
    r.photos AS missing_photos,
    mrf.photo_url AS missing_matched_photo,
    rdp.first_name AS missing_first_name,
    rdp.last_name AS missing_last_name,
    
    -- Sighting report info
    sr.id AS sighting_report_id,
    sr.user_id AS sighting_report_user_id,
    sr.city AS sighting_city,
    sr.location_description AS sighting_location,
    sr.status AS sighting_report_status,
    sr.photos AS sighting_photos,
    srf.photo_url AS sighting_matched_photo,
    sr.reporter_phone AS sighting_reporter_phone,
    sr.reporter_email AS sighting_reporter_email
    
FROM face_matches fm
JOIN missing_report_faces mrf ON mrf.id = fm.missing_face_id
JOIN reports r ON r.id = mrf.report_id
LEFT JOIN report_details_person rdp ON rdp.report_id = r.id
JOIN sighting_report_faces srf ON srf.id = fm.sighting_face_id
JOIN sighting_reports sr ON sr.id = srf.report_id;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE missing_report_faces IS 'Stores AWS Rekognition face fingerprints for missing person report photos';
COMMENT ON TABLE sighting_report_faces IS 'Stores AWS Rekognition face fingerprints for sighting report photos';
COMMENT ON TABLE face_matches IS 'Stores potential matches between missing and sighting report faces';
COMMENT ON VIEW face_matches_details IS 'Convenient view joining face matches with report details';
