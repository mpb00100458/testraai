# 🎯 Cursor IDE MCP Server Setup Guide

Complete guide to configure the Accessibility Testing MCP Server in Cursor IDE.

---

## 📋 Prerequisites

1. ✅ Cursor IDE installed (https://cursor.sh)
2. ✅ Node.js installed
3. ✅ MCP server built (`mcp-server/dist/index.js` exists)

---

## 🚀 Setup Instructions

### **Step 1: Build the MCP Server**

```bash
cd /Users/pranaym/Documents/TestraAI/mcp-server
npm install
npm run build
```

Verify the build:
```bash
ls -la /Users/pranaym/Documents/TestraAI/mcp-server/dist/index.js
```

---

### **Step 2: Configure Cursor IDE**

#### **Option A: Via Settings UI**

1. Open **Cursor IDE**
2. Go to **Settings** (Cmd + ,)
3. Search for **"MCP"** or **"Model Context Protocol"**
4. Add the MCP server configuration

#### **Option B: Via Settings JSON** (Recommended)

1. Open **Cursor IDE**
2. Press `Cmd + Shift + P` (Mac) or `Ctrl + Shift + P` (Windows/Linux)
3. Type: **"Preferences: Open User Settings (JSON)"**
4. Press Enter
5. Add this configuration:

```json
{
  "mcp.servers": {
    "accessibility-testing": {
      "command": "node",
      "args": [
        "/Users/pranaym/Documents/TestraAI/mcp-server/dist/index.js"
      ],
      "env": {}
    }
  }
}
```

**Note:** If you already have other settings, just add the `"mcp.servers"` section to your existing JSON.

---

### **Step 3: Restart Cursor IDE**

Close and reopen Cursor IDE to load the MCP server.

---

### **Step 4: Verify MCP Server is Loaded**

1. Open Cursor's AI chat panel
2. Look for an indicator that MCP tools are available (usually a 🔌 icon or tools list)
3. You should see the accessibility testing tools available

---

## 🧪 Test the MCP Server

Try these commands in Cursor's AI chat:

### **Test 1: Basic Scan**
```
Scan https://example.com for accessibility issues
```

### **Test 2: Detailed Scan**
```
Scan https://google.com for WCAG AA compliance and show me the top 5 violations
```

### **Test 3: Get WCAG Guidance**
```
What is WCAG criterion 1.4.3 and how do I fix violations?
```

### **Test 4: Full Website Scan**
```
Scan the entire website https://example.com, check up to 10 pages, and generate an Excel report
```

---

## 🛠️ Available Tools

Once configured, Cursor will have access to:

1. **`scan_url_accessibility`**
   - Scan single URL for WCAG violations
   - Parameters: url, wcagLevel, outputFormat, headless, recordVideo, captureScreenshots

2. **`scan_website_accessibility`**
   - Scan entire website (multiple pages)
   - Parameters: url, maxPages, wcagLevel, outputFormat, recordVideo, captureScreenshots

3. **`get_wcag_guidance`**
   - Get WCAG guidance for specific criteria
   - Parameters: criterion (e.g., "1.4.3" or axe rule ID)

---

## 🔍 Troubleshooting

### **MCP Server Not Loading**

1. **Check Node.js version:**
```bash
node --version
# Should be v18 or higher
```

2. **Verify MCP server file exists:**
```bash
ls -la /Users/pranaym/Documents/TestraAI/mcp-server/dist/index.js
```

3. **Test MCP server manually:**
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node /Users/pranaym/Documents/TestraAI/mcp-server/dist/index.js
```

Expected output should include tool names like `scan_url_accessibility`.

4. **Check Cursor logs:**
   - Open Cursor
   - Press `Cmd + Shift + P`
   - Type: "Developer: Toggle Developer Tools"
   - Check Console for MCP-related errors

### **Permission Issues**

If you get permission errors:
```bash
chmod +x /Users/pranaym/Documents/TestraAI/mcp-server/dist/index.js
```

### **Path Issues**

Make sure the path is absolute (not relative):
- ✅ Good: `/Users/pranaym/Documents/TestraAI/mcp-server/dist/index.js`
- ❌ Bad: `~/Documents/TestraAI/mcp-server/dist/index.js`
- ❌ Bad: `./mcp-server/dist/index.js`

---

## 📚 Alternative: Cursor Settings File Location

If the JSON settings don't work, you can also try editing Cursor's config file directly:

**macOS:**
```
~/Library/Application Support/Cursor/User/settings.json
```

**Linux:**
```
~/.config/Cursor/User/settings.json
```

**Windows:**
```
%APPDATA%\Cursor\User\settings.json
```

---

## 🎯 Complete Configuration Example

Here's a complete `settings.json` example with MCP server:

```json
{
  "editor.fontSize": 14,
  "editor.tabSize": 2,
  "mcp.servers": {
    "accessibility-testing": {
      "command": "node",
      "args": [
        "/Users/pranaym/Documents/TestraAI/mcp-server/dist/index.js"
      ],
      "env": {}
    }
  },
  "cursor.ai.model": "gpt-4"
}
```

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ No errors in Cursor's developer console
- ✅ You can see MCP tools in the AI chat
- ✅ Commands like "Scan https://example.com" trigger the tool
- ✅ You get accessibility scan results

---

## 🚀 Next Steps

Once configured:
1. Test with a simple website scan
2. Try different WCAG levels (A, AA, AAA)
3. Generate reports in different formats (Excel, JSON, Markdown)
4. Scan entire websites with multiple pages

---

**Happy Testing! 🎉**

