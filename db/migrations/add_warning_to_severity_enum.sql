-- Add 'warning' to the severity enum to support the application's severity mapping
-- This allows both axe-core's native values (serious, moderate) and the app's simplified 'warning'

ALTER TYPE severity ADD VALUE IF NOT EXISTS 'warning';

-- Update existing 'serious' and 'moderate' values to 'warning' for consistency
UPDATE a11y_results SET severity = 'warning' WHERE severity IN ('serious', 'moderate');

