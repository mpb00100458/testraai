#!/bin/bash

# Setup script for Claude Desktop MCP integration

echo "🧪 MCP Server Setup for Claude Desktop"
echo "========================================"
echo ""

# Get absolute path
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MCP_SERVER_PATH="$SCRIPT_DIR/dist/index.js"

echo "📁 Your MCP server path:"
echo "   $MCP_SERVER_PATH"
echo ""

# Check if built
if [ ! -f "$MCP_SERVER_PATH" ]; then
    echo "❌ MCP server not built yet!"
    echo "   Run: cd mcp-server && npm run build"
    exit 1
fi

echo "✅ MCP server is built and ready"
echo ""

# Detect OS and show config path
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    OS_NAME="macOS"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    CONFIG_PATH="$APPDATA/Claude/claude_desktop_config.json"
    OS_NAME="Windows"
else
    CONFIG_PATH="$HOME/.config/Claude/claude_desktop_config.json"
    OS_NAME="Linux"
fi

echo "🖥️  Detected OS: $OS_NAME"
echo "📄 Claude Desktop config file:"
echo "   $CONFIG_PATH"
echo ""

# Generate config
echo "📋 Copy this configuration:"
echo "================================"
cat << EOF
{
  "mcpServers": {
    "accessibility-testing": {
      "command": "node",
      "args": [
        "$MCP_SERVER_PATH"
      ]
    }
  }
}
EOF
echo "================================"
echo ""

echo "📝 Next steps:"
echo "1. Open/create the config file above"
echo "2. Copy the JSON configuration"
echo "3. Restart Claude Desktop completely"
echo "4. Look for 🔌 hammer icon in chat"
echo ""

echo "🧪 Test commands to try:"
echo "- 'Scan https://example.com for accessibility issues'"
echo "- 'Scan https://google.com and record a video'"
echo "- 'What does color-contrast mean in WCAG?'"
echo ""

echo "📚 Full testing guide: mcp-server/TEST_GUIDE.md"
echo "✅ Setup complete!"
