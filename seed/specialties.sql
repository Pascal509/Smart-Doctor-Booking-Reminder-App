-- Sample specialties data for testing
-- Run this SQL script in your PostgreSQL database to create sample specialties

INSERT INTO specialties (name, description, is_active, created_at, updated_at) VALUES
('Cardiology', 'Heart and cardiovascular system specialists', true, NOW(), NOW()),
('Dermatology', 'Skin, hair, and nail specialists', true, NOW(), NOW()),
('Neurology', 'Brain and nervous system specialists', true, NOW(), NOW()),
('Orthopedics', 'Bone, joint, and muscle specialists', true, NOW(), NOW()),
('Pediatrics', 'Children and adolescent healthcare specialists', true, NOW(), NOW()),
('Psychiatry', 'Mental health and behavioral specialists', true, NOW(), NOW()),
('Radiology', 'Medical imaging specialists', true, NOW(), NOW()),
('Surgery', 'General surgery specialists', true, NOW(), NOW()),
('Oncology', 'Cancer treatment specialists', true, NOW(), NOW()),
('Endocrinology', 'Hormone and gland specialists', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;