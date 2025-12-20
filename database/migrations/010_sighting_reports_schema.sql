-- =====================================================
-- L9ani Database Migration: Sighting Reports Schema
-- =====================================================
-- This migration creates a COMPLETELY SEPARATE structure
-- for sighting reports (found/seen items), independent from
-- the missing reports tables.
-- =====================================================

-- =====================================================
-- STEP 1: Create Storage Bucket for Sighting Photos
-- =====================================================
-- Run this in SQL Editor to create the storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sighting-reports-photos', 'sighting-reports-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for sighting photos
DROP POLICY IF EXISTS "Users can upload sighting photos" ON storage.objects;
CREATE POLICY "Users can upload sighting photos" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'sighting-reports-photos' 
    AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Public can view sighting photos" ON storage.objects;
CREATE POLICY "Public can view sighting photos" ON storage.objects
FOR SELECT USING (bucket_id = 'sighting-reports-photos');

DROP POLICY IF EXISTS "Users can delete own sighting photos" ON storage.objects;
CREATE POLICY "Users can delete own sighting photos" ON storage.objects
FOR DELETE USING (
    bucket_id = 'sighting-reports-photos' 
    AND auth.role() = 'authenticated'
);

-- =====================================================
-- STEP 2: Create the Core Sighting Reports Table
-- =====================================================
CREATE TABLE IF NOT EXISTS sighting_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Report metadata
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('person', 'pet', 'document', 'electronics', 'vehicle', 'other')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'matched', 'closed')),
    
    -- User who created the report
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Location fields
    city VARCHAR(200) NOT NULL,
    location_description TEXT NOT NULL,
    coordinates JSONB, -- { lat: number, lng: number }
    
    -- Common fields
    additional_info TEXT,
    
    -- Photos (array of photo URLs)
    photos TEXT[],
    
    -- Reporter contact info (who found/saw the item)
    reporter_first_name VARCHAR(100),
    reporter_last_name VARCHAR(100),
    reporter_phone VARCHAR(50) NOT NULL,
    reporter_email VARCHAR(200),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Admin fields
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Matching field (link to missing report if matched)
    matched_report_id UUID REFERENCES reports(id) ON DELETE SET NULL
);

-- =====================================================
-- STEP 3: Create Type-Specific Detail Tables for Sightings
-- =====================================================

-- ----- SIGHTING PERSON DETAILS -----
CREATE TABLE IF NOT EXISTS sighting_details_person (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL UNIQUE REFERENCES sighting_reports(id) ON DELETE CASCADE,
    
    -- Approximate info (since it's a sighting, not exact info)
    first_name VARCHAR(100), -- if known
    last_name VARCHAR(100), -- if known
    approximate_age VARCHAR(50), -- e.g., "child", "teenager", "adult", "elderly"
    gender VARCHAR(20),
    physical_description TEXT,
    clothing_description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----- SIGHTING PET DETAILS -----
CREATE TABLE IF NOT EXISTS sighting_details_pet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL UNIQUE REFERENCES sighting_reports(id) ON DELETE CASCADE,
    
    pet_type VARCHAR(100) NOT NULL, -- dog, cat, bird, etc.
    breed VARCHAR(100),
    color VARCHAR(100),
    size VARCHAR(50), -- small, medium, large
    has_collar BOOLEAN DEFAULT false,
    collar_description TEXT,
    condition TEXT, -- healthy, injured, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----- SIGHTING DOCUMENT DETAILS -----
CREATE TABLE IF NOT EXISTS sighting_details_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL UNIQUE REFERENCES sighting_reports(id) ON DELETE CASCADE,
    
    document_type VARCHAR(100) NOT NULL, -- ID card, passport, license, etc.
    document_number VARCHAR(100), -- partial if visible
    owner_name VARCHAR(200), -- if visible on document
    condition TEXT, -- good, damaged, wet, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----- SIGHTING ELECTRONICS DETAILS -----
CREATE TABLE IF NOT EXISTS sighting_details_electronics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL UNIQUE REFERENCES sighting_reports(id) ON DELETE CASCADE,
    
    device_type VARCHAR(100) NOT NULL, -- phone, laptop, tablet, etc.
    brand VARCHAR(100),
    model VARCHAR(100),
    color VARCHAR(50),
    condition TEXT, -- working, damaged, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----- SIGHTING VEHICLE DETAILS -----
CREATE TABLE IF NOT EXISTS sighting_details_vehicle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL UNIQUE REFERENCES sighting_reports(id) ON DELETE CASCADE,
    
    vehicle_type VARCHAR(100) NOT NULL, -- car, motorcycle, bicycle, etc.
    brand VARCHAR(100),
    model VARCHAR(100),
    color VARCHAR(50),
    license_plate VARCHAR(50), -- partial if visible
    condition TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----- SIGHTING OTHER ITEMS DETAILS -----
CREATE TABLE IF NOT EXISTS sighting_details_other (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL UNIQUE REFERENCES sighting_reports(id) ON DELETE CASCADE,
    
    item_name VARCHAR(200) NOT NULL,
    item_description TEXT,
    condition TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 4: Create Indexes for Performance
-- =====================================================

-- Core sighting reports table indexes
CREATE INDEX IF NOT EXISTS idx_sighting_reports_user_id ON sighting_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_sighting_reports_report_type ON sighting_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_sighting_reports_status ON sighting_reports(status);
CREATE INDEX IF NOT EXISTS idx_sighting_reports_city ON sighting_reports(city);
CREATE INDEX IF NOT EXISTS idx_sighting_reports_created_at ON sighting_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sighting_reports_type_status ON sighting_reports(report_type, status);
CREATE INDEX IF NOT EXISTS idx_sighting_reports_matched ON sighting_reports(matched_report_id);

-- Detail tables indexes (for joins)
CREATE INDEX IF NOT EXISTS idx_sighting_details_person_report_id ON sighting_details_person(report_id);
CREATE INDEX IF NOT EXISTS idx_sighting_details_pet_report_id ON sighting_details_pet(report_id);
CREATE INDEX IF NOT EXISTS idx_sighting_details_document_report_id ON sighting_details_document(report_id);
CREATE INDEX IF NOT EXISTS idx_sighting_details_electronics_report_id ON sighting_details_electronics(report_id);
CREATE INDEX IF NOT EXISTS idx_sighting_details_vehicle_report_id ON sighting_details_vehicle(report_id);
CREATE INDEX IF NOT EXISTS idx_sighting_details_other_report_id ON sighting_details_other(report_id);

-- =====================================================
-- STEP 5: Create Updated_at Trigger
-- =====================================================
DROP TRIGGER IF EXISTS update_sighting_reports_updated_at ON sighting_reports;
CREATE TRIGGER update_sighting_reports_updated_at
    BEFORE UPDATE ON sighting_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 6: Enable Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all sighting tables
ALTER TABLE sighting_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sighting_details_person ENABLE ROW LEVEL SECURITY;
ALTER TABLE sighting_details_pet ENABLE ROW LEVEL SECURITY;
ALTER TABLE sighting_details_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE sighting_details_electronics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sighting_details_vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE sighting_details_other ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 7: RLS Policies for Sighting Reports Table
-- =====================================================

-- Users can view approved sighting reports (public)
DROP POLICY IF EXISTS "Anyone can view approved sighting reports" ON sighting_reports;
CREATE POLICY "Anyone can view approved sighting reports" ON sighting_reports
    FOR SELECT
    USING (status = 'approved');

-- Users can view their own sighting reports (any status)
DROP POLICY IF EXISTS "Users can view own sighting reports" ON sighting_reports;
CREATE POLICY "Users can view own sighting reports" ON sighting_reports
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own sighting reports
DROP POLICY IF EXISTS "Users can create own sighting reports" ON sighting_reports;
CREATE POLICY "Users can create own sighting reports" ON sighting_reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending sighting reports
DROP POLICY IF EXISTS "Users can update own pending sighting reports" ON sighting_reports;
CREATE POLICY "Users can update own pending sighting reports" ON sighting_reports
    FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending');

-- Users can delete their own sighting reports
DROP POLICY IF EXISTS "Users can delete own sighting reports" ON sighting_reports;
CREATE POLICY "Users can delete own sighting reports" ON sighting_reports
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- STEP 8: RLS Policies for Sighting Detail Tables
-- =====================================================

-- Helper function to check sighting report ownership
CREATE OR REPLACE FUNCTION is_sighting_report_owner(p_report_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.sighting_reports 
        WHERE id = p_report_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Helper function to check if sighting report is approved
CREATE OR REPLACE FUNCTION is_sighting_report_approved(p_report_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.sighting_reports 
        WHERE id = p_report_id AND status = 'approved'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Person details policies
DROP POLICY IF EXISTS "View approved sighting person details" ON sighting_details_person;
CREATE POLICY "View approved sighting person details" ON sighting_details_person
    FOR SELECT USING (is_sighting_report_approved(report_id) OR is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Insert own sighting person details" ON sighting_details_person;
CREATE POLICY "Insert own sighting person details" ON sighting_details_person
    FOR INSERT WITH CHECK (is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Update own sighting person details" ON sighting_details_person;
CREATE POLICY "Update own sighting person details" ON sighting_details_person
    FOR UPDATE USING (is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Delete own sighting person details" ON sighting_details_person;
CREATE POLICY "Delete own sighting person details" ON sighting_details_person
    FOR DELETE USING (is_sighting_report_owner(report_id));

-- Pet details policies
DROP POLICY IF EXISTS "View approved sighting pet details" ON sighting_details_pet;
CREATE POLICY "View approved sighting pet details" ON sighting_details_pet
    FOR SELECT USING (is_sighting_report_approved(report_id) OR is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Insert own sighting pet details" ON sighting_details_pet;
CREATE POLICY "Insert own sighting pet details" ON sighting_details_pet
    FOR INSERT WITH CHECK (is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Update own sighting pet details" ON sighting_details_pet;
CREATE POLICY "Update own sighting pet details" ON sighting_details_pet
    FOR UPDATE USING (is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Delete own sighting pet details" ON sighting_details_pet;
CREATE POLICY "Delete own sighting pet details" ON sighting_details_pet
    FOR DELETE USING (is_sighting_report_owner(report_id));

-- Document details policies
DROP POLICY IF EXISTS "View approved sighting document details" ON sighting_details_document;
CREATE POLICY "View approved sighting document details" ON sighting_details_document
    FOR SELECT USING (is_sighting_report_approved(report_id) OR is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Insert own sighting document details" ON sighting_details_document;
CREATE POLICY "Insert own sighting document details" ON sighting_details_document
    FOR INSERT WITH CHECK (is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Update own sighting document details" ON sighting_details_document;
CREATE POLICY "Update own sighting document details" ON sighting_details_document
    FOR UPDATE USING (is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Delete own sighting document details" ON sighting_details_document;
CREATE POLICY "Delete own sighting document details" ON sighting_details_document
    FOR DELETE USING (is_sighting_report_owner(report_id));

-- Electronics details policies
DROP POLICY IF EXISTS "View approved sighting electronics details" ON sighting_details_electronics;
CREATE POLICY "View approved sighting electronics details" ON sighting_details_electronics
    FOR SELECT USING (is_sighting_report_approved(report_id) OR is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Insert own sighting electronics details" ON sighting_details_electronics;
CREATE POLICY "Insert own sighting electronics details" ON sighting_details_electronics
    FOR INSERT WITH CHECK (is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Update own sighting electronics details" ON sighting_details_electronics;
CREATE POLICY "Update own sighting electronics details" ON sighting_details_electronics
    FOR UPDATE USING (is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Delete own sighting electronics details" ON sighting_details_electronics;
CREATE POLICY "Delete own sighting electronics details" ON sighting_details_electronics
    FOR DELETE USING (is_sighting_report_owner(report_id));

-- Vehicle details policies
DROP POLICY IF EXISTS "View approved sighting vehicle details" ON sighting_details_vehicle;
CREATE POLICY "View approved sighting vehicle details" ON sighting_details_vehicle
    FOR SELECT USING (is_sighting_report_approved(report_id) OR is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Insert own sighting vehicle details" ON sighting_details_vehicle;
CREATE POLICY "Insert own sighting vehicle details" ON sighting_details_vehicle
    FOR INSERT WITH CHECK (is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Update own sighting vehicle details" ON sighting_details_vehicle;
CREATE POLICY "Update own sighting vehicle details" ON sighting_details_vehicle
    FOR UPDATE USING (is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Delete own sighting vehicle details" ON sighting_details_vehicle;
CREATE POLICY "Delete own sighting vehicle details" ON sighting_details_vehicle
    FOR DELETE USING (is_sighting_report_owner(report_id));

-- Other items details policies
DROP POLICY IF EXISTS "View approved sighting other details" ON sighting_details_other;
CREATE POLICY "View approved sighting other details" ON sighting_details_other
    FOR SELECT USING (is_sighting_report_approved(report_id) OR is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Insert own sighting other details" ON sighting_details_other;
CREATE POLICY "Insert own sighting other details" ON sighting_details_other
    FOR INSERT WITH CHECK (is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Update own sighting other details" ON sighting_details_other;
CREATE POLICY "Update own sighting other details" ON sighting_details_other
    FOR UPDATE USING (is_sighting_report_owner(report_id));

DROP POLICY IF EXISTS "Delete own sighting other details" ON sighting_details_other;
CREATE POLICY "Delete own sighting other details" ON sighting_details_other
    FOR DELETE USING (is_sighting_report_owner(report_id));

-- =====================================================
-- STEP 9: Create View for Easy Querying
-- =====================================================

CREATE OR REPLACE VIEW sighting_reports_with_details 
WITH (security_invoker = true) AS
SELECT 
    r.*,
    -- Person details
    p.first_name,
    p.last_name,
    p.approximate_age,
    p.gender,
    p.physical_description,
    p.clothing_description,
    -- Pet details
    pet.pet_type,
    pet.breed AS pet_breed,
    pet.color AS pet_color,
    pet.size AS pet_size,
    pet.has_collar,
    pet.collar_description,
    pet.condition AS pet_condition,
    -- Document details
    doc.document_type,
    doc.document_number,
    doc.owner_name,
    doc.condition AS document_condition,
    -- Electronics details
    elec.device_type,
    elec.brand AS device_brand,
    elec.model AS device_model,
    elec.color AS device_color,
    elec.condition AS electronics_condition,
    -- Vehicle details
    veh.vehicle_type,
    veh.brand AS vehicle_brand,
    veh.model AS vehicle_model,
    veh.color AS vehicle_color,
    veh.license_plate,
    veh.condition AS vehicle_condition,
    -- Other details
    oth.item_name,
    oth.item_description,
    oth.condition AS other_condition
FROM sighting_reports r
LEFT JOIN sighting_details_person p ON r.id = p.report_id AND r.report_type = 'person'
LEFT JOIN sighting_details_pet pet ON r.id = pet.report_id AND r.report_type = 'pet'
LEFT JOIN sighting_details_document doc ON r.id = doc.report_id AND r.report_type = 'document'
LEFT JOIN sighting_details_electronics elec ON r.id = elec.report_id AND r.report_type = 'electronics'
LEFT JOIN sighting_details_vehicle veh ON r.id = veh.report_id AND r.report_type = 'vehicle'
LEFT JOIN sighting_details_other oth ON r.id = oth.report_id AND r.report_type = 'other';

-- =====================================================
-- STEP 10: Add Comments for Documentation
-- =====================================================
COMMENT ON TABLE sighting_reports IS 'Core sighting reports table - stores found/seen items';
COMMENT ON TABLE sighting_details_person IS 'Detail table for person sighting reports';
COMMENT ON TABLE sighting_details_pet IS 'Detail table for pet sighting reports';
COMMENT ON TABLE sighting_details_document IS 'Detail table for document sighting reports';
COMMENT ON TABLE sighting_details_electronics IS 'Detail table for electronics sighting reports';
COMMENT ON TABLE sighting_details_vehicle IS 'Detail table for vehicle sighting reports';
COMMENT ON TABLE sighting_details_other IS 'Detail table for other item sighting reports';

COMMENT ON COLUMN sighting_reports.report_type IS 'Type of sighting: person, pet, document, electronics, vehicle, other';
COMMENT ON COLUMN sighting_reports.matched_report_id IS 'Reference to missing report if this sighting has been matched';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
