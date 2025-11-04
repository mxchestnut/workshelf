-- Manual migration: Add subdomain approval fields to groups table
-- Run this SQL directly in your Neon database console

-- Add subdomain approval columns
ALTER TABLE groups ADD COLUMN IF NOT EXISTS subdomain_requested VARCHAR(100);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS subdomain_approved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS subdomain_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS subdomain_approved_by INTEGER;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS subdomain_rejection_reason TEXT;

-- Create index on subdomain_requested
CREATE INDEX IF NOT EXISTS idx_groups_subdomain_requested ON groups(subdomain_requested);

-- Add foreign key constraint
ALTER TABLE groups 
ADD CONSTRAINT IF NOT EXISTS fk_groups_subdomain_approved_by 
FOREIGN KEY (subdomain_approved_by) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'groups' 
  AND column_name LIKE '%subdomain%'
ORDER BY column_name;
