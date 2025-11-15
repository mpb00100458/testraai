# 📊 MCP Server - Live Activity Logs Guide

## 🎉 **NEW! Real-Time Activity Logging During Scans**

The MCP server now shows **live activity logs** with real-time progress updates while scanning! See exactly what's happening at every step.

---

## ✅ **What You'll See**

### **Live Progress Updates:**
- ✅ **Real-time status** for every scan phase
- ✅ **Timing information** (seconds) for each step
- ✅ **File sizes** for generated reports
- ✅ **Violation counts** as they're discovered
- ✅ **Visual indicators** with icons and progress bars
- ✅ **Multi-page progress** tracking (Page 1/10, 2/10, etc.)

---

## 📋 **Activity Log Sections**

### **1. Scan Initialization**
```
================================================================================
🚀 [SCAN STARTED] 9:30:45 AM
================================================================================
📍 URL: https://example.com
📊 WCAG Level: AA
📁 Output Format: excel
💾 Save to File: true
👁️  Headless Mode: true
🎥 Video Recording: true
📸 Screenshots: true
================================================================================
```

### **2. Setup Phase**
```
⏳ [SETUP] Preparing video recording directory...
✅ [SETUP] Video directory ready: ~/mcp-accessibility-reports/videos
⏳ [SETUP] Preparing screenshots directory...
✅ [SETUP] Screenshots directory ready
```

### **3. Browser Launch**
```
⏳ [BROWSER] Launching browser (headless: true)...
✅ [BROWSER] Browser launched successfully
⏳ [BROWSER] Creating browser context...
✅ [BROWSER] Browser context created
🎥 [VIDEO] Recording enabled (1280x720)
```

### **4. Page Navigation**
```
⏳ [NAVIGATION] Navigating to https://example.com...
✅ [NAVIGATION] Page loaded successfully (2.34s)
```

### **5. Screenshot Capture**
```
⏳ [SCREENSHOT] Capturing "before" screenshot...
✅ [SCREENSHOT] Before screenshot saved: scan-2024-11-15-09-30-45-before.png
```

### **6. Accessibility Analysis**
```
⏳ [ANALYSIS] Running comprehensive accessibility analysis...
📋 [ANALYSIS] Testing against:
   - WCAG 2.0 (A, AA, AAA)
   - WCAG 2.1 (A, AA, AAA)
   - WCAG 2.2 (A, AA, AAA)
   - Section 508
   - All 13 accessibility categories
   - Best practices

✅ [ANALYSIS] Analysis complete (3.12s)
```

### **7. Results Summary**
```
📊 [RESULTS] Scan results:
   ✅ Passed: 45 checks
   ❌ Violations: 12 issues found
   🔴 Critical: 2
   🟠 Serious: 5
   🟡 Moderate: 3
   🔵 Minor: 2
```

### **8. Processing**
```
⏳ [PROCESSING] Preparing violation details...
```

### **9. Video Finalization**
```
⏳ [VIDEO] Finalizing video recording...
✅ [VIDEO] Video saved: scan-2024-11-15-09-30-45.webm (2.34 MB)
```

### **10. Report Generation**
```
⏳ [EXPORT] Generating report files (excel)...
   ⏳ Generating Excel report...
   ✅ Excel: accessibility-scan-2024-11-15-09-30-45.xlsx (45 KB)
   ⏳ Generating JSON report...
   ✅ JSON: accessibility-scan-2024-11-15-09-30-45.json (23 KB)
   ⏳ Generating Markdown report...
   ✅ Markdown: accessibility-scan-2024-11-15-09-30-45.md (18 KB)
✅ [EXPORT] All report files generated successfully
```

### **11. Cleanup**
```
⏳ [CLEANUP] Closing browser...
✅ [CLEANUP] Browser closed
```

### **12. Final Summary**
```
================================================================================
✅ [SCAN COMPLETE] 9:31:15 AM
================================================================================
⏱️  Total Time: 30.45s
📊 Results: 12 violations, 45 passes
📁 Files Generated: 3 report(s)
🎥 Video: scan-2024-11-15-09-30-45.webm
📸 Screenshots: 2
================================================================================
```

---

## 🌐 **Multi-Page Website Scans**

For website scans, you'll see progress for **each page**:

```
================================================================================
🌐 [WEBSITE SCAN STARTED] 9:35:00 AM
================================================================================
📍 Starting URL: https://example.com
📄 Max Pages: 10
📊 WCAG Level: AA
🎥 Video Recording: true
📸 Screenshots: true
================================================================================

⏳ [CRAWL] Starting website crawl...

────────────────────────────────────────────────────────────────────────────────
📄 [PAGE 1/10] https://example.com
────────────────────────────────────────────────────────────────────────────────
⏳ [NAVIGATION] Loading page...
✅ [NAVIGATION] Page loaded (2.15s)
⏳ [SCREENSHOT] Capturing page screenshot...
✅ [SCREENSHOT] Saved: page-1-1731672900123.png
⏳ [ANALYSIS] Running accessibility analysis...
✅ [ANALYSIS] Complete (3.45s)
📊 [RESULTS] Violations: 8, Passes: 42

────────────────────────────────────────────────────────────────────────────────
📄 [PAGE 2/10] https://example.com/about
────────────────────────────────────────────────────────────────────────────────
⏳ [NAVIGATION] Loading page...
✅ [NAVIGATION] Page loaded (1.89s)
⏳ [SCREENSHOT] Capturing page screenshot...
✅ [SCREENSHOT] Saved: page-2-1731672905234.png
⏳ [ANALYSIS] Running accessibility analysis...
✅ [ANALYSIS] Complete (2.98s)
📊 [RESULTS] Violations: 5, Passes: 48

... (continues for all pages)
```

---

## 🎯 **Where to See the Logs**

### **In Cursor IDE:**

The logs appear in **Cursor's terminal/console** while the scan is running.

**To view:**
1. Open Cursor IDE
2. Press `Cmd + L` to open AI chat
3. Run a scan command
4. **Look at the bottom panel** - you'll see live logs streaming!

**Example:**
```
Scan https://example.com and save as Excel
```

You'll see the logs appear in real-time in the terminal panel at the bottom of Cursor.

---

### **In Terminal (Direct MCP Server):**

If running the MCP server directly:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"scan_url_accessibility","arguments":{"url":"https://example.com"}}}' | node mcp-server/dist/index.js
```

Logs appear in `stderr` (standard error output).

---

## 💡 **Benefits of Live Logs**

### **1. Transparency**
- See exactly what's happening
- Understand scan progress
- Know when it's safe to wait

### **2. Debugging**
- Identify where scans slow down
- See which pages take longest
- Spot navigation issues

### **3. Performance Monitoring**
- Track timing for each phase
- Identify bottlenecks
- Optimize scan settings

### **4. Confidence**
- Know the scan is working
- See progress in real-time
- Understand file generation

### **5. Learning**
- Understand the scan process
- See what WCAG standards are tested
- Learn about accessibility analysis

---

## 📊 **Timing Information**

Every major step shows timing:

- **Navigation:** How long to load the page
- **Analysis:** How long to run accessibility checks
- **Total Time:** Complete scan duration

**Example:**
```
✅ [NAVIGATION] Page loaded (2.34s)
✅ [ANALYSIS] Complete (3.12s)
⏱️  Total Time: 30.45s
```

---

## 📁 **File Information**

See file sizes as they're generated:

```
✅ Excel: accessibility-scan-2024-11-15.xlsx (45 KB)
✅ JSON: accessibility-scan-2024-11-15.json (23 KB)
✅ Markdown: accessibility-scan-2024-11-15.md (18 KB)
🎥 Video: scan-2024-11-15.webm (2.34 MB)
```

---

## 🚀 **Try It Now!**

**Restart Cursor IDE** and run:

```
Scan https://example.com with video recording and save as Excel
```

**Watch the live logs appear!** You'll see:
1. 🚀 Scan initialization
2. ⏳ Browser launch
3. ⏳ Page navigation
4. ⏳ Analysis running
5. 📊 Results summary
6. 📁 File generation
7. ✅ Scan complete

---

## 🎨 **Log Icons Reference**

- 🚀 **Scan Started** - Initial setup
- ⏳ **In Progress** - Action happening
- ✅ **Complete** - Action finished
- 📍 **Location** - URL or path
- 📊 **Data** - Statistics or results
- 📁 **Files** - File operations
- 🎥 **Video** - Video recording
- 📸 **Screenshot** - Screenshot capture
- 🔴 **Critical** - Critical violations
- 🟠 **Serious** - Serious violations
- 🟡 **Moderate** - Moderate violations
- 🔵 **Minor** - Minor violations
- ❌ **Violations** - Issues found
- ✅ **Passes** - Checks passed
- ⏱️  **Timing** - Duration information

---

**🎊 Now you can watch your scans happen in real-time!**

