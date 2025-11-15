#!/bin/bash

# Test script for MCP server
# Tests both stdio and SSE transports

echo "🧪 Testing Accessibility MCP Server"
echo "===================================="
echo ""

# Test 1: Check if MCP server builds
echo "📦 Test 1: Building MCP server..."
cd mcp-server
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed"
  exit 1
fi
echo ""

# Test 2: Check if dist files exist
echo "📁 Test 2: Checking dist files..."
if [ -f "dist/index.js" ] && [ -f "dist/sse-server.js" ]; then
  echo "✅ Dist files exist"
else
  echo "❌ Dist files missing"
  exit 1
fi
echo ""

# Test 3: Test stdio transport (list tools)
echo "🔧 Test 3: Testing stdio transport (list tools)..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js 2>/dev/null | head -1 > /tmp/mcp-test-output.json

if grep -q "scan_url_accessibility" /tmp/mcp-test-output.json; then
  echo "✅ Stdio transport works - tools listed successfully"
else
  echo "❌ Stdio transport failed"
  cat /tmp/mcp-test-output.json
  exit 1
fi
echo ""

# Test 4: Check main app integration
echo "🌐 Test 4: Checking main app MCP routes..."
cd ..
if grep -q "app.use('/mcp', mcpRoutes)" server/routes.ts; then
  echo "✅ MCP routes integrated in main app"
else
  echo "❌ MCP routes not found in main app"
  exit 1
fi
echo ""

# Test 5: Verify MCP endpoints exist
echo "🔍 Test 5: Verifying MCP route handlers..."
if grep -q "router.get('/sse'" server/mcpRoutes.ts && grep -q "router.post('/messages'" server/mcpRoutes.ts; then
  echo "✅ SSE and message endpoints exist"
else
  echo "❌ MCP endpoints missing"
  exit 1
fi
echo ""

echo "🎉 All tests passed!"
echo ""
echo "📋 Summary:"
echo "  ✅ MCP server builds successfully"
echo "  ✅ Stdio transport works"
echo "  ✅ SSE transport integrated"
echo "  ✅ Main app has MCP routes"
echo ""
echo "🚀 Next steps:"
echo "  1. Start the app: npm run dev"
echo "  2. Test SSE endpoint: curl http://localhost:3000/mcp/info"
echo "  3. Configure Claude Desktop with: mcp-server/dist/index.js"
echo ""

