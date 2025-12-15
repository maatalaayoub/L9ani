-- =====================================================
-- L9ani Database Migration: Admin Roles & Report Tables
-- =====================================================

-- =====================================================
-- 1. Create missing_persons table (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS missing_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    health_status VARCHAR(50),
    health_details TEXT,
    city VARCHAR(100) NOT NULL,
    last_known_location TEXT NOT NULL,
    coordinates JSONB,
    additional_info TEXT,
    photos TEXT[],
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for missing_persons
CREATE INDEX IF NOT EXISTS idx_missing_persons_user_id ON missing_persons(user_id);
CREATE INDEX IF NOT EXISTS idx_missing_persons_status ON missing_persons(status);
CREATE INDEX IF NOT EXISTS idx_missing_persons_city ON missing_persons(city);
CREATE INDEX IF NOT EXISTS idx_missing_persons_created_at ON missing_persons(created_at DESC);

-- =====================================================
-- 2. Create sightings table (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS sightings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    location_description TEXT NOT NULL,
    coordinates JSONB,
    reporter_first_name VARCHAR(100),
    reporter_last_name VARCHAR(100),
    reporter_phone VARCHAR(30) NOT NULL,
    reporter_email VARCHAR(255),
    additional_info TEXT,
    photos TEXT[],
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for sightings
CREATE INDEX IF NOT EXISTS idx_sightings_user_id ON sightings(user_id);
CREATE INDEX IF NOT EXISTS idx_sightings_status ON sightings(status);
CREATE INDEX IF NOT EXISTS idx_sightings_city ON sightings(city);
CREATE INDEX IF NOT EXISTS idx_sightings_created_at ON sightings(created_at DESC);

-- =====================================================
-- 3. Create admin_users table
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_auth_user_id ON admin_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);

-- =====================================================
-- 4. Enable RLS and create policies
-- =====================================================
ALTER TABLE missing_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policies for missing_persons
CREATE POLICY "Users can view approved missing persons" ON missing_persons
    FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can insert their own reports" ON missing_persons
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending reports" ON missing_persons
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can update any report" ON missing_persons
    FOR UPDATE USING (is_admin(auth.uid()));

-- Policies for sightings
CREATE POLICY "Users can view approved sightings" ON sightings
    FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Anyone can insert sighting reports" ON sightings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own pending sightings" ON sightings
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can update any sighting" ON sightings
    FOR UPDATE USING (is_admin(auth.uid()));

-- Policy for admin_users (service role only)
CREATE POLICY "Service role can manage admin_users" ON admin_users
    FOR ALL USING (true);

-- =====================================================
-- 5. Create helper functions
-- =====================================================

-- Function to check if a user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users 
        WHERE auth_user_id = user_id 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. Create triggers for updated_at
-- =====================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at on all tables
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_missing_persons_updated_at ON missing_persons;
CREATE TRIGGER update_missing_persons_updated_at
    BEFORE UPDATE ON missing_persons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sightings_updated_at ON sightings;
CREATE TRIGGER update_sightings_updated_at
    BEFORE UPDATE ON sightings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. Documentation comments                            
-- =====================================================
COMMENT ON TABLE admin_users IS 'Stores admin user privileges for the application';
COMMENT ON COLUMN admin_users.role IS 'Role type: admin, super_admin, etc.';
COMMENT ON COLUMN admin_users.is_active IS 'Whether the admin privileges are currently active';

COMMENT ON TABLE missing_persons IS 'Reports of missing persons submitted by users';
COMMENT ON COLUMN missing_persons.status IS 'Report status: pending, approved, rejected';

COMMENT ON TABLE sightings IS 'Sighting reports of potentially missing persons';
COMMENT ON COLUMN sightings.status IS 'Report status: pending, approved, rejected';
