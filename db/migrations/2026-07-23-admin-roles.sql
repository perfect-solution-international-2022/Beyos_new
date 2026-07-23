-- Adds sub-roles within the admin account type: super (full access),
-- manager (everything except Users/Settings/Withdrawals), cashier (POS only).
-- Only meaningful when users.role = 'admin'. Existing admins default to 'super'
-- so nobody is locked out after this migration runs.
ALTER TABLE users
  ADD COLUMN admin_role ENUM('super','manager','cashier') NULL DEFAULT NULL;

UPDATE users SET admin_role = 'super' WHERE role = 'admin' AND admin_role IS NULL;
