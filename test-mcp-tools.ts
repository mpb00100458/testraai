#!/usr/bin/env tsx
/**
 * Test script for MCP server tools
 * Tests all 3 accessibility scanning tools locally
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const MCP_URL = 'http://localhost:5000/mcp/sse';

async function testMCPTools() {
  console.log('🧪 Testing MCP Server Tools...\n');
  console.log(`📡 Connecting to: ${MCP_URL}\n`);

  const client = new Client(
    {
      name: 'mcp-test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    // Connect to MCP server
    const transport = new SSEClientTransport(new URL(MCP_URL));
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // List available tools
    console.log('📋 Listing available tools...');
    const toolsResponse = await client.listTools();
    console.log(`Found ${toolsResponse.tools.length} tools:\n`);
    
    toolsResponse.tools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name}`);
      console.log(`     ${tool.description}\n`);
    });

    // Test 1: Get WCAG Guidance
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 1: Get WCAG Guidance for criterion 1.4.3');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const guidanceResult = await client.callTool({
      name: 'get_wcag_guidance',
      arguments: {
        criterion: '1.4.3'
      }
    });
    
    console.log('Result:');
    console.log(JSON.parse(guidanceResult.content[0].text));
    console.log('\n✅ WCAG Guidance test passed\n');

    // Test 2: Scan single URL
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 2: Scan Single URL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Scanning: https://example.com\n');
    
    const scanResult = await client.callTool({
      name: 'scan_url_accessibility',
      arguments: {
        url: 'https://example.com',
        wcagLevel: 'AA',
        outputFormat: 'text'
      }
    });
    
    console.log('Result:');
    const scanData = JSON.parse(scanResult.content[0].text);
    console.log(`  URL: ${scanData.url}`);
    console.log(`  Violations: ${scanData.violations}`);
    console.log(`  Passes: ${scanData.passes}`);
    console.log(`  Incomplete: ${scanData.incomplete}`);
    
    if (scanData.issues.length > 0) {
      console.log(`\n  Top Issues:`);
      scanData.issues.slice(0, 3).forEach((issue: any, i: number) => {
        console.log(`    ${i + 1}. ${issue.id} (${issue.impact}) - ${issue.nodes} occurrences`);
      });
    }
    console.log('\n✅ Single URL scan test passed\n');

    // Test 3: Scan website (multiple pages)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST 3: Scan Website (Multi-page)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Scanning: https://example.com (max 3 pages)\n');
    console.log('⏳ This may take 10-20 seconds...\n');
    
    const websiteScanResult = await client.callTool({
      name: 'scan_website_accessibility',
      arguments: {
        url: 'https://example.com',
        maxPages: 3,
        wcagLevel: 'AA',
        outputFormat: 'text'
      }
    });
    
    console.log('Result:');
    const websiteData = JSON.parse(websiteScanResult.content[0].text);
    console.log(`  Pages Scanned: ${websiteData.pagesScanned}`);
    console.log(`  Total Violations: ${websiteData.totalViolations}`);
    console.log(`  Unique Issue Types: ${websiteData.uniqueIssueTypes}`);
    
    if (websiteData.topIssues.length > 0) {
      console.log(`\n  Top Issues Across All Pages:`);
      websiteData.topIssues.slice(0, 5).forEach(([issueId, count]: [string, number]) => {
        console.log(`    - ${issueId}: ${count} occurrences`);
      });
    }
    
    console.log(`\n  Pages Visited:`);
    websiteData.pages.forEach((page: string) => {
      console.log(`    - ${page}`);
    });
    
    console.log('\n✅ Website scan test passed\n');

    // Cleanup
    await client.close();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TESTS PASSED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error: any) {
    console.error('❌ Error testing MCP tools:', error.message);
    console.error('\nMake sure the server is running on http://localhost:5000');
    process.exit(1);
  }
}

// Run tests
testMCPTools();
