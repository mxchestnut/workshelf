-- Create missing user profiles for all users who don't have one
-- This inserts a profile for any user without one

INSERT INTO user_profiles (user_id, timezone, language, theme, created_at, updated_at)
SELECT 
    u.id,
    'UTC' as timezone,
    'en' as language,
    'system' as theme,
    NOW() as created_at,
    NOW() as updated_at
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE up.id IS NULL;

-- Show results
SELECT 
    u.id, 
    u.email, 
    u.username,
    CASE WHEN up.id IS NOT NULL THEN 'Has Profile' ELSE 'Missing Profile' END as profile_status
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
ORDER BY u.id;
