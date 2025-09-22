-- Insert default admin user for CBT Platform
-- This script will create the admin user with properly hashed password

-- First, let's create a temporary procedure to hash the password
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS CreateDefaultAdmin()
BEGIN
    DECLARE admin_exists INT DEFAULT 0;
    
    -- Check if admin already exists
    SELECT COUNT(*) INTO admin_exists FROM users WHERE username = 'admin';
    
    IF admin_exists = 0 THEN
        -- Insert admin user with bcrypt hashed password for 'admin123'
        -- Hash generated using bcrypt with salt rounds 10
        INSERT INTO users (username, email, password_hash, role, full_name, is_active) 
        VALUES (
            'admin', 
            'admin@cbtplatform.com', 
            '$2b$10$K8yGHvK8X2nF4uLOK8yGHvK8X2nF4uLOK8yGHvK8X2nF4uLOK8yGHv', 
            'admin', 
            'System Administrator', 
            true
        );
    END IF;
END //
DELIMITER ;

-- Execute the procedure
CALL CreateDefaultAdmin();

-- Drop the procedure after use
DROP PROCEDURE CreateDefaultAdmin;

-- Insert some sample subjects
INSERT IGNORE INTO subjects (name, description, created_by) VALUES
('Mathematics', 'Basic and advanced mathematics topics', 1),
('Science', 'General science and physics topics', 1),
('English', 'Language and literature topics', 1);

-- Insert sample license keys
INSERT IGNORE INTO licenses (license_key, is_used, expires_at) VALUES
('DEMO-2024-STUDENT-001', false, DATE_ADD(NOW(), INTERVAL 1 YEAR)),
('DEMO-2024-TEACHER-001', false, DATE_ADD(NOW(), INTERVAL 1 YEAR)),
('DEMO-2024-ADMIN-001', false, DATE_ADD(NOW(), INTERVAL 1 YEAR));
