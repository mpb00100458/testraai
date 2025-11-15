# 📥 MCP Server - Instant Downloads Guide

## 🎉 **NEW! Instant Download Functionality**

All scan results are now **immediately downloadable** after each scan! Files are automatically saved and download links are provided instantly.

---

## ✅ **What's New**

### **1. Automatic File Generation**
Every scan automatically generates downloadable files:
- ✅ **Excel Reports** (.xlsx) - Professional spreadsheets
- ✅ **JSON Reports** (.json) - Machine-readable data
- ✅ **Markdown Reports** (.md) - Documentation format
- ✅ **Videos** (.webm) - Scan recordings
- ✅ **Screenshots** (.png) - Visual captures

### **2. Instant Download Links**
After each scan, you get:
- 📥 **Direct download URLs** - Click to download
- 📁 **File paths** - Copy and open manually
- 💻 **Quick open commands** - Open in default app

### **3. New MCP Tools**

#### `list_downloadable_reports`
List all available downloads from previous scans

#### `open_report_file`
Open any report file immediately in default application

---

## 🚀 **How to Use**

### **Method 1: Scan and Download Immediately**

**In Cursor AI Chat (Cmd + L):**

```
Scan https://example.com and save as Excel
```

**Result:**
```
✅ Scan complete!

📁 INSTANT DOWNLOADS - Report Files Ready!

📊 1. accessibility-scan-2024-11-15-09-30-45.xlsx
- Format: XLSX
- 📥 DOWNLOAD NOW: http://localhost:3456/reports/accessibility-scan-2024-11-15-09-30-45.xlsx
- 📁 File Path: ~/mcp-accessibility-reports/excel/accessibility-scan-2024-11-15-09-30-45.xlsx
- 💻 Quick Open: Use open_report_file tool

💡 Tip: Click the download link above or copy the file path to open immediately!
```

---

### **Method 2: Generate All Formats at Once**

```
Scan https://example.com and save in all formats
```

**Result:**
```
📁 INSTANT DOWNLOADS - Report Files Ready!

📊 1. accessibility-scan-2024-11-15-09-30-45.xlsx
📄 2. accessibility-scan-2024-11-15-09-30-45.json
📝 3. accessibility-scan-2024-11-15-09-30-45.md

All files ready for download!
```

---

### **Method 3: List All Available Downloads**

```
List all downloadable reports
```

**Result:**
```
📁 Available Downloadable Files

File Server: http://localhost:3456
Reports Directory: ~/mcp-accessibility-reports

## 📊 Excel

### accessibility-scan-2024-11-15-09-30-45.xlsx
- Size: 45 KB
- Modified: 11/15/2024, 9:30:45 AM
- 📥 Download: http://localhost:3456/reports/accessibility-scan-2024-11-15-09-30-45.xlsx
- 📁 Path: ~/mcp-accessibility-reports/excel/accessibility-scan-2024-11-15-09-30-45.xlsx
- 💻 Open: Use open_report_file tool

## 🎥 Videos

### scan-2024-11-15-09-30-45.webm
- Size: 2,340 KB
- Modified: 11/15/2024, 9:31:12 AM
- 📥 Download: http://localhost:3456/videos/scan-2024-11-15-09-30-45.webm
- 📁 Path: ~/mcp-accessibility-reports/videos/scan-2024-11-15-09-30-45.webm
- 💻 Open: Use open_report_file tool

Total Files: 15

💡 Quick Actions:
- Click download links to get files
- Use open_report_file to open in default app
- Visit http://localhost:3456 in browser for file server
```

---

### **Method 4: Open Files Immediately**

```
Open the Excel report at ~/mcp-accessibility-reports/excel/accessibility-scan-2024-11-15-09-30-45.xlsx
```

**Result:**
```
✅ Opened: accessibility-scan-2024-11-15-09-30-45.xlsx

File Type: XLSX
Path: ~/mcp-accessibility-reports/excel/accessibility-scan-2024-11-15-09-30-45.xlsx

💡 The file should now be open in your default application!
```

---

## 📂 **File Locations**

All files are saved to: `~/mcp-accessibility-reports/`

```
~/mcp-accessibility-reports/
├── excel/                    # Excel reports (.xlsx)
│   └── accessibility-scan-*.xlsx
├── json/                     # JSON reports (.json)
│   └── accessibility-scan-*.json
├── markdown/                 # Markdown reports (.md)
│   └── accessibility-scan-*.md
├── videos/                   # Scan videos (.webm)
│   └── scan-*.webm
└── screenshots/              # Screenshots (.png)
    └── scan-*.png
```

---

## 🌐 **File Server**

A built-in HTTP file server runs on **http://localhost:3456**

### **Access Methods:**

**1. Browser:**
Open http://localhost:3456 in your browser to see all files

**2. Direct Download:**
```
http://localhost:3456/reports/filename.xlsx
http://localhost:3456/videos/filename.webm
http://localhost:3456/screenshots/filename.png
```

**3. Command Line:**
```bash
# Download Excel report
curl -O http://localhost:3456/reports/accessibility-scan-2024-11-15-09-30-45.xlsx

# Download video
curl -O http://localhost:3456/videos/scan-2024-11-15-09-30-45.webm
```

---

## 💡 **Usage Examples**

### **Example 1: Quick Scan with Excel Download**
```
Scan https://myapp.com and save as Excel
```
→ Instant Excel download link provided

### **Example 2: Full Audit with All Formats**
```
Scan https://myapp.com for WCAG 2.2 AA compliance and save in all formats
```
→ Excel, JSON, and Markdown files generated

### **Example 3: Video Recording**
```
Scan https://myapp.com with video recording enabled
```
→ Video file ready for download

### **Example 4: Check Download History**
```
List all downloadable reports
```
→ See all previous scans and download links

### **Example 5: Open Latest Report**
```
List downloadable Excel reports and open the most recent one
```
→ File opens in Excel immediately

---

## 🎯 **Perfect For**

✅ **Immediate Access** - Download reports right after scanning
✅ **Stakeholder Sharing** - Send Excel files to team members
✅ **Documentation** - Save Markdown reports to docs
✅ **CI/CD Integration** - Download JSON for automated processing
✅ **Visual Evidence** - Download videos and screenshots
✅ **Audit Trail** - Keep history of all scans

---

## 🔧 **Advanced Features**

### **Filter by File Type**
```
List only Excel reports
```

### **Open Multiple Files**
```
List all reports and open the top 3 Excel files
```

### **Download via Browser**
1. Visit http://localhost:3456
2. See all available files
3. Click to download

---

## ✅ **Ready to Use!**

**Restart Cursor IDE** and try:

```
Scan https://example.com and save as Excel, then open it
```

You'll get:
1. ✅ Scan completes
2. 📊 Excel file generated
3. 📥 Download link provided
4. 💻 File opens in Excel

---

**🎊 All scan results are now instantly downloadable!**

