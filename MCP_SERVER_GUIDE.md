# 🚀 Accessibility Testing MCP Server Guide

Complete guide for using the TestraAI Accessibility Testing MCP Server with AI assistants.

---

## 📋 Table of Contents

1. [What is MCP?](#what-is-mcp)
2. [Available Tools](#available-tools)
3. [Integration Options](#integration-options)
4. [Quick Start](#quick-start)
5. [Usage Examples](#usage-examples)
6. [Deployment](#deployment)

---

## 🤔 What is MCP?

**Model Context Protocol (MCP)** is an open standard that enables AI assistants to connect to external tools and data sources. This MCP server provides web accessibility testing capabilities to AI assistants like:

- **Claude Desktop** (Anthropic)
- **OpenAI Agents** (ChatGPT, Agent Builder)
- **Cursor IDE**
- **Cline** (VS Code extension)
- Any MCP-compatible client

---

## 🛠️ Available Tools

### 1. `scan_url_accessibility`
Scan a single URL for WCAG 2.1 A/AA accessibility violations.

**Parameters:**
- `url` (required): URL to scan (must include http:// or https://)
- `wcagLevel` (optional): "A", "AA", or "AAA" (default: "AA")
- `outputFormat` (optional): "text", "excel", "json", "markdown", or "all" (default: "text")
- `headless` (optional): Run browser in headless mode (default: true)
- `recordVideo` (optional): Record video of scan (default: false)
- `captureScreenshots` (optional): Capture screenshots (default: false)

**Example:**
```
Scan https://example.com for accessibility issues
```

### 2. `scan_website_accessibility`
Scan entire website (multiple pages) for accessibility issues.

**Parameters:**
- `url` (required): Starting URL
- `maxPages` (optional): Maximum pages to scan (default: 10)
- `wcagLevel` (optional): "A", "AA", or "AAA" (default: "AA")
- `outputFormat` (optional): Output format (default: "text")
- `recordVideo` (optional): Record video (default: true)
- `captureScreenshots` (optional): Capture screenshots (default: true)

**Example:**
```
Scan the entire website https://example.com for accessibility issues, check up to 20 pages
```

### 3. `get_wcag_guidance`
Get detailed WCAG guidance for specific success criteria.

**Parameters:**
- `criterion` (required): WCAG criterion (e.g., "1.1.1") or axe rule ID

**Example:**
```
What is WCAG criterion 1.4.3 about?
```

---

## 🔌 Integration Options

### **Option 1: Standalone MCP Server (stdio)**
Use with Claude Desktop, Cursor, or other stdio-based MCP clients.

**Location:** `mcp-server/dist/index.js`

**Transport:** stdio (standard input/output)

### **Option 2: HTTP/SSE Server**
Use with OpenAI Agent Builder or web-based clients.

**Location:** Integrated into main app at `/mcp/*` endpoints

**Transport:** Server-Sent Events (SSE)

**Endpoints:**
- `GET /mcp/sse` - SSE connection endpoint
- `POST /mcp/messages` - Message endpoint
- `GET /mcp/health` - Health check
- `GET /mcp/info` - Server information

---

## 🚀 Quick Start

### **For Claude Desktop**

1. **Build the MCP server:**
```bash
cd mcp-server
npm install
npm run build
```

2. **Configure Claude Desktop:**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "accessibility-testing": {
      "command": "node",
      "args": ["/path/to/TestraAI/mcp-server/dist/index.js"]
    }
  }
}
```

3. **Restart Claude Desktop**

4. **Test it:**
```
Scan https://example.com for accessibility issues
```

### **For OpenAI Agent Builder**

1. **Start the main application:**
```bash
npm run dev
```

2. **Get the MCP endpoint:**
```
http://localhost:3000/mcp/sse
```

3. **In OpenAI Agent Builder:**
   - Add an "MCP" node
   - Enter the SSE endpoint URL
   - Connect it to your agent

4. **Test it:**
```
Scan https://example.com for WCAG AA compliance
```

---

## 📝 Usage Examples

### Example 1: Basic Scan
```
Scan https://google.com for accessibility issues
```

### Example 2: Detailed Scan with Video
```
Scan https://example.com with video recording and screenshots enabled
```

### Example 3: Full Website Scan
```
Scan the entire website https://example.com, check up to 50 pages, and generate an Excel report
```

### Example 4: Get WCAG Guidance
```
Explain WCAG criterion 2.1.1 and how to fix violations
```

### Example 5: Custom WCAG Level
```
Scan https://example.com for WCAG AAA compliance
```

---

## 🌐 Deployment

### **Deploy to GCP Cloud Run**

The MCP server is integrated into the main application and will be deployed automatically:

```bash
./deploy-gcp.sh
```

Your MCP endpoints will be available at:
```
https://your-app.run.app/mcp/sse
https://your-app.run.app/mcp/messages
```

### **Standalone Deployment**

You can also deploy just the MCP server:

```bash
cd mcp-server
npm run build
# Deploy dist/ directory to your hosting platform
```

---

## 📚 Additional Resources

- **Full MCP Documentation:** `mcp-server/README.md`
- **OpenAI Integration:** `mcp-server/OPENAI_TESTING.md`
- **Deployment Guide:** `mcp-server/DEPLOYMENT_GUIDE.md`
- **WCAG Reference:** `mcp-server/WCAG_QUICK_REFERENCE.md`

---

## 🎯 Next Steps

1. ✅ Build the MCP server
2. ✅ Configure your AI assistant
3. ✅ Test with a simple scan
4. ✅ Explore advanced features (video, screenshots, reports)
5. ✅ Deploy to production

**Happy Testing! 🚀**

