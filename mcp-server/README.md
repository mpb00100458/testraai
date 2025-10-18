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

### Example 1: Scan a Website

Ask your AI assistant:
> "Can you scan https://example.com for accessibility issues?"

The assistant will use the `scan_url_accessibility` tool and provide a detailed report.

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
