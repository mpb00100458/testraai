-- Fix pages_scanned and total_pages for existing scans
-- This script counts the actual pages scanned and updates the scan_runs table

UPDATE scan_runs sr
SET 
  pages_scanned = subquery.page_count,
  total_pages = subquery.page_count
FROM (
  SELECT 
    scan_run_id,
    COUNT(DISTINCT page_id) as page_count
  FROM a11y_results
  GROUP BY scan_run_id
) AS subquery
WHERE sr.id = subquery.scan_run_id;

-- Show the updated results
SELECT 
  id,
  status,
  pages_scanned,
  total_pages,
  critical_issues + warning_issues + minor_issues as total_issues
FROM scan_runs
ORDER BY started_at DESC
LIMIT 10;

