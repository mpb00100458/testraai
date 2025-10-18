# Quick Setup Guide - Accessibility MCP Server

## ✅ What's Been Created

Your MCP server is built and ready to use! Here's what you have:

```
mcp-server/
├── index.ts              # Main server code (487 lines)
├── dist/
│   ├── index.js         # Compiled JavaScript (16KB)
│   └── index.d.ts       # TypeScript declarations
├── package.json         # MCP server package config
├── tsconfig.json        # TypeScript configuration
├── README.md            # Full documentation
└── SETUP.md            # This file
```

---

## 🚀 How to Use

### Option 1: With Claude Desktop (Recommended)

1. **Find your Claude Desktop config file:**
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. **Add this configuration:**
   ```json
   {
     "mcpServers": {
       "accessibility-testing": {
         "command": "node",
         "args": [
           "/absolute/path/to/workspace/mcp-server/dist/index.js"
         ]
       }
     }
   }
   ```

3. **Replace `/absolute/path/to/workspace`** with your actual path:
   ```bash
   # Run this in Shell to get the path:
   pwd
   # Example output: /home/runner/workspace
   # Use: /home/runner/workspace/mcp-server/dist/index.js
   ```

4. **Restart Claude Desktop**

5. **Test it!** Ask Claude:
   > "Can you scan https://example.com for accessibility issues?"

---

### Option 2: With Cursor IDE

1. Open Cursor Settings → MCP Servers
2. Add new server:
   ```json
   {
     "accessibility-testing": {
       "command": "node",
       "args": ["/absolute/path/to/mcp-server/dist/index.js"]
     }
   }
   ```
3. Restart Cursor

---

### Option 3: Test Locally

Use the MCP Inspector for testing:

```bash
npx @modelcontextprotocol/inspector node mcp-server/dist/index.js
```

This opens a web UI where you can test all the tools interactively!

---

## 🛠️ Available Tools

Your MCP server provides 4 powerful tools:

### 1. `scan_url_accessibility`
Full WCAG scan of any URL
```
Input: { url: "https://example.com", wcagLevel: "AA" }
Output: Detailed accessibility report
```

### 2. `get_wcag_guidance`
Get explanations for WCAG rules
```
Input: { ruleId: "color-contrast" }
Output: Detailed guidance and remediation
```

### 3. `check_element_accessibility`
Test specific page elements
```
Input: { url: "https://example.com", selector: "#login-form" }
Output: Element-specific accessibility report
```

### 4. `generate_accessibility_report`
Generate executive summaries
```
Input: { scanResults: "{...json...}" }
Output: Executive summary with priorities
```

---

## 🧪 Example Prompts (For Claude/Cursor)

Once configured, try these:

1. **Full Scan:**
   > "Scan https://www.google.com for WCAG AA violations"

2. **Get Guidance:**
   > "Explain the color-contrast rule in WCAG"

3. **Check Element:**
   > "Check if the main navigation on https://example.com is accessible. Use selector 'nav'"

4. **Generate Report:**
   > "Based on the scan results I pasted, generate an executive summary"

---

## 🔧 Rebuilding After Changes

If you modify `index.ts`:

```bash
cd mcp-server
npm run build
```

---

## 🎯 Next Steps

1. ✅ **Commit to Git:**
   ```bash
   git add mcp-server/
   git commit -m "Add Accessibility MCP Server with WCAG scanning tools"
   git push origin accessibilitymcp
   ```

2. ✅ **Configure in Claude Desktop or Cursor**

3. ✅ **Test with real websites**

4. ✅ **Share with your team!**

---

## 📊 What Gets Tested

- ✅ Color contrast (WCAG 1.4.3)
- ✅ Alt text for images (1.1.1)
- ✅ Form labels (1.3.1, 4.1.2)
- ✅ ARIA attributes (4.1.2)
- ✅ Keyboard accessibility
- ✅ Heading hierarchy
- ✅ Link clarity (2.4.4)
- ✅ Language attributes (3.1.1)
- ✅ And 50+ other automated checks!

**Note:** Automated testing covers ~30-40% of WCAG. Manual testing still needed for full compliance.

---

## 🤝 Support

- Built with TestraAI's Playwright + axe-core engine
- Powered by Model Context Protocol (MCP)
- Questions? Check README.md for full docs

---

**Happy Accessibility Testing! 🎉**
