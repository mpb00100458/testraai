#!/bin/bash

# Test script for new comprehensive accessibility features
# This script tests the new MCP tools added to TestraAI

echo "🧪 Testing New Comprehensive Accessibility Features"
echo "=================================================="
echo ""

# Test 1: Comprehensive WCAG scan with scan_page
echo "Test 1: Comprehensive WCAG 2.2 AA Scan"
echo "--------------------------------------"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"scan_page","arguments":{"url":"https://www.w3.org/WAI/demos/bad/","standards":["wcag22aa"],"outputFormat":"text"}}}' | node mcp-server/dist/index.js 2>&1 | head -50
echo ""
echo ""

# Test 2: Category-based filtering
echo "Test 2: Category-Based Filtering (Forms + ARIA)"
echo "-----------------------------------------------"
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"scan_page","arguments":{"url":"https://www.w3.org/WAI/demos/bad/","standards":["wcag21aa"],"categories":["cat.forms","cat.aria"],"outputFormat":"text"}}}' | node mcp-server/dist/index.js 2>&1 | head -50
echo ""
echo ""

# Test 3: Browser snapshot (accessibility tree)
echo "Test 3: Browser Snapshot (Accessibility Tree)"
echo "---------------------------------------------"
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"browser_snapshot","arguments":{"url":"https://www.w3.org/WAI/demos/bad/","includeHidden":false}}}' | node mcp-server/dist/index.js 2>&1 | head -50
echo ""
echo ""

# Test 4: Browser navigate
echo "Test 4: Browser Navigate"
echo "-----------------------"
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"browser_navigate","arguments":{"url":"https://www.w3.org/","waitUntil":"networkidle"}}}' | node mcp-server/dist/index.js 2>&1 | head -20
echo ""
echo ""

# Test 5: Browser console messages
echo "Test 5: Browser Console Messages"
echo "--------------------------------"
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"browser_console_messages","arguments":{"url":"https://www.w3.org/WAI/demos/bad/","types":["error","warning"]}}}' | node mcp-server/dist/index.js 2>&1 | head -30
echo ""
echo ""

# Test 6: Browser network requests
echo "Test 6: Browser Network Requests"
echo "--------------------------------"
echo '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"browser_network_requests","arguments":{"url":"https://www.w3.org/","filterType":"all"}}}' | node mcp-server/dist/index.js 2>&1 | head -30
echo ""
echo ""

echo "✅ All tests completed!"
echo ""
echo "📊 Summary of New Features Tested:"
echo "  ✓ scan_page with WCAG 2.2 standards"
echo "  ✓ Category-based filtering (cat.forms, cat.aria)"
echo "  ✓ browser_snapshot (accessibility tree)"
echo "  ✓ browser_navigate"
echo "  ✓ browser_console_messages"
echo "  ✓ browser_network_requests"
echo ""
echo "🎯 Additional tools available:"
echo "  • browser_click - Click elements"
echo "  • browser_type - Type into inputs"
echo "  • browser_take_screenshot - Capture screenshots with annotations"
echo "  • browser_screen_click - Vision mode coordinate clicking"
echo ""
echo "📚 See COMPREHENSIVE_ACCESSIBILITY_FEATURES.md for full documentation"

