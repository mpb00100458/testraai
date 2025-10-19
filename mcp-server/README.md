# Accessibility Testing MCP Server

A **Model Context Protocol (MCP)** server that provides web accessibility testing tools to AI assistants like Claude Desktop, Cursor, and other MCP-compatible clients.

Powered by **Playwright** and **axe-core**, this server enables AI assistants to perform real WCAG 2.1 A/AA compliance testing on any website.

---

## 🚀 Features

### Tools Provided

1. **`scan_url_accessibility`** - Full page accessibility scan
   - Scans any URL for WCAG violations
   - Supports A, AA, AAA conformance levels
   - Returns detailed violation reports with severity and remediation
   - **NEW:** Multiple output formats (text, Excel, JSON, Markdown, all)
   - **NEW:** Professional Excel reports with color-coded severity
   - **NEW:** Structured JSON exports for CI/CD integration
   - **NEW:** Saves reports to `~/mcp-accessibility-reports/`
   - **🎬 NEW:** Live browser window viewing (`headless=false`)
   - **🎥 NEW:** Video recording of scan sessions
   - **📸 NEW:** Screenshot capture before/after scanning

2. **`get_wcag_guidance`** - WCAG rule explanations
   - Get detailed guidance for specific WCAG rules
   - Includes remediation strategies
   - Links to official documentation

3. **`check_element_accessibility`** - Targeted element testing
   - Test specific page elements using CSS selectors
   - Useful for component-level testing
   - Validates individual form fields, buttons, etc.

4. **`generate_accessibility_report`** - Report generation
   - Creates executive summaries from scan results
   - Priority-based issue breakdown
   - Actionable recommendations

---

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Install Dependencies

```bash
cd mcp-server
npm install
npm run build
```

---

## 🔧 Configuration

### For Claude Desktop

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "accessibility-testing": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-server/dist/index.js"
      ]
    }
  }
}
```

### For Cursor

Add to Cursor's MCP settings:

```json
{
  "mcpServers": {
    "accessibility-testing": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-server/dist/index.js"
      ]
    }
  }
}
```

### For Cline / Other MCP Clients

Configure according to the client's MCP server settings, using:
- **Command:** `node`
- **Args:** `["/path/to/mcp-server/dist/index.js"]`

---

## 💡 Usage Examples

### Example 1: Quick Text Scan

Ask your AI assistant:
> "Can you scan https://example.com for accessibility issues?"

Returns: Markdown text report (no files saved)

### Example 2: Excel Report Export

> "Scan https://example.com and save as Excel"

Returns: Text report + Professional XLSX file with color-coded violations

### Example 3: JSON Data Export

> "Scan https://example.com and output as JSON"

Returns: Text report + Structured JSON file for integration

### Example 4: All Formats

> "Scan https://example.com and generate all output formats"

Returns: Text report + Excel + JSON + Markdown files

### Example 5: Live Browser Viewing 🎬

> "Scan https://example.com with headless=false"

Watch the browser window open and perform the scan live on your screen!

### Example 6: Video Recording 🎥

> "Scan https://example.com and record a video"

Returns: Text report + WebM video file (1280x720)

### Example 7: Full Visual Feedback (Option C!)

> "Scan https://example.com - show browser, record video, and take screenshots"

Returns: Text report + Live browser window + Video + Screenshots

### Example 2: Get WCAG Guidance

> "What does the color-contrast rule mean in WCAG?"

The assistant will use `get_wcag_guidance` to explain the rule.

### Example 3: Check Specific Element

> "Check if the login button on https://example.com is accessible. It has the selector '#login-btn'"

The assistant will use `check_element_accessibility` to test that specific element.

### Example 4: Generate Report

> "Generate an executive summary of these scan results: {paste results}"

The assistant will create a prioritized report with recommendations.

---

## 🛠️ Development

### Run in Development Mode

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Test the Server

Use the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## 📊 What Gets Tested

The server tests for **WCAG 2.1 Level A/AA** compliance including:

- ✅ Color contrast ratios
- ✅ Alternative text for images
- ✅ Form labels and ARIA attributes
- ✅ Keyboard accessibility
- ✅ Semantic HTML structure
- ✅ Focus indicators
- ✅ Heading hierarchy
- ✅ Link text clarity
- ✅ Language attributes
- ✅ And 50+ other automated checks

**Note:** Automated testing covers ~30-40% of WCAG criteria. Manual testing is still required for full compliance.

---

## 🔐 Security

- Server runs in headless browser mode
- No data is stored or transmitted externally
- All scans are performed locally
- Follows axe-core security best practices

---

## 🤝 Contributing

This MCP server is part of the **TestraAI** project. For contributions:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🔗 Resources

- [Model Context Protocol Docs](https://modelcontextprotocol.io)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/master/doc/rule-descriptions.md)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Playwright Documentation](https://playwright.dev)

---

## 💬 Support

For issues or questions:
- Open an issue on GitHub
- Contact: TestraAI Support

---

**Built with ❤️ by TestraAI**
