# 🤖 Setup MCP Server for OpenAI Agent Builder

## ✅ Your MCP Server is Ready!

I've deployed your accessibility scanner **in this Repl** with SSE (Server-Sent Events) support for OpenAI Agent Builder!

---

## 🚀 Quick Start (3 Steps)

### **Step 1: Start the SSE Server**

Run this command in the Shell:

```bash
cd mcp-server && npm run sse
```

**Or click the "Run" button** - I'll configure it for you!

**Expected Output:**
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
  4. Auth: None
```

---

### **Step 2: Get Your Repl URL**

When you run this Repl, look at the **top of the window** - Replit shows your deployment URL:

**It looks like:**
```
🌐 https://[repl-name].[username].repl.co
```

**Your MCP endpoint is:**
```
https://[repl-name].[username].repl.co/sse
```

**Example:**
```
https://accessibility-mcp.alice.repl.co/sse
```

---

### **Step 3: Add to OpenAI Agent Builder**

1. Go to **https://platform.openai.com/agent-builder**
2. Create a new workflow or open existing one
3. Drag an **"MCP"** node from the sidebar
4. Configure it:
   ```
   Server Label: accessibility-scanner
   Server URL: https://your-repl-url.repl.co/sse
   Auth Type: No Auth
   ```
5. Connect the MCP node to your Agent node
6. Done! ✅

---

## 🧪 Test Your Agent

Try these prompts in Agent Builder:

### **Test 1: List Tools**
```
"What accessibility testing tools do you have?"
```

Should see:
- ✅ scan_url_accessibility
- ✅ scan_website_accessibility  
- ✅ get_wcag_guidance

### **Test 2: Scan a Page**
```
"Scan https://example.com for accessibility issues"
```

Agent will analyze WCAG compliance and return violations!

### **Test 3: Full Audit**
```
"Audit https://example.com (first 5 pages) and record a video"
```

Agent will scan multiple pages and provide download links!

---

## 🎬 Available Tools

### **1. scan_url_accessibility**
Scan single URL for WCAG violations

**Example:**
```
"Scan https://mysite.com with video recording"
```

### **2. scan_website_accessibility**
Scan multiple pages (up to maxPages)

**Example:**
```
"Scan https://mysite.com, max 10 pages, with screenshots"
```

### **3. get_wcag_guidance**
Get WCAG criterion explanations

**Example:**
```
"Explain WCAG 1.4.3"
```

---

## 📥 Download Results

All scan results available at:
```
http://localhost:3456
```

Or via your Repl URL (port 3456)

---

## 🔧 What I Built

✅ **SSE Server** (`mcp-server/sse-server.ts`)
- HTTP endpoint for OpenAI Agent Builder
- Compatible with MCP protocol over SSE
- Runs on port 8080

✅ **Start Script** (`mcp-server/start-sse.sh`)
- Easy launch command
- Auto-builds if needed

✅ **Documentation** (`mcp-server/OPENAI_AGENT_BUILDER.md`)
- Complete integration guide
- Example workflows
- Troubleshooting tips

---

## ⚡ Next Steps

1. **Run:** `cd mcp-server && npm run sse`
2. **Copy:** Your Repl URL + `/sse`
3. **Add:** To OpenAI Agent Builder
4. **Test:** Scan a website!

---

**Ready to scan websites with AI! 🚀**

See full guide: `mcp-server/OPENAI_AGENT_BUILDER.md`
