# AI Agent Test Commands

This guide provides a comprehensive list of commands to test all the accessibility scanning features in TestraAI.

## Prerequisites

1. **Login to the app**: http://localhost:3000/login
   - Email: `admin@testraai.com`
   - Password: `admin123`

2. **Navigate to AI Agent**: Click on "AI Agent" in the sidebar

---

## Basic Scanning Commands

### 1. Simple Website Scan
```
scan https://google.com
```
**Expected Result**: Scans Google.com for WCAG 2.1 A/AA compliance, shows live progress with screenshots

### 2. Scan with Different URL
```
scan https://example.com
```
**Expected Result**: Scans example.com and displays accessibility issues

### 3. Scan a Complex Website
```
scan https://github.com
```
**Expected Result**: Discovers and scans multiple pages on GitHub

### 4. Scan an E-commerce Site
```
scan https://amazon.com
```
**Expected Result**: Scans Amazon homepage and related pages

---

## WCAG Standards Testing

### 5. WCAG 2.0 Level A
```
scan https://google.com for WCAG 2.0 Level A
```
**Expected Result**: Scans using only WCAG 2.0 Level A criteria

### 6. WCAG 2.1 Level AA
```
scan https://google.com for WCAG 2.1 AA compliance
```
**Expected Result**: Scans using WCAG 2.1 Level AA criteria

### 7. WCAG 2.2 Level AAA
```
scan https://google.com for WCAG 2.2 AAA
```
**Expected Result**: Scans using the strictest WCAG 2.2 Level AAA criteria

### 8. Section 508 Compliance
```
scan https://google.com for Section 508 compliance
```
**Expected Result**: Scans using U.S. federal Section 508 standards

---

## Category-Based Scanning

### 9. ARIA Issues Only
```
scan https://google.com for ARIA issues
```
**Expected Result**: Focuses on ARIA-related accessibility issues

### 10. Color Contrast Issues
```
scan https://google.com for color contrast issues
```
**Expected Result**: Identifies color contrast violations

### 11. Form Accessibility
```
scan https://google.com for form accessibility
```
**Expected Result**: Checks form labels, inputs, and controls

### 12. Keyboard Navigation
```
scan https://google.com for keyboard accessibility
```
**Expected Result**: Tests keyboard navigation and focus management

### 13. Image Alt Text
```
scan https://google.com for image alt text issues
```
**Expected Result**: Checks for missing or improper alt text on images

---

## Previous Results Commands

### 14. View Previous Scan Results
```
show me the results for https://google.com
```
**Expected Result**: Displays results from the most recent scan of Google.com

### 15. Get Latest Scan
```
what were the results of the last scan?
```
**Expected Result**: Shows results from the most recently completed scan

### 16. Check Specific URL Results
```
show results for https://example.com
```
**Expected Result**: Displays scan results for example.com if previously scanned

---

## Conversational Commands

### 17. Natural Language Scan Request
```
Can you check if google.com is accessible?
```
**Expected Result**: Initiates an accessibility scan of Google.com

### 18. Ask About Accessibility
```
Is https://github.com WCAG compliant?
```
**Expected Result**: Scans GitHub and reports compliance status

### 19. Request Detailed Analysis
```
Analyze https://amazon.com for accessibility issues
```
**Expected Result**: Performs comprehensive accessibility analysis

### 20. Multiple Concerns
```
Check https://google.com for color contrast and keyboard navigation
```
**Expected Result**: Scans focusing on color and keyboard categories

---

## Advanced Testing Scenarios

### 21. Scan After Previous Scan
```
scan https://google.com
```
*Wait for completion, then:*
```
scan https://example.com
```
**Expected Result**: Both scans complete successfully, LiveTestingPanel updates for each

### 22. Request Results During Scan
```
scan https://google.com
```
*While scanning:*
```
show me the current results
```
**Expected Result**: Shows live progress or waits for completion

### 23. Scan Same URL Twice
```
scan https://google.com
```
*Wait for completion, then:*
```
scan https://google.com again
```
**Expected Result**: Initiates a new scan of the same URL

---

## Download and Export Testing

### 24. After Scan Completion
After any scan completes, you should see:
- ✅ **View Full Scan Results** button
- ✅ **Excel** download button
- ✅ **JSON** download button

**Test Actions**:
1. Click "View Full Scan Results" → Opens detailed scan report page
2. Click "Excel" → Downloads Excel report
3. Click "JSON" → Downloads JSON report

---

## LiveTestingPanel Features to Verify

During any scan, the LiveTestingPanel should show:

### Real-Time Updates
- ✅ **Progress bar** updating as pages are scanned
- ✅ **Current page** being tested
- ✅ **Pages discovered** count
- ✅ **Pages tested** count
- ✅ **Issues found** count

### Screenshots
- ✅ **Latest screenshot** from the current page being tested
- ✅ Screenshot updates as new pages are scanned

### Activity Log
- ✅ "Starting scan for [URL]"
- ✅ "Discovered: [page URL]"
- ✅ "Testing [X/Y]: [page URL]"
- ✅ "CRITICAL: [issue description]"
- ✅ "WARNING: [issue description]"
- ✅ "Scan complete! Found X issues across Y pages"

### Recent Issues Panel
- ✅ Shows last 20 issues found
- ✅ Displays severity badges (Critical, Warning, Minor)
- ✅ Shows issue descriptions
- ✅ Includes affected URLs

---

## Browser Console Verification

Open browser console (Cmd + Option + C on Mac, F12 on Windows) and look for:

### During Scan
```
[LiveTestingPanel] WebSocket message received: {type: "scan_start", ...}
[LiveTestingPanel] WebSocket message received: {type: "page_discovered", ...}
[LiveTestingPanel] WebSocket message received: {type: "page_testing", ...}
[LiveTestingPanel] WebSocket message received: {type: "issue_found", ...}
[LiveTestingPanel] WebSocket message received: {type: "scan_complete", ...}
```

### No Errors
- ❌ No WebSocket connection errors
- ❌ No "invalid input value for enum severity" errors
- ❌ No React rendering errors

---

## Expected Scan Results

### Google.com Typical Results
- **Pages**: 5-15 pages discovered
- **Issues**: 20-50 accessibility issues
- **Common Issues**:
  - Color contrast violations
  - Missing ARIA labels
  - Link text issues
  - Image alt text problems

### Example.com Typical Results
- **Pages**: 1 page (simple site)
- **Issues**: 0-5 issues (very accessible)
- **Duration**: ~10-15 seconds

### GitHub.com Typical Results
- **Pages**: 10-20 pages
- **Issues**: 30-100 issues
- **Duration**: 30-60 seconds

---

## Troubleshooting

### If Scan Doesn't Start
1. Check browser console for errors
2. Verify WebSocket connection is established
3. Refresh the page and try again

### If LiveTestingPanel Shows "Waiting for first page to load..."
1. Check server logs for scan progress
2. Verify WebSocket messages are being sent
3. Check browser console for WebSocket messages

### If Results Don't Appear After "Scan Complete"
1. **Scroll down** in the chat to see the completion message
2. **Refresh the page** to reload messages
3. Check database: `psql postgresql://localhost/testraai -c "SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 5;"`

### If Download Buttons Don't Work
1. Verify scan completed successfully
2. Check that `scanRunId` is in the message metadata
3. Look for the scan in `/scans/[scanRunId]` page

---

## Success Criteria

A successful test should show:

✅ **Scan initiates** within 2-3 seconds of sending command  
✅ **LiveTestingPanel appears** with real-time updates  
✅ **Screenshots display** as pages are tested  
✅ **Activity log updates** with scan progress  
✅ **Issues appear** in the Recent Issues panel  
✅ **Scan completes** with summary message  
✅ **View Results button** appears after completion  
✅ **Download buttons** work (Excel, JSON)  
✅ **No database errors** in server logs  
✅ **No WebSocket errors** in browser console  

---

## Quick Test Sequence

For a quick end-to-end test, run these commands in order:

```
1. scan https://example.com
   → Wait for completion (~15 seconds)
   → Verify results appear
   → Click "View Full Scan Results"

2. scan https://google.com
   → Watch LiveTestingPanel for real-time updates
   → Verify screenshots appear
   → Wait for completion (~30 seconds)
   → Download Excel report

3. show me the results for https://example.com
   → Verify previous results are displayed
   → Confirm no new scan is triggered
```

---

## Notes

- **Scan Duration**: Varies by website complexity (10 seconds to 2 minutes)
- **Issue Counts**: Depend on website accessibility quality
- **WebSocket**: Must be connected for live updates
- **Database**: All results are persisted for future reference
- **Reports**: Available in JSON, Excel, and HTML formats

---

## Support

If you encounter issues:
1. Check server logs in Terminal 15
2. Check browser console for client-side errors
3. Verify database connection: `psql postgresql://localhost/testraai -c "\dt"`
4. Restart the app: Kill Terminal 15 and run `npm run dev`

