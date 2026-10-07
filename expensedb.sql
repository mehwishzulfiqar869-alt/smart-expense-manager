INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES ('manager@company.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah', 'Manager', 'manager')
ON CONFLICT (email) DO NOTHING;

-- For Admin account (password: "password")
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES ('admin@company.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin')
ON CONFLICT (email) DO NOTHING;

-- For Employee account (password: "password")
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES ('ahmad@company.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ahmad', 'Employee', 'employee')
ON CONFLICT (email) DO NOTHING;


SELECT id, first_name, last_name, email, role FROM users;