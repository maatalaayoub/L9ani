-- =====================================================
-- Migration: Fix SECURITY DEFINER on views
-- Date: 2024-12-17
-- Description: Changes views from SECURITY DEFINER to SECURITY INVOKER
--              to properly enforce RLS policies of the querying user
-- =====================================================

-- Drop and recreate the view with SECURITY INVOKER (default)
-- This ensures RLS policies are enforced based on the querying user

DROP VIEW IF EXISTS reports_with_details;

CREATE VIEW reports_with_details 
WITH (security_invoker = true) AS
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

-- Add comment for documentation
COMMENT ON VIEW reports_with_details IS 'View combining reports with their type-specific details. Uses SECURITY INVOKER to respect RLS policies.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
