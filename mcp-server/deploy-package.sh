#!/bin/bash

# Create standalone deployment package for MCP server

echo "📦 Creating MCP Server Deployment Package"
echo "=========================================="
echo ""

# Create deployment directory
DEPLOY_DIR="mcp-server-standalone"
echo "Creating deployment directory: $DEPLOY_DIR"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy dist files
echo "Copying built files..."
cp -r dist/* "$DEPLOY_DIR/"

# Copy package.json (minimal version)
echo "Creating package.json..."
cat > "$DEPLOY_DIR/package.json" << 'EOF'
{
  "name": "accessibility-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "bin": {
    "accessibility-mcp-server": "./index.js"
  },
  "scripts": {
    "start": "node index.js",
    "install-browsers": "npx playwright install"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "@axe-core/playwright": "^4.10.0",
    "axe-playwright": "^2.0.3",
    "exceljs": "^4.4.0",
    "playwright": "^1.49.1"
  }
}
EOF

# Create start scripts
echo "Creating start scripts..."

# Linux/Mac start script
cat > "$DEPLOY_DIR/start.sh" << 'EOF'
#!/bin/bash
echo "🚀 Starting Accessibility MCP Server..."
echo "========================================="
echo ""
echo "Server will run on stdio transport"
echo "HTTP download server on http://localhost:3456"
echo ""
node index.js
EOF
chmod +x "$DEPLOY_DIR/start.sh"

# Windows start script
cat > "$DEPLOY_DIR/start.bat" << 'EOF'
@echo off
echo Starting Accessibility MCP Server...
echo =========================================
echo.
echo Server will run on stdio transport
echo HTTP download server on http://localhost:3456
echo.
node index.js
EOF

# Create README
cat > "$DEPLOY_DIR/README.md" << 'EOF'
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
EOF

# Create .gitignore
cat > "$DEPLOY_DIR/.gitignore" << 'EOF'
node_modules/
*.log
.DS_Store
EOF

echo ""
echo "✅ Deployment package created successfully!"
echo ""
echo "📁 Location: $DEPLOY_DIR/"
echo ""
echo "📦 Contents:"
ls -lh "$DEPLOY_DIR/"
echo ""
echo "🚀 To deploy:"
echo "   1. cd $DEPLOY_DIR"
echo "   2. npm install"
echo "   3. npm run install-browsers"
echo "   4. ./start.sh"
echo ""
echo "📤 Or upload entire folder to your server!"
echo ""
