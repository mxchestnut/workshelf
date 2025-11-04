-- Create Kit (Platform Staff) and Roo (Hieroscope Admin)
-- Run this SQL directly against the Neon database

-- Kit's credentials:
-- Email: kit@workshelf.dev
-- Password: h@F%v$bx*@@*x$yDodXs
-- Keycloak ID: (generate in Keycloak)

-- Roo's credentials:
-- Email: roo@hieroscope.com
-- Password: RV^CGLEkUlJseK21FIa@
-- Keycloak ID: (generate in Keycloak)

BEGIN;

-- 1. Create Kit (Platform Staff)
INSERT INTO users (
    keycloak_id,
    email,
    username,
    display_name,
    is_active,
    is_verified,
    is_staff,
    tenant_id,
    created_at,
    updated_at
) VALUES (
    'kit-keycloak-id-placeholder',  -- Replace with actual Keycloak ID
    'kit@workshelf.dev',
    'kit',
    'Kit',
    true,
    true,
    true,  -- Platform staff
    1,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE
SET is_staff = true;

-- 2. Create Roo (Hieroscope Admin)
INSERT INTO users (
    keycloak_id,
    email,
    username,
    display_name,
    is_active,
    is_verified,
    is_staff,
    tenant_id,
    created_at,
    updated_at
) VALUES (
    'roo-keycloak-id-placeholder',  -- Replace with actual Keycloak ID
    'roo@hieroscope.com',
    'roo',
    'Roo',
    true,
    true,
    false,  -- Not platform staff
    1,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- 3. Create Hieroscope Group
INSERT INTO groups (
    name,
    slug,
    description,
    is_public,
    is_active,
    subdomain_requested,
    subdomain_approved,
    tags,
    created_at,
    updated_at
) VALUES (
    'Hieroscope',
    'hieroscope',
    'A creative community exploring divination, symbolism, and mystical arts through collaborative writing and storytelling.',
    true,
    true,
    'hieroscope',
    false,  -- Pending approval
    '["divination", "mysticism", "symbolism", "creative-writing"]'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (slug) DO NOTHING;

-- 4. Make Roo the owner of Hieroscope
INSERT INTO group_members (
    group_id,
    user_id,
    role,
    created_at,
    updated_at
)
SELECT 
    g.id,
    u.id,
    'owner',
    NOW(),
    NOW()
FROM groups g
CROSS JOIN users u
WHERE g.slug = 'hieroscope'
  AND u.email = 'roo@hieroscope.com'
ON CONFLICT (group_id, user_id) DO UPDATE
SET role = 'owner';

COMMIT;

-- Verify the setup
SELECT 
    'Users Created' as check_type,
    COUNT(*) as count
FROM users
WHERE email IN ('kit@workshelf.dev', 'roo@hieroscope.com')
UNION ALL
SELECT 
    'Kit is Staff' as check_type,
    COUNT(*) as count
FROM users
WHERE email = 'kit@workshelf.dev' AND is_staff = true
UNION ALL
SELECT 
    'Hieroscope Group' as check_type,
    COUNT(*) as count
FROM groups
WHERE slug = 'hieroscope'
UNION ALL
SELECT 
    'Roo is Owner' as check_type,
    COUNT(*) as count
FROM group_members gm
JOIN users u ON gm.user_id = u.id
JOIN groups g ON gm.group_id = g.id
WHERE u.email = 'roo@hieroscope.com'
  AND g.slug = 'hieroscope'
  AND gm.role = 'owner';
