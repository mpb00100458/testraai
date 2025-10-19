# 🎬 Visual Feedback Features - MCP Server

## Overview

The Accessibility MCP Server now supports **LIVE BROWSER VIEWING**, **VIDEO RECORDING**, and **SCREENSHOT CAPTURE**!

Watch accessibility scans happen in real-time, record them for later review, and capture key moments - all through your AI assistant.

---

## 🚀 Visual Feedback Options

### 1. 👁️ Live Browser Window

**Watch the scan happen in real-time!**

```
Ask AI: "Scan https://example.com with headless=false"

Or naturally:
"Scan https://example.com and show me the browser window"
```

**What happens:**
- ✅ **Browser window opens** on your screen
- ✅ **Watch live navigation** as it loads the page
- ✅ **See the scan in action** (slowed down 300ms for visibility)
- ✅ **Automatic close** when scan completes

**Perfect for:**
- Debugging scan issues
- Understanding what the scanner sees
- Watching complex page interactions
- Learning how accessibility testing works

---

### 2. 🎥 Video Recording

**Record the entire scan session!**

```
Ask AI: "Scan https://example.com with recordVideo=true"

Or naturally:
"Scan https://example.com and record a video"
```

**What you get:**
- ✅ **WebM video file** (1280x720 resolution)
- ✅ **Full scan session** from start to finish
- ✅ **Timestamped filename**: `scan-2025-10-18T16-45-30.webm`
- ✅ **Saved to**: `~/mcp-accessibility-reports/videos/`
- ✅ **Duration info** included in response

**Perfect for:**
- Creating scan evidence/documentation
- Sharing with team members
- Training materials
- Debugging complex issues

**Video Format:**
- Format: WebM (VP8/VP9 codec)
- Resolution: 1280x720
- Can be played in: VLC, Chrome, Firefox, QuickTime (with plugin)

---

### 3. 📸 Screenshot Capture

**Capture before and after snapshots!**

```
Ask AI: "Scan https://example.com with captureScreenshots=true"

Or naturally:
"Scan https://example.com and take screenshots"
```

**What you get:**
- ✅ **2 full-page screenshots**:
  - `scan-TIMESTAMP-before.png` - Initial page state
  - `scan-TIMESTAMP-after.png` - After analysis
- ✅ **Full-page captures** (scrolls to capture entire page)
- ✅ **PNG format** for high quality
- ✅ **Saved to**: `~/mcp-accessibility-reports/screenshots/`

**Perfect for:**
- Quick visual reference
- Side-by-side comparisons
- Documentation
- Issue reporting

---

## 🎯 Option C: ALL THREE COMBINED! 

**The ultimate visual feedback experience:**

```
Ask AI: "Scan https://example.com with headless=false, recordVideo=true, and captureScreenshots=true"

Or naturally:
"Scan https://example.com - show browser, record video, and take screenshots"

Or simplest:
"Scan https://example.com with full visual feedback"
```

**What you get:**
- ✅ **Watch live** - Browser window opens on screen
- ✅ **Record everything** - Video saved for later
- ✅ **Capture snapshots** - Screenshots at key moments
- ✅ **Complete visual record** of the scan

**Perfect for:**
- High-stakes audits
- Client demonstrations
- Comprehensive documentation
- Training and education

---

## 📁 File Organization

All visual files are saved to organized directories:

```
~/mcp-accessibility-reports/
├── videos/
│   ├── scan-2025-10-18T16-45-30.webm
│   └── scan-2025-10-18T17-20-15.webm
├── screenshots/
│   ├── scan-2025-10-18T16-45-30-before.png
│   ├── scan-2025-10-18T16-45-30-after.png
│   ├── scan-2025-10-18T17-20-15-before.png
│   └── scan-2025-10-18T17-20-15-after.png
└── (report files as usual)
```

**On different systems:**
- **Mac**: `/Users/yourname/mcp-accessibility-reports/`
- **Linux**: `/home/yourname/mcp-accessibility-reports/`
- **Replit**: `/home/runner/mcp-accessibility-reports/`

---

## 🎭 Use Cases by Scenario

### For Development
```
"Scan localhost:3000 with headless=false"
```
Watch your local app being tested in real-time.

### For Documentation
```
"Scan the-app.com with recordVideo=true and captureScreenshots=true"
```
Create complete visual documentation of accessibility state.

### For Debugging
```
"Scan problematic-site.com with headless=false and recordVideo=true"
```
See exactly what's happening AND have a recording to analyze.

### For Presentations
```
"Scan client-site.com with all visual feedback"
```
Show stakeholders the full accessibility testing process.

### For Training
```
"Scan example.com with headless=false"
```
Teach team members how accessibility scanning works.

---

## 💡 Example Prompts

### Basic (Text Only)
> "Scan google.com for accessibility issues"

### Live Browser
> "Scan google.com and show me the browser"

### With Video
> "Scan google.com and record a video"

### With Screenshots
> "Scan google.com and take screenshots"

### Full Visual Feedback
> "Scan google.com with full visual feedback"

### Combined with Reports
> "Scan google.com - show browser, record video, save as Excel"

### Custom Everything
> "Scan my-app.com for WCAG AAA violations, show browser, record video, take screenshots, and export to all formats"

---

## 🎬 Response Format

When visual feedback is enabled, the AI response includes:

```markdown
# Accessibility Scan Report
[... full report text ...]

---

## 🎬 Visual Feedback Files

**📹 Video Recording:**
- **scan-2025-10-18T16-45-30.webm**
  Path: `/home/runner/mcp-accessibility-reports/videos/scan-2025-10-18T16-45-30.webm`
  Duration: ~8s

**📸 Screenshots:**
1. **scan-2025-10-18T16-45-30-before.png**
   Path: `/home/runner/mcp-accessibility-reports/screenshots/scan-2025-10-18T16-45-30-before.png`

2. **scan-2025-10-18T16-45-30-after.png**
   Path: `/home/runner/mcp-accessibility-reports/screenshots/scan-2025-10-18T16-45-30-after.png`

All visual files saved to: `/home/runner/mcp-accessibility-reports/`
```

---

## ⚙️ Technical Details

### Live Browser
- **Parameter**: `headless: false`
- **Default**: `true` (hidden browser)
- **Speed**: Slowed by 300ms when visible for better viewing
- **Note**: Only works on local machine (won't work on remote servers)

### Video Recording
- **Parameter**: `recordVideo: true`
- **Default**: `false` (no recording)
- **Format**: WebM (VP8/VP9)
- **Resolution**: 1280x720
- **File size**: ~1-5MB for typical scans

### Screenshots
- **Parameter**: `captureScreenshots: true`
- **Default**: `false` (no screenshots)
- **Format**: PNG
- **Type**: Full-page screenshots
- **Count**: 2 (before + after)

---

## 🎯 Combining Features

All visual features work together seamlessly:

| Feature | Text | Excel | JSON | MD | Live | Video | Screenshots |
|---------|------|-------|------|-----|------|-------|-------------|
| **Basic scan** | ✅ | - | - | - | - | - | - |
| **Live watch** | ✅ | - | - | - | ✅ | - | - |
| **Video only** | ✅ | - | - | - | - | ✅ | - |
| **Screenshots only** | ✅ | - | - | - | - | - | ✅ |
| **Option C** | ✅ | - | - | - | ✅ | ✅ | ✅ |
| **Full package** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 Benefits

1. **Transparency** - See exactly what the scanner sees
2. **Documentation** - Create visual evidence of accessibility state
3. **Debugging** - Identify issues faster with visual feedback
4. **Education** - Teach others how accessibility testing works
5. **Verification** - Confirm scans are working correctly
6. **Sharing** - Send videos/screenshots to team members

---

## ⚠️ Important Notes

### Live Browser (`headless=false`)
- Only works on **local machine** where MCP server runs
- Won't work on **remote servers** or **cloud environments**
- Browser window appears on **your screen**

### Video Recording
- Adds **1-2 seconds** to scan time for video processing
- Files saved in **WebM format** (widely supported)
- **Automatic cleanup** of temporary files

### Screenshots
- Captures **full page** (scrolls automatically)
- PNG format for **high quality**
- No performance impact on scan

### File Storage
- All files saved **locally** on your machine
- File paths returned in **AI response**
- No automatic cleanup (manage manually)

---

---

## 📥 Download Links

All visual feedback files come with **instant download URLs**!

When you record a video or capture screenshots, the response includes clickable download links:

```markdown
**📹 Video Recording:**
- **scan-2025-10-19T10-45-30.webm**
  📥 **Download:** http://localhost:3456/videos/scan-2025-10-19T10-45-30.webm
  📁 Path: `/home/runner/mcp-accessibility-reports/videos/scan-2025-10-19T10-45-30.webm`
  ⏱️  Duration: ~8s
```

### **How It Works:**
- Built-in HTTP server runs on `http://localhost:3456`
- Starts automatically with MCP server
- All files served with proper download headers
- Click the URL → Download instantly!

See **DOWNLOAD_LINKS.md** for full details.

---

**Now you can SEE your accessibility scans happen! 🎥👁️📸**
