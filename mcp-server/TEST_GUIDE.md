# 🧪 Testing Guide - MCP Accessibility Server

## Quick Start Testing

### Step 1: Get Your Absolute Path

Run this command to get the full path to your MCP server:

```bash
pwd
```

You'll get something like:
```
/home/runner/YourRepl
```

Your MCP server path will be:
```
/home/runner/YourRepl/mcp-server/dist/index.js
```

---

### Step 2: Configure Claude Desktop

#### **macOS:**
1. Open: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. If file doesn't exist, create it

#### **Windows:**
1. Open: `%APPDATA%\Claude\claude_desktop_config.json`
2. If file doesn't exist, create it

#### **Linux:**
1. Open: `~/.config/Claude/claude_desktop_config.json`
2. If file doesn't exist, create it

---

### Step 3: Add This Configuration

Replace the **ENTIRE** file content with:

```json
{
  "mcpServers": {
    "accessibility-testing": {
      "command": "node",
      "args": [
        "/home/runner/YourRepl/mcp-server/dist/index.js"
      ]
    }
  }
}
```

**⚠️ IMPORTANT:** Replace `/home/runner/YourRepl/` with your actual path from Step 1!

---

### Step 4: Restart Claude Desktop

1. **Quit** Claude Desktop completely (Cmd+Q on Mac, Alt+F4 on Windows)
2. **Reopen** Claude Desktop
3. Look for the **🔌 hammer icon** in the chat input area

---

## 🧪 Test Commands

### Test 1: Basic Scan ⭐ START HERE
```
Scan https://example.com for accessibility issues
```

**What to expect:**
- Accessibility report appears
- Shows critical/warning/minor issues
- Lists WCAG violations
- Takes ~5-10 seconds

**Success looks like:**
```
# Accessibility Scan Report
Target: https://example.com
Tested: 1 page

## Critical Issues (2)
- Images must have alternate text
  Impact: Critical
  WCAG: 1.1.1 (Level A)
  ...
```

---

### Test 2: WCAG Guidance
```
What does the color-contrast rule mean in WCAG?
```

**What to expect:**
- Detailed explanation
- Remediation strategies
- Code examples
- Takes ~1 second

---

### Test 3: Video Recording 🎥
```
Scan https://google.com and record a video
```

**What to expect:**
- Accessibility report
- Video file created
- **Download link appears!**
- Takes ~10-15 seconds (first time may be longer due to browser installation)

**Success looks like:**
```
## 🎬 Visual Feedback Files

**📹 Video Recording:**
- **scan-2025-10-19T10-45-30.webm**
  📥 **Download:** http://localhost:3456/videos/scan-2025-10-19T10-45-30.webm
  📁 Path: `/home/runner/mcp-accessibility-reports/videos/scan-2025-10-19T10-45-30.webm`
  ⏱️  Duration: ~8s
```

**Click the download link** to watch the video!

---

### Test 4: Excel Export 📊
```
Scan https://example.com and export as Excel
```

**What to expect:**
- Text report
- Excel file created
- **Download link appears!**
- Takes ~5-10 seconds

**Success looks like:**
```
## 📁 Generated Report Files

1. **accessibility-scan-2025-10-19T10-45-30.xlsx**
   📥 Download: http://localhost:3456/reports/accessibility-scan-2025-10-19T10-45-30.xlsx
   📁 Path: `/home/runner/mcp-accessibility-reports/accessibility-scan-2025-10-19T10-45-30.xlsx`
```

**Open the Excel file** to see color-coded violations:
- 🔴 Red = Critical
- 🟠 Orange = Serious
- 🟡 Yellow = Moderate
- 🔵 Blue = Minor

---

### Test 5: Live Browser Window 👁️
```
Scan https://google.com and show me the browser
```

**What to expect:**
- **Browser window appears on your screen!**
- You see Playwright navigating
- Window closes when done
- Takes ~10 seconds

---

### Test 6: Full Package 🎁
```
Scan https://example.com with full visual feedback and export all formats
```

**What to expect:**
- Text report
- Excel + JSON + Markdown files
- Video recording
- Screenshots
- **Download links for everything!**
- Takes ~15-20 seconds

**Success looks like:**
```
## 📁 Generated Report Files
1. **accessibility-scan-2025-10-19T10-45-30.xlsx**
   📥 Download: http://localhost:3456/reports/...
2. **accessibility-scan-2025-10-19T10-45-30.json**
   📥 Download: http://localhost:3456/reports/...
3. **accessibility-scan-2025-10-19T10-45-30.md**
   📥 Download: http://localhost:3456/reports/...

## 🎬 Visual Feedback Files
**📹 Video Recording:**
- 📥 Download: http://localhost:3456/videos/...
**📸 Screenshots:**
1. 📥 Download: http://localhost:3456/screenshots/...
2. 📥 Download: http://localhost:3456/screenshots/...
```

---

## 🌐 Test HTTP Download Server

### Test 1: Check Server Running
Open browser and visit:
```
http://localhost:3456/
```

**Expected:**
- Welcome page with server info
- Usage instructions

### Test 2: Download a Video
After running a video scan, click the download link in Claude's response.

**Expected:**
- Video downloads or plays in browser
- Should see the scan session!

### Test 3: Download Excel
After running an Excel export, click the download link.

**Expected:**
- File downloads
- Opens in Excel/LibreOffice
- See color-coded violations

---

## ✅ Success Checklist

After testing, you should see:

- [ ] MCP tools appear in Claude Desktop (🔌 hammer icon)
- [ ] Basic scan returns accessibility report
- [ ] WCAG guidance provides explanations
- [ ] Video recording creates `.webm` file
- [ ] Excel export creates `.xlsx` file with colors
- [ ] Download links work (click → download)
- [ ] HTTP server responds at `localhost:3456`
- [ ] Files saved to `~/mcp-accessibility-reports/`

---

## 🐛 Troubleshooting

### "MCP server not found"
**Solution:**
1. Check config file path is correct
2. Verify absolute path to `dist/index.js`
3. Run: `node /path/to/mcp-server/dist/index.js` manually to test
4. Restart Claude Desktop

### "Installing browsers..." (first scan)
**This is normal!**
- First scan installs Playwright browsers
- Takes 1-2 minutes
- Only happens once
- Wait for completion, then try again

### "Port 3456 already in use"
**Solution:**
- Another process using that port
- MCP server still works
- Downloads won't work until port is free
- Or change port in `fileServer.ts` and rebuild

### "Download link doesn't work"
**Solution:**
1. Check `http://localhost:3456/` works first
2. Verify file was created (check path in response)
3. Make sure MCP server is still running

### "No tools appear in Claude Desktop"
**Solution:**
1. Check config file is valid JSON
2. Use absolute path (not relative)
3. Completely quit and restart Claude Desktop
4. Check Claude Desktop logs for errors

---

## 📂 Where Files Are Saved

All files go to:
```
~/mcp-accessibility-reports/
├── videos/
│   └── scan-2025-10-19T10-45-30.webm
├── screenshots/
│   ├── scan-2025-10-19T10-45-30-before.png
│   └── scan-2025-10-19T10-45-30-after.png
├── accessibility-scan-2025-10-19T10-45-30.xlsx
├── accessibility-scan-2025-10-19T10-45-30.json
└── accessibility-scan-2025-10-19T10-45-30.md
```

---

## 🎯 Quick Test (30 seconds)

Run these in order:

1. **"Scan example.com"** → Should get report
2. **Click download link** (if shown) → Should download
3. **Open `localhost:3456`** in browser → Should see welcome page
4. **Done!** ✅

---

## 🆘 Need Help?

### Check Server Logs
MCP servers log to stderr. Check your Claude Desktop logs or terminal output.

### Manual Test
Run server manually to see errors:
```bash
cd mcp-server
node dist/index.js
```

It should output:
```
Accessibility Testing MCP Server running on stdio
[FileServer] 🚀 Running on http://localhost:3456
[FileServer] 📁 Serving files from: /home/runner/mcp-accessibility-reports
```

### Verify Build
```bash
cd mcp-server
npm run build
```

Should complete without errors.

---

## 🎉 You're Ready!

Your MCP server is **production-ready** with:
- ✅ Professional accessibility scanning
- ✅ Color-coded Excel reports
- ✅ Video recording
- ✅ Screenshot capture
- ✅ HTTP download server
- ✅ Clickable download links

**Start testing and happy scanning! 🚀**
