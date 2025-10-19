# Accessibility MCP Server - Standalone Package

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Playwright Browsers (First Time Only)

```bash
npm run install-browsers
```

### 3. Start Server

**Linux/Mac:**
```bash
./start.sh
```

**Windows:**
```bash
start.bat
```

**Or directly:**
```bash
node index.js
```

## Features

- WCAG 2.1 A/AA compliance scanning
- Video recording of scan sessions
- Screenshot capture
- Excel/JSON/Markdown report exports
- HTTP download server (localhost:3456)

## Usage with OpenAI Agents SDK

```python
from agents import Agent, Runner
from agents.mcp import MCPServerStdio

async with MCPServerStdio(
    name="accessibility",
    command="node",
    args=["/path/to/mcp-server-standalone/index.js"]
) as server:
    agent = Agent(
        name="Accessibility Expert",
        model="gpt-4o-mini",
        mcp_servers=[server]
    )
    
    result = await Runner.run(
        agent,
        "Scan https://example.com for accessibility issues"
    )
    print(result)
```

## Deployment

### Replit
1. Create new Node.js Repl
2. Upload this folder
3. Run `npm install`
4. Run `npm start`

### AWS/DigitalOcean/Any VPS
1. Copy folder to server
2. Install Node.js 18+
3. Run `npm install`
4. Run `./start.sh`

## Files Saved

All scan results saved to:
```
~/mcp-accessibility-reports/
├── videos/
├── screenshots/
├── *.xlsx (Excel reports)
├── *.json (JSON reports)
└── *.md (Markdown reports)
```

Download files at: http://localhost:3456/

## Support

See full documentation in the main repository.
