# 📥 Download Links Feature - MCP Server

## Overview

The MCP Server now includes a **built-in HTTP file server** that provides **clickable download links** for all generated files!

Every video, screenshot, and report file gets an instant download URL you can open in your browser.

---

## 🚀 How It Works

### **Automatic HTTP Server**

When you start the MCP server, it automatically launches an HTTP file server on:
```
http://localhost:3456
```

This server runs **alongside** the MCP stdio transport and serves all your scan files.

---

## 📥 Download URLs

### **Video Downloads**
```
http://localhost:3456/videos/scan-2025-10-19T10-45-30.webm
```

### **Screenshot Downloads**
```
http://localhost:3456/screenshots/scan-2025-10-19T10-45-30-before.png
http://localhost:3456/screenshots/scan-2025-10-19T10-45-30-after.png
```

### **Report Downloads**
```
http://localhost:3456/reports/accessibility-scan-2025-10-19T10-45-30.xlsx
http://localhost:3456/reports/accessibility-scan-2025-10-19T10-45-30.json
http://localhost:3456/reports/accessibility-scan-2025-10-19T10-45-30.md
```

---

## 💡 Usage

### **Scan with Video**
```
Ask Claude: "Scan https://example.com and record a video"
```

**Claude's response includes:**
```markdown
## 🎬 Visual Feedback Files

**📹 Video Recording:**
- **scan-2025-10-19T10-45-30.webm**
  📥 **Download:** http://localhost:3456/videos/scan-2025-10-19T10-45-30.webm
  📁 Path: `/home/runner/mcp-accessibility-reports/videos/scan-2025-10-19T10-45-30.webm`
  ⏱️  Duration: ~8s

💡 **Tip:** Click the download links above or open them in your browser!
```

### **What You Can Do:**

1. **Click the URL** - Opens in your default browser
2. **Copy the URL** - Paste into any browser
3. **Download directly** - Browser prompts to save file
4. **Stream videos** - Videos play directly in browser

---

## 🎯 Example Response Format

When you run a scan with full visual feedback and reports:

```markdown
# Accessibility Scan Report
[... full report ...]

---

## 📁 Generated Report Files

1. **accessibility-scan-2025-10-19T10-45-30.xlsx**
   📥 Download: http://localhost:3456/reports/accessibility-scan-2025-10-19T10-45-30.xlsx
   📁 Path: `/home/runner/mcp-accessibility-reports/accessibility-scan-2025-10-19T10-45-30.xlsx`

2. **accessibility-scan-2025-10-19T10-45-30.json**
   📥 Download: http://localhost:3456/reports/accessibility-scan-2025-10-19T10-45-30.json
   📁 Path: `/home/runner/mcp-accessibility-reports/accessibility-scan-2025-10-19T10-45-30.json`

---

## 🎬 Visual Feedback Files

**📹 Video Recording:**
- **scan-2025-10-19T10-45-30.webm**
  📥 **Download:** http://localhost:3456/videos/scan-2025-10-19T10-45-30.webm
  📁 Path: `/home/runner/mcp-accessibility-reports/videos/scan-2025-10-19T10-45-30.webm`
  ⏱️  Duration: ~8s

**📸 Screenshots:**
1. **scan-2025-10-19T10-45-30-before.png**
   📥 Download: http://localhost:3456/screenshots/scan-2025-10-19T10-45-30-before.png
   📁 Path: `/home/runner/mcp-accessibility-reports/screenshots/scan-2025-10-19T10-45-30-before.png`

2. **scan-2025-10-19T10-45-30-after.png**
   📥 Download: http://localhost:3456/screenshots/scan-2025-10-19T10-45-30-after.png
   📁 Path: `/home/runner/mcp-accessibility-reports/screenshots/scan-2025-10-19T10-45-30-after.png`

💡 **Tip:** Click the download links above or open them in your browser!
```

---

## 🔧 Server Details

### **Port**
- **Default:** 3456
- **Protocol:** HTTP
- **Host:** localhost (127.0.0.1)

### **Endpoints**

#### **Root**
```
GET http://localhost:3456/
```
Returns HTML page with server info and usage instructions.

#### **Download Video**
```
GET http://localhost:3456/videos/{filename}.webm
```
Downloads video file with proper content-type headers.

#### **Download Screenshot**
```
GET http://localhost:3456/screenshots/{filename}.png
```
Downloads screenshot file.

#### **Download Report**
```
GET http://localhost:3456/reports/{filename}.xlsx
GET http://localhost:3456/reports/{filename}.json
GET http://localhost:3456/reports/{filename}.md
```
Downloads report file.

---

## 🔒 Security

### **Local Only**
- Server binds to `localhost` only
- Not accessible from external network
- Safe for local development

### **Path Validation**
- All file paths validated
- Directory traversal protection
- Only serves files from `~/mcp-accessibility-reports/`

### **CORS Enabled**
- Cross-Origin Resource Sharing enabled
- Accessible from any browser tab
- No authentication required (local only)

---

## 💻 Browser Support

### **Download Links Work In:**
- ✅ Chrome / Edge
- ✅ Firefox
- ✅ Safari
- ✅ Brave
- ✅ Any modern browser

### **Video Playback:**
- ✅ Chrome / Edge (native WebM support)
- ✅ Firefox (native WebM support)
- ✅ Safari (with plugin)
- ✅ VLC (recommended for all formats)

---

## 🎯 Use Cases

### **1. Quick Downloads**
Click the URL in Claude's response → File downloads immediately

### **2. Share with Team**
Copy download link → Paste in email/Slack → Team downloads file

### **3. Browser Preview**
Open video URL → Watch in browser without downloading

### **4. Batch Downloads**
Multiple scans → All download links in responses → Download all at once

### **5. Integration Testing**
Use URLs in scripts/automation for file access

---

## 🚨 Troubleshooting

### **"Connection refused" error**
- MCP server not running
- Check: `http://localhost:3456/` in browser
- Restart MCP server

### **"File not found" error**
- File doesn't exist yet
- Run a scan first with `recordVideo=true` or `captureScreenshots=true`
- Check file path in error message

### **"Port already in use"**
- Another process using port 3456
- File server will show warning but MCP server continues
- Change port in `fileServer.ts` if needed

### **Download not starting**
- Click URL again
- Try copying URL to new browser tab
- Check file exists at path shown

---

## ⚙️ Configuration

### **Change Port**
Edit `mcp-server/fileServer.ts`:
```typescript
const PORT = 3456; // Change to your preferred port
```

Then rebuild:
```bash
cd mcp-server && npm run build
```

---

## 📊 File Server Logs

The file server logs all activity to stderr (visible in MCP logs):

```
[FileServer] 🚀 Running on http://localhost:3456
[FileServer] 📁 Serving files from: /home/runner/mcp-accessibility-reports
[FileServer] ✅ Served: videos/scan-2025-10-19T10-45-30.webm (1024KB)
[FileServer] ✅ Served: screenshots/scan-2025-10-19T10-45-30-before.png (256KB)
```

---

## 🎉 Benefits

1. **Instant Access** - Click and download, no file browsing
2. **Browser Integration** - Works seamlessly with web browsers
3. **Shareable URLs** - Copy/paste to share with team (on same machine)
4. **Preview Support** - Videos/images preview in browser
5. **No Manual Setup** - Starts automatically with MCP server
6. **Zero Configuration** - Works out of the box

---

**Now you can download all your accessibility scan files with one click! 📥**
