#!/bin/bash

echo "🚀 Starting Accessibility MCP Server (SSE Transport)"
echo "══════════════════════════════════════════════════════"
echo ""
echo "This server is compatible with OpenAI Agent Builder!"
echo ""

cd "$(dirname "$0")"

# Build if needed
if [ ! -d "dist" ]; then
    echo "📦 Building TypeScript..."
    npm run build
fi

# Start SSE server
echo "🌐 Starting HTTP/SSE server..."
node dist/sse-server.js
