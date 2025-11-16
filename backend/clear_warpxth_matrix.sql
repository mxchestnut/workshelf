-- Clear Matrix credentials for warpxth to force re-registration
UPDATE users 
SET matrix_user_id = NULL, 
    matrix_access_token = NULL 
WHERE id = 1;

-- Verify the change
SELECT id, email, matrix_user_id, 
       CASE WHEN matrix_access_token IS NULL THEN 'NULL' ELSE 'SET' END as token_status
FROM users 
WHERE id = 1;
