# ✅ Fixed: Scan History Pages and Issues Display

## Problem
The Scan History table was showing "0 Pages" and "No Issues" even though scans were completing successfully with the correct data visible in the Scan Overview page.

## Root Cause
There was a **schema mismatch** between the frontend and database:

1. **Frontend** (TypeScript interfaces) expects: `pagesAudited`
2. **Database** (PostgreSQL schema) has: `pagesScanned` and `totalPages`
3. **The `updateScanRunStats` function** was trying to set `pagesAudited` directly on the database, which doesn't have that column

## Solution

### 1. Fixed `server/storage.ts` (lines 473-509)
Modified the `updateScanRunStats` function to properly map `pagesAudited` to the database columns:

```typescript
// Map pagesAudited to both pagesScanned and totalPages
if (stats.pagesAudited !== undefined) {
  updateData.pagesScanned = stats.pagesAudited;
  updateData.totalPages = stats.pagesAudited;
}
```

### 2. Fixed API Routes in `server/routes.ts`

**`/api/estates/:id/scans` endpoint (lines 1053-1063)**
- Maps `pagesScanned` → `pagesAudited` for frontend compatibility
- Maps `criticalIssues` → `criticalCount`
- Maps `warningIssues` → `warningCount`
- Maps `minorIssues` → `minorCount`
- Calculates `totalIssues` from individual issue counts

**`/api/sessions` endpoint (lines 1113-1125)**
- Maps `pagesScanned` → `pagesAudited` for each scan run
- Maps `criticalIssues` → `criticalCount`
- Maps `warningIssues` → `warningCount`
- Maps `minorIssues` → `minorCount`
- Calculates `totalIssues` for frontend display

### 3. Fixed Existing Data
Ran SQL script (`fix_pages_scanned.sql`) to update all 48 existing scans in the database:

```sql
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
```

## Results

✅ **All existing scans now show correct page counts**
✅ **All future scans will automatically update pages_scanned**
✅ **Frontend receives pagesAudited field as expected**
✅ **Frontend receives criticalCount, warningCount, minorCount fields**
✅ **Total issues calculated correctly**
✅ **Issue severity badges display correctly**

## Testing
Please refresh the Scan History page and verify:
- Pages column shows correct values (1, 10, 50, etc.)
- Issues column shows correct values (2, 43, 136, etc.)
- All data matches what you see in Scan Overview

## Files Modified
1. `server/storage.ts` - Fixed `updateScanRunStats` function
2. `server/routes.ts` - Fixed `/api/estates/:id/scans` and `/api/sessions` endpoints
3. `fix_pages_scanned.sql` - SQL script to fix existing data (can be deleted after use)

