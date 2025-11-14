# Severity Enum Database Fix

## Problem

The accessibility scan was failing with the following error:

```
error: invalid input value for enum severity: "warning"
```

## Root Cause

The application code was using a simplified severity mapping:
- `critical` - for critical and serious issues
- `warning` - for moderate issues  
- `minor` - for minor issues
- `pass` - for passed checks

However, the database schema (`shared/schema.ts`) only defined:
- `critical`
- `serious`
- `moderate`
- `minor`
- `pass`

The `mapImpactToSeverity()` function in `server/agents/realScanAgent.ts` was mapping axe-core's `moderate` impact to `'warning'`, which didn't exist in the database enum.

## Solution

### 1. Updated Database Schema

Modified `shared/schema.ts` line 226 to include `'warning'`:

```typescript
export const severityEnum = pgEnum('severity', ['critical', 'serious', 'moderate', 'minor', 'pass', 'warning']);
```

### 2. Applied Schema Migration

Ran `npm run db:push` to update the PostgreSQL database with the new enum value.

### 3. Verified Database Update

Confirmed the enum was updated successfully:

```sql
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'severity') 
ORDER BY enumsortorder;
```

Result:
```
 enumlabel 
-----------
 critical
 serious
 moderate
 minor
 pass
 warning
```

### 4. Restarted Application

Killed and restarted the development server to ensure the updated schema is loaded.

## Files Modified

1. **`shared/schema.ts`** - Added `'warning'` to severity enum
2. **`db/migrations/add_warning_to_severity_enum.sql`** - Created migration file (for reference)

## Testing

After the fix:
1. Navigate to http://localhost:3000
2. Login with admin credentials
3. Go to AI Agent page
4. Trigger a scan: "scan https://google.com"
5. The scan should now complete successfully without database errors

## Impact

This fix allows the application to:
- ✅ Store accessibility scan results with `'warning'` severity
- ✅ Complete scans without database enum validation errors
- ✅ Maintain backward compatibility with existing severity values
- ✅ Support the simplified severity model used throughout the UI

## Related Components

The following components use the severity values and will continue to work correctly:

- `client/src/components/SeverityBadge.tsx` - Displays severity badges
- `client/src/components/LiveTestingPanel.tsx` - Real-time scan progress
- `client/src/components/VisualIssueViewer.tsx` - Visual issue highlighting
- `server/agents/scoreCalculator.ts` - Accessibility score calculation
- `server/routes.ts` - API endpoints for scan results

## Notes

- The database now supports both the axe-core native values (`serious`, `moderate`) and the application's simplified `'warning'` value
- The `mapImpactToSeverity()` function continues to map `moderate` → `warning` and `serious` → `critical`
- This maintains consistency with the UI components that expect `critical`, `warning`, `minor`, `pass` values

