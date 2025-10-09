-- Create employees table for facial recognition and shift management
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT DEFAULT 'employee', -- employee, manager, admin
  pin_code TEXT NOT NULL, -- 4-digit PIN code for check-in verification
  face_descriptor JSONB, -- Store face-api.js descriptor as JSON array
  face_image_url TEXT, -- Optional: store reference photo URL
  privacy_consent_accepted BOOLEAN DEFAULT false, -- Privacy disclosure acceptance
  privacy_consent_date TIMESTAMP WITH TIME ZONE, -- When they accepted
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance/shifts table
CREATE TABLE IF NOT EXISTS employee_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  shift_duration_minutes INTEGER, -- Calculated on check-out
  check_in_photo_url TEXT, -- Silent photo captured on check-in for audit
  check_out_photo_url TEXT, -- Silent photo captured on check-out for audit
  check_in_confidence FLOAT, -- Facial recognition confidence score (0-1)
  check_out_confidence FLOAT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast employee lookups
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON employee_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON employee_attendance(check_in_time);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on employees table
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE employees IS 'Employee records with facial recognition data';
COMMENT ON COLUMN employees.pin_code IS '4-digit PIN code for secondary verification during check-in';
COMMENT ON COLUMN employees.face_descriptor IS 'Face-api.js face descriptor (128-dimensional array)';
COMMENT ON COLUMN employees.privacy_consent_accepted IS 'Whether employee accepted privacy disclosure for facial recognition';
COMMENT ON COLUMN employees.privacy_consent_date IS 'Date and time when employee accepted privacy disclosure';
COMMENT ON TABLE employee_attendance IS 'Employee check-in/check-out attendance records';
COMMENT ON COLUMN employee_attendance.check_in_photo_url IS 'Silent audit photo captured during check-in (base64 or URL)';
COMMENT ON COLUMN employee_attendance.check_out_photo_url IS 'Silent audit photo captured during check-out (base64 or URL)';
COMMENT ON COLUMN employee_attendance.check_in_confidence IS 'Facial recognition match confidence (0.0-1.0)';
COMMENT ON COLUMN employee_attendance.check_out_confidence IS 'Facial recognition match confidence (0.0-1.0)';
