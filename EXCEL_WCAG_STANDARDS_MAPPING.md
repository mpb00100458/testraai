# Excel Report Enhancement: WCAG Standards Mapping

## Overview

Enhanced the Excel export functionality to include **WCAG Standards mapping** for each accessibility issue. This helps users understand which WCAG versions (2.0, 2.1, 2.2) each issue violates.

## Changes Made

### 1. Added New Columns to Excel Reports

Both Excel export endpoints now include two additional columns:

#### **WCAG Standards Column**
- Shows which WCAG versions the issue violates
- Examples:
  - `WCAG 2.0, WCAG 2.1, WCAG 2.2` - Issue exists in all versions
  - `WCAG 2.1, WCAG 2.2` - Issue introduced in WCAG 2.1
  - `WCAG 2.2` - Issue specific to WCAG 2.2

#### **Impact Column**
- Shows the original axe-core impact level
- Values: `critical`, `serious`, `moderate`, `minor`
- This is different from the simplified "Severity" column which maps to: `critical`, `warning`, `minor`, `pass`

### 2. Updated Excel Column Structure

**Before:**
```
Page URL | Severity | Issue Type | WCAG Criteria | Description | Element | Suggestion | Code Snippet | Impact Score
```

**After:**
```
Page URL | Severity | Issue Type | WCAG Criteria | WCAG Standards | Impact | Description | Element | Suggestion | Code Snippet | Impact Score
```

### 3. WCAG Standards Mapping Logic

The `mapWcagReferenceToStandards()` function determines which WCAG versions apply based on the criterion number:

#### WCAG 2.0 Criteria (Base)
All criteria from WCAG 2.0 are included in 2.1 and 2.2:
- 1.1.1 through 4.1.2 (excluding 2.1 and 2.2 additions)

#### WCAG 2.1 New Criteria
These criteria were introduced in WCAG 2.1 and are also in 2.2:
- **1.3.4** - Orientation
- **1.3.5** - Identify Input Purpose
- **1.3.6** - Identify Purpose
- **1.4.10** - Reflow
- **1.4.11** - Non-text Contrast
- **1.4.12** - Text Spacing
- **1.4.13** - Content on Hover or Focus
- **2.1.4** - Character Key Shortcuts
- **2.5.1** - Pointer Gestures
- **2.5.2** - Pointer Cancellation
- **2.5.3** - Label in Name
- **2.5.4** - Motion Actuation
- **2.5.5** - Target Size
- **2.5.6** - Concurrent Input Mechanisms
- **4.1.3** - Status Messages

#### WCAG 2.2 New Criteria
These criteria were introduced in WCAG 2.2:
- **2.4.11** - Focus Not Obscured (Minimum)
- **2.4.12** - Focus Not Obscured (Enhanced)
- **2.4.13** - Focus Appearance
- **2.5.7** - Dragging Movements
- **2.5.8** - Target Size (Minimum)
- **3.2.6** - Consistent Help
- **3.3.7** - Redundant Entry
- **3.3.8** - Accessible Authentication (Minimum)
- **3.3.9** - Accessible Authentication (Enhanced)

## Files Modified

### `server/routes.ts`

1. **Added helper function** (lines 50-96):
   ```typescript
   function mapWcagReferenceToStandards(wcagReference: string | null): string
   ```

2. **Updated `/api/estates/:id/report/excel` endpoint** (lines 774-878):
   - Added `WCAG Standards` column
   - Added `Impact` column
   - Calls `mapWcagReferenceToStandards()` for each issue

3. **Updated `/api/reports/excel` endpoint** (lines 1881-1918):
   - Added `WCAG Standards` column
   - Added `Impact` column
   - Calls `mapWcagReferenceToStandards()` for each issue

## Example Excel Output

### Sample Row

| Page URL | Severity | Issue Type | WCAG Criteria | WCAG Standards | Impact | Description |
|----------|----------|------------|---------------|----------------|--------|-------------|
| https://example.com | critical | color-contrast | 1.4.3 | WCAG 2.0, WCAG 2.1, WCAG 2.2 | serious | Elements must have sufficient color contrast |
| https://example.com | warning | label-content-name-mismatch | 2.5.3 | WCAG 2.1, WCAG 2.2 | moderate | Label text must be included in accessible name |
| https://example.com | warning | focus-order-semantics | 2.4.11 | WCAG 2.2 | moderate | Focus must not be obscured |

## Benefits

### 1. **Compliance Tracking**
Users can now easily identify which WCAG version they need to comply with:
- Government sites may need WCAG 2.0 Level AA
- Modern sites should target WCAG 2.1 Level AA
- Cutting-edge sites can aim for WCAG 2.2 Level AA

### 2. **Prioritization**
Issues that violate all WCAG versions (2.0, 2.1, 2.2) are fundamental accessibility problems and should be prioritized.

### 3. **Version-Specific Testing**
Teams can filter issues by WCAG version to focus on specific compliance requirements.

### 4. **Better Reporting**
Stakeholders can see exactly which standards are being violated, making it easier to communicate compliance status.

## Testing

### Test the Enhancement

1. **Run a scan:**
   ```
   scan https://google.com
   ```

2. **Download Excel report** after scan completes

3. **Verify new columns:**
   - Open the Excel file
   - Check "All Issues" worksheet
   - Verify "WCAG Standards" column shows version mappings
   - Verify "Impact" column shows axe-core impact levels

### Expected Results

- ✅ Excel file downloads successfully
- ✅ "WCAG Standards" column populated with version info
- ✅ "Impact" column shows original axe-core impact
- ✅ All existing columns still present
- ✅ Color coding for severity still works

## Technical Details

### Data Flow

1. **Scan runs** → axe-core returns violations with `tags` array
2. **Tags processed** → Extract WCAG criteria (e.g., `wcag244` → `2.4.4`)
3. **Stored in DB** → `wcagReference` field contains formatted criteria
4. **Excel export** → `mapWcagReferenceToStandards()` determines applicable versions
5. **Excel file** → Shows both criteria and applicable WCAG versions

### Database Fields Used

- `wcagReference` - Formatted WCAG criteria (e.g., "1.4.3, 2.4.4")
- `impact` - Original axe-core impact level
- `severity` - Simplified severity for UI display

### Backward Compatibility

- ✅ Existing Excel exports still work
- ✅ No database schema changes required
- ✅ All existing columns preserved
- ✅ Only adds new columns, doesn't modify existing data

## Future Enhancements

### Potential Improvements

1. **Section 508 Mapping**
   - Add column showing Section 508 compliance
   - Map WCAG criteria to Section 508 requirements

2. **Level Indicators**
   - Show which level (A, AA, AAA) each criterion belongs to
   - Example: "WCAG 2.1 Level AA"

3. **Best Practices**
   - Identify issues that are best practices vs. strict requirements
   - Separate compliance issues from recommendations

4. **Custom Standards**
   - Allow organizations to define custom accessibility standards
   - Map issues to internal compliance requirements

## Notes

- The mapping is based on official WCAG documentation
- All WCAG 2.0 criteria are included in 2.1 and 2.2 (backward compatible)
- WCAG 2.1 criteria are included in 2.2 (backward compatible)
- WCAG 2.2 criteria are only in version 2.2

## References

- [WCAG 2.0 Guidelines](https://www.w3.org/TR/WCAG20/)
- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [WCAG 2.2 Guidelines](https://www.w3.org/TR/WCAG22/)
- [What's New in WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [What's New in WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)

