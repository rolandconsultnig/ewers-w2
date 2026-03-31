-- Every user must belong to a department (slug used by shared/department-access.ts).
UPDATE users
SET department = 'early_warning'
WHERE department IS NULL OR TRIM(department) = '';

ALTER TABLE users
  ALTER COLUMN department SET DEFAULT 'early_warning';

ALTER TABLE users
  ALTER COLUMN department SET NOT NULL;
