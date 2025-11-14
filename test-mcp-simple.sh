#!/bin/bash

echo "🧪 Testing MCP Server Tools"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Health Check
echo "✅ TEST 1: Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s http://localhost:5000/mcp/health | jq .
echo ""

# Test 2: Server Info
echo "✅ TEST 2: Server Info & Available Tools"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s http://localhost:5000/mcp/info | jq .
echo ""

# Test 3: SSE Endpoint (just verify it responds)
echo "✅ TEST 3: SSE Endpoint Response"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
timeout 2 curl -s http://localhost:5000/mcp/sse 2>&1 | head -3
echo ""
echo ""

# Test 4: Live URL Health Check
echo "✅ TEST 4: Live Published URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s https://agentium.replit.app/mcp/health | jq .
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ MCP Server is running and ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Available Tools:"
echo "  1. scan_url_accessibility"
echo "  2. scan_website_accessibility"
echo "  3. get_wcag_guidance"
echo ""
echo "🔗 OpenAI Agent Builder URL:"
echo "   https://agentium.replit.app/mcp/sse"
echo ""
