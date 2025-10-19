# 🤖 Using MCP Server with OpenAI Agent Builder

## Quick Start Guide

Your accessibility scanner is now deployed **in this Repl** and ready to connect to OpenAI Agent Builder!

---

## 🚀 Step 1: Start the SSE Server

In this Repl, run:

```bash
cd mcp-server
npm run sse
```

**Or use the start script:**
```bash
cd mcp-server
./start-sse.sh
```

**Expected output:**
```
═══════════════════════════════════════════════════════════
  Accessibility Testing MCP Server (SSE Transport)
═══════════════════════════════════════════════════════════

  🚀 MCP SSE Endpoint: http://0.0.0.0:8080/sse
  ❤️  Health Check:     http://0.0.0.0:8080/health
  📥 Downloads:        http://localhost:3456

═══════════════════════════════════════════════════════════
  🤖 OPENAI AGENT BUILDER INTEGRATION
═══════════════════════════════════════════════════════════

  1. Go to: https://platform.openai.com/agent-builder
  2. Add MCP Server node to your workflow
  3. Server URL: https://your-repl-url.repl.co/sse
  4. Auth: None (or add API key if needed)
```

---

## 🌐 Step 2: Get Your Repl URL

When you run this Repl, Replit will show you the deployment URL at the top of the screen.

**It will look like:**
```
https://[your-repl-name].[your-username].repl.co
```

**Your MCP SSE endpoint will be:**
```
https://[your-repl-name].[your-username].repl.co/sse
```

**Example:**
```
https://accessibility-mcp.jordansmith.repl.co/sse
```

---

## 🔧 Step 3: Add to OpenAI Agent Builder

### **3.1 Open Agent Builder**

Go to: **https://platform.openai.com/agent-builder**

### **3.2 Create or Open a Workflow**

- Click **"+ Create"** for a new workflow
- Or open an existing workflow

### **3.3 Add MCP Server Node**

From the left sidebar, drag an **"MCP"** node into your workflow canvas.

### **3.4 Configure the MCP Node**

Fill in the configuration:

```yaml
Server Label: accessibility-scanner
Server URL: https://your-repl-url.repl.co/sse
Auth Type: None
```

**Example:**
```yaml
Server Label: accessibility-scanner
Server URL: https://accessibility-mcp.jordansmith.repl.co/sse
Auth Type: No Auth
```

### **3.5 Connect to Agent Node**

- Connect the **MCP node** output to your **Agent node** input
- The agent can now use accessibility scanning tools!

---

## 🧪 Step 4: Test Your Agent

### **Example Prompts:**

**Test 1: List available tools**
```
Agent prompt: "What tools do you have available?"
```

The agent should respond with:
- `scan_url_accessibility`
- `scan_website_accessibility`
- `get_wcag_guidance`

**Test 2: Scan a website**
```
Agent prompt: "Scan https://example.com for accessibility issues"
```

The agent will:
1. Call the `scan_url_accessibility` tool
2. Return violation details
3. Provide WCAG guidance

**Test 3: Full site audit with video**
```
Agent prompt: "Scan the first 5 pages of https://example.com and record a video"
```

The agent will:
1. Call `scan_website_accessibility` with `maxPages: 5` and `recordVideo: true`
2. Return comprehensive report
3. Provide video download link

---

## 🔌 Available MCP Tools

### **1. scan_url_accessibility**

Scan a single URL for WCAG violations.

**Parameters:**
- `url` (required): URL to scan
- `wcagLevel`: "A", "AA", or "AAA" (default: "AA")
- `outputFormat`: "text", "excel", "json", "markdown", or "all"
- `recordVideo`: boolean (default: false)
- `captureScreenshots`: boolean (default: false)

**Example Agent Command:**
```
"Scan https://example.com and record a video"
```

### **2. scan_website_accessibility**

Scan multiple pages of a website.

**Parameters:**
- `url` (required): Starting URL
- `maxPages`: Maximum pages to scan (default: 10)
- `wcagLevel`: "A", "AA", or "AAA"
- `outputFormat`: Output format
- `recordVideo`: boolean (default: true for multi-page)

**Example Agent Command:**
```
"Audit the entire website at https://mysite.com (max 20 pages)"
```

### **3. get_wcag_guidance**

Get detailed WCAG guidance.

**Parameters:**
- `criterion` (required): WCAG criterion (e.g., "1.1.1", "2.4.2")

**Example Agent Command:**
```
"Explain WCAG criterion 1.4.3"
```

---

## 📥 Download Scan Results

All scan results (videos, screenshots, reports) are available at:

```
http://localhost:3456
```

**Or via your Repl's public URL:**
```
https://your-repl-url.repl.co:3456
```

**File URLs provided in scan results:**
- Videos: `/videos/scan-TIMESTAMP.webm`
- Screenshots: `/screenshots/scan-TIMESTAMP.png`
- Excel Reports: `/reports/accessibility-scan-TIMESTAMP.xlsx`

---

## 🎯 Example Workflow in Agent Builder

```
[Start] → [MCP: accessibility-scanner] → [Agent: Accessibility Expert]
```

**Agent Instructions:**
```
You are an accessibility expert. When asked to check a website:
1. Use scan_url_accessibility or scan_website_accessibility
2. Analyze the results
3. Explain violations in plain language
4. Provide actionable remediation steps
5. Prioritize by severity (critical → warning → minor)
```

**Sample User Query to Agent:**
```
"Check if example.com meets WCAG 2.1 AA standards"
```

**Agent Response:**
```
I've scanned example.com for WCAG 2.1 AA compliance.

Found 12 violations:
• 5 Critical (must fix)
• 4 Moderate (should fix)
• 3 Minor (nice to fix)

Top Issues:
1. Missing alt text on 8 images (WCAG 1.1.1)
2. Insufficient color contrast on buttons (WCAG 1.4.3)
3. Form labels not associated properly (WCAG 1.3.1)

Download full report: [link]
Watch scan video: [link]
```

---

## 🔐 Optional: Add Authentication

If you want to secure your MCP server:

### **Add API Key Check**

Edit `mcp-server/sse-server.ts`:

```typescript
// Add before SSE endpoint
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.MCP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### **Configure in Agent Builder**

```yaml
Server URL: https://your-repl-url.repl.co/sse
Auth Type: Custom Headers
Headers:
  X-API-Key: your-secret-key-here
```

---

## ⚡ Tips & Best Practices

### **Performance**

- For quick checks: Use `scan_url_accessibility` on single pages
- For full audits: Use `scan_website_accessibility` with appropriate `maxPages`
- Videos add overhead: Enable only when needed

### **WCAG Levels**

- **Level A**: Minimum compliance (critical issues)
- **Level AA**: Standard target for most sites ⭐ **Recommended**
- **Level AAA**: Enhanced compliance (strict requirements)

### **Output Formats**

- **text**: Best for AI analysis and conversation
- **excel**: Best for human review and reporting
- **json**: Best for integration with other tools
- **all**: Generate all formats at once

---

## 🆘 Troubleshooting

### **"Connection refused" in Agent Builder**

- ✅ Make sure SSE server is running: `npm run sse`
- ✅ Check your Repl URL is correct (should end with `.repl.co`)
- ✅ Add `/sse` to the end of the URL
- ✅ Verify health check works: Visit `https://your-url.repl.co/health`

### **"No tools available"**

- ✅ Check server logs for errors
- ✅ Rebuild TypeScript: `npm run build`
- ✅ Restart SSE server

### **"Video download failed"**

- Download server runs on port 3456
- Use the full download URL from scan results
- Videos are ~1-5MB for single page scans

### **"Playwright browsers not found"**

```bash
cd mcp-server
npx playwright install
npx playwright install-deps
```

---

## 📊 Monitoring Your Server

### **Health Check**

```bash
curl https://your-repl-url.repl.co/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "Accessibility MCP Server",
  "transport": "SSE",
  "compatible": "OpenAI Agent Builder"
}
```

### **Server Info**

```bash
curl https://your-repl-url.repl.co/
```

Shows available endpoints and integration instructions.

---

## 🎓 Example Use Cases

### **1. Automated Accessibility Review**

```
Agent: "Review the accessibility of https://mysite.com and create a prioritized action plan"
```

### **2. Compliance Checking**

```
Agent: "Check if https://mysite.com meets WCAG 2.1 AA for government compliance"
```

### **3. Before/After Comparison**

```
Agent: "Scan https://mysite.com/old and https://mysite.com/new and compare accessibility improvements"
```

### **4. Educational Explanation**

```
Agent: "Scan https://example.com and explain each violation in simple terms for a non-technical client"
```

---

## 💰 Cost Estimates

**OpenAI Agent Builder Usage:**
- Model calls: Charged per token (gpt-4o, gpt-4o-mini, etc.)
- MCP tool calls: Free (runs on your Replit infrastructure)
- Video storage: Uses Replit disk space

**Typical Costs:**
- Single page scan: ~$0.01-0.05 (depending on agent model)
- 10-page website scan: ~$0.10-0.50
- Video recording: No extra cost

**Recommendation:** Start with gpt-4o-mini for cost-effective testing!

---

## 🔗 Useful Links

- **OpenAI Agent Builder**: https://platform.openai.com/agent-builder
- **MCP Documentation**: https://modelcontextprotocol.io
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **Your MCP Server**: `https://your-repl-url.repl.co`

---

**Your MCP server is ready! Start the SSE server and connect from Agent Builder! 🚀**
