-- =====================================================
-- L9ani Database Migration: Modular Report Schema
-- =====================================================
-- This migration creates a scalable, normalized database structure
-- with a core reports table and type-specific detail tables.
-- 
-- Design Pattern: Core Entity + Type-Specific Detail Entities
-- Relationship: One-to-One (each report has exactly one detail record)
-- =====================================================

-- =====================================================
-- STEP 1: Create the Report Types Enum
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type_enum') THEN
        CREATE TYPE report_type_enum AS ENUM ('person', 'pet', 'document', 'electronics', 'vehicle', 'other');
    END IF;
END $$;

-- =====================================================
-- STEP 2: Create the Core Reports Table
-- =====================================================
-- This table stores ONLY fields common to ALL report types
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Report metadata
    report_type report_type_enum NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'found', 'closed')),
    
    -- User who created the report
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Common location fields (all reports need location)
    city VARCHAR(200) NOT NULL,
    last_known_location TEXT NOT NULL,
    coordinates JSONB, -- { lat: number, lng: number }
    
    -- Common fields
    additional_info TEXT,
    
    -- Photos (common to all reports)
    photos TEXT[], -- Array of photo URLs
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Admin fields
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT
);

-- =====================================================
-- STEP 3: Create Type-Specific Detail Tables
-- =====================================================

-- ----- PERSON DETAILS -----
CREATE TABLE IF NOT EXISTS report_details_person (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    
    -- Health information
    health_status VARCHAR(50), -- healthy, physical, mental, both
    health_details TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----- PET DETAILS -----
CREATE TABLE IF NOT EXISTS report_details_pet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    
    pet_name VARCHAR(200) NOT NULL,
    pet_type VARCHAR(100) NOT NULL, -- dog, cat, bird, etc.
    breed VARCHAR(100),
    color VARCHAR(100),
    size VARCHAR(50), -- small, medium, large
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----- DOCUMENT DETAILS -----
CREATE TABLE IF NOT EXISTS report_details_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    
    document_type VARCHAR(100) NOT NULL, -- ID card, passport, license, etc.
    document_number VARCHAR(100),
    issuing_authority VARCHAR(200),
    owner_name VARCHAR(200),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----- ELECTRONICS DETAILS -----
CREATE TABLE IF NOT EXISTS report_details_electronics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    
    device_type VARCHAR(100) NOT NULL, -- phone, laptop, tablet, etc.
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    color VARCHAR(50),
    serial_number VARCHAR(200), -- IMEI for phones
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----- VEHICLE DETAILS -----
CREATE TABLE IF NOT EXISTS report_details_vehicle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    
    vehicle_type VARCHAR(100) NOT NULL, -- car, motorcycle, bicycle, etc.
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    color VARCHAR(50),
    year VARCHAR(10),
    license_plate VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----- OTHER ITEMS DETAILS -----
CREATE TABLE IF NOT EXISTS report_details_other (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    
    item_name VARCHAR(200) NOT NULL,
    item_description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 4: Create Indexes for Performance
-- =====================================================

-- Core reports table indexes
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_city ON reports(city);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_type_status ON reports(report_type, status);

-- Detail tables indexes (for joins)
CREATE INDEX IF NOT EXISTS idx_report_details_person_report_id ON report_details_person(report_id);
CREATE INDEX IF NOT EXISTS idx_report_details_pet_report_id ON report_details_pet(report_id);
CREATE INDEX IF NOT EXISTS idx_report_details_document_report_id ON report_details_document(report_id);
CREATE INDEX IF NOT EXISTS idx_report_details_electronics_report_id ON report_details_electronics(report_id);
CREATE INDEX IF NOT EXISTS idx_report_details_vehicle_report_id ON report_details_vehicle(report_id);
CREATE INDEX IF NOT EXISTS idx_report_details_other_report_id ON report_details_other(report_id);

-- Search indexes for detail tables
CREATE INDEX IF NOT EXISTS idx_person_names ON report_details_person(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_pet_name ON report_details_pet(pet_name);
CREATE INDEX IF NOT EXISTS idx_vehicle_plate ON report_details_vehicle(license_plate);
CREATE INDEX IF NOT EXISTS idx_electronics_serial ON report_details_electronics(serial_number);

-- =====================================================
-- STEP 5: Create Updated_at Trigger Function
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to reports table
DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 6: Enable Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_details_person ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_details_pet ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_details_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_details_electronics ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_details_vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_details_other ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 7: RLS Policies for Reports Table
-- =====================================================

-- Users can view approved reports (public)
DROP POLICY IF EXISTS "Anyone can view approved reports" ON reports;
CREATE POLICY "Anyone can view approved reports" ON reports
    FOR SELECT
    USING (status = 'approved');

-- Users can view their own reports (any status)
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own reports
DROP POLICY IF EXISTS "Users can create own reports" ON reports;
CREATE POLICY "Users can create own reports" ON reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending reports
DROP POLICY IF EXISTS "Users can update own pending reports" ON reports;
CREATE POLICY "Users can update own pending reports" ON reports
    FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending');

-- Users can delete their own reports
DROP POLICY IF EXISTS "Users can delete own reports" ON reports;
CREATE POLICY "Users can delete own reports" ON reports
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- STEP 8: RLS Policies for Detail Tables
-- =====================================================

-- Helper function to check report ownership
CREATE OR REPLACE FUNCTION is_report_owner(p_report_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM reports 
        WHERE id = p_report_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if report is approved
CREATE OR REPLACE FUNCTION is_report_approved(p_report_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM reports 
        WHERE id = p_report_id AND status = 'approved'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply RLS policies to each detail table
-- (Using a DO block to apply same pattern to all detail tables)

-- Person details policies
DROP POLICY IF EXISTS "View approved person details" ON report_details_person;
CREATE POLICY "View approved person details" ON report_details_person
    FOR SELECT USING (is_report_approved(report_id) OR is_report_owner(report_id));

DROP POLICY IF EXISTS "Insert own person details" ON report_details_person;
CREATE POLICY "Insert own person details" ON report_details_person
    FOR INSERT WITH CHECK (is_report_owner(report_id));

DROP POLICY IF EXISTS "Update own person details" ON report_details_person;
CREATE POLICY "Update own person details" ON report_details_person
    FOR UPDATE USING (is_report_owner(report_id));

DROP POLICY IF EXISTS "Delete own person details" ON report_details_person;
CREATE POLICY "Delete own person details" ON report_details_person
    FOR DELETE USING (is_report_owner(report_id));

-- Pet details policies
DROP POLICY IF EXISTS "View approved pet details" ON report_details_pet;
CREATE POLICY "View approved pet details" ON report_details_pet
    FOR SELECT USING (is_report_approved(report_id) OR is_report_owner(report_id));

DROP POLICY IF EXISTS "Insert own pet details" ON report_details_pet;
CREATE POLICY "Insert own pet details" ON report_details_pet
    FOR INSERT WITH CHECK (is_report_owner(report_id));

DROP POLICY IF EXISTS "Update own pet details" ON report_details_pet;
CREATE POLICY "Update own pet details" ON report_details_pet
    FOR UPDATE USING (is_report_owner(report_id));

DROP POLICY IF EXISTS "Delete own pet details" ON report_details_pet;
CREATE POLICY "Delete own pet details" ON report_details_pet
    FOR DELETE USING (is_report_owner(report_id));

-- Document details policies
DROP POLICY IF EXISTS "View approved document details" ON report_details_document;
CREATE POLICY "View approved document details" ON report_details_document
    FOR SELECT USING (is_report_approved(report_id) OR is_report_owner(report_id));

DROP POLICY IF EXISTS "Insert own document details" ON report_details_document;
CREATE POLICY "Insert own document details" ON report_details_document
    FOR INSERT WITH CHECK (is_report_owner(report_id));

DROP POLICY IF EXISTS "Update own document details" ON report_details_document;
CREATE POLICY "Update own document details" ON report_details_document
    FOR UPDATE USING (is_report_owner(report_id));

DROP POLICY IF EXISTS "Delete own document details" ON report_details_document;
CREATE POLICY "Delete own document details" ON report_details_document
    FOR DELETE USING (is_report_owner(report_id));

-- Electronics details policies
DROP POLICY IF EXISTS "View approved electronics details" ON report_details_electronics;
CREATE POLICY "View approved electronics details" ON report_details_electronics
    FOR SELECT USING (is_report_approved(report_id) OR is_report_owner(report_id));

DROP POLICY IF EXISTS "Insert own electronics details" ON report_details_electronics;
CREATE POLICY "Insert own electronics details" ON report_details_electronics
    FOR INSERT WITH CHECK (is_report_owner(report_id));

DROP POLICY IF EXISTS "Update own electronics details" ON report_details_electronics;
CREATE POLICY "Update own electronics details" ON report_details_electronics
    FOR UPDATE USING (is_report_owner(report_id));

DROP POLICY IF EXISTS "Delete own electronics details" ON report_details_electronics;
CREATE POLICY "Delete own electronics details" ON report_details_electronics
    FOR DELETE USING (is_report_owner(report_id));

-- Vehicle details policies
DROP POLICY IF EXISTS "View approved vehicle details" ON report_details_vehicle;
CREATE POLICY "View approved vehicle details" ON report_details_vehicle
    FOR SELECT USING (is_report_approved(report_id) OR is_report_owner(report_id));

DROP POLICY IF EXISTS "Insert own vehicle details" ON report_details_vehicle;
CREATE POLICY "Insert own vehicle details" ON report_details_vehicle
    FOR INSERT WITH CHECK (is_report_owner(report_id));

DROP POLICY IF EXISTS "Update own vehicle details" ON report_details_vehicle;
CREATE POLICY "Update own vehicle details" ON report_details_vehicle
    FOR UPDATE USING (is_report_owner(report_id));

DROP POLICY IF EXISTS "Delete own vehicle details" ON report_details_vehicle;
CREATE POLICY "Delete own vehicle details" ON report_details_vehicle
    FOR DELETE USING (is_report_owner(report_id));

-- Other items details policies
DROP POLICY IF EXISTS "View approved other details" ON report_details_other;
CREATE POLICY "View approved other details" ON report_details_other
    FOR SELECT USING (is_report_approved(report_id) OR is_report_owner(report_id));

DROP POLICY IF EXISTS "Insert own other details" ON report_details_other;
CREATE POLICY "Insert own other details" ON report_details_other
    FOR INSERT WITH CHECK (is_report_owner(report_id));

DROP POLICY IF EXISTS "Update own other details" ON report_details_other;
CREATE POLICY "Update own other details" ON report_details_other
    FOR UPDATE USING (is_report_owner(report_id));

DROP POLICY IF EXISTS "Delete own other details" ON report_details_other;
CREATE POLICY "Delete own other details" ON report_details_other
    FOR DELETE USING (is_report_owner(report_id));

-- =====================================================
-- STEP 9: Create Views for Easy Querying
-- =====================================================

-- View: All reports with their details (for internal use)
CREATE OR REPLACE VIEW reports_with_details AS
SELECT 
    r.*,
    -- Person details
    p.first_name,
    p.last_name,
    p.date_of_birth,
    p.gender,
    p.health_status,
    p.health_details,
    -- Pet details
    pet.pet_name,
    pet.pet_type,
    pet.breed AS pet_breed,
    pet.color AS pet_color,
    pet.size AS pet_size,
    -- Document details
    doc.document_type,
    doc.document_number,
    doc.issuing_authority,
    doc.owner_name,
    -- Electronics details
    elec.device_type,
    elec.brand AS device_brand,
    elec.model AS device_model,
    elec.color AS device_color,
    elec.serial_number,
    -- Vehicle details
    veh.vehicle_type,
    veh.brand AS vehicle_brand,
    veh.model AS vehicle_model,
    veh.color AS vehicle_color,
    veh.year AS vehicle_year,
    veh.license_plate,
    -- Other details
    oth.item_name,
    oth.item_description
FROM reports r
LEFT JOIN report_details_person p ON r.id = p.report_id AND r.report_type = 'person'
LEFT JOIN report_details_pet pet ON r.id = pet.report_id AND r.report_type = 'pet'
LEFT JOIN report_details_document doc ON r.id = doc.report_id AND r.report_type = 'document'
LEFT JOIN report_details_electronics elec ON r.id = elec.report_id AND r.report_type = 'electronics'
LEFT JOIN report_details_vehicle veh ON r.id = veh.report_id AND r.report_type = 'vehicle'
LEFT JOIN report_details_other oth ON r.id = oth.report_id AND r.report_type = 'other';

-- =====================================================
-- STEP 10: Add Comments for Documentation
-- =====================================================
COMMENT ON TABLE reports IS 'Core reports table - stores common fields for all report types';
COMMENT ON TABLE report_details_person IS 'Detail table for missing person reports';
COMMENT ON TABLE report_details_pet IS 'Detail table for lost pet reports';
COMMENT ON TABLE report_details_document IS 'Detail table for lost document reports';
COMMENT ON TABLE report_details_electronics IS 'Detail table for lost electronics reports';
COMMENT ON TABLE report_details_vehicle IS 'Detail table for lost vehicle reports';
COMMENT ON TABLE report_details_other IS 'Detail table for other lost items reports';

COMMENT ON COLUMN reports.report_type IS 'Type of report: person, pet, document, electronics, vehicle, other';
COMMENT ON COLUMN reports.coordinates IS 'JSON object with lat and lng coordinates';
COMMENT ON COLUMN reports.photos IS 'Array of photo URLs stored in Supabase storage';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- To add a new report type in the future:
-- 1. Add the new type to report_type_enum
-- 2. Create a new report_details_[type] table
-- 3. Add RLS policies for the new table
-- 4. Update the reports_with_details view
-- =====================================================
