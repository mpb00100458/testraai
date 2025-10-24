/**
 * MCP Server Routes for OpenAI Agent Builder Integration
 * Mounts SSE-based accessibility scanning endpoints into main TestraAI app
 */

import { Router } from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { generateExcelReport, generateJsonReport, generateMarkdownReport, type ExportData } from '../mcp-server/exportUtils.js';
import { rename, unlink } from 'fs/promises';
import path from 'path';

const router = Router();

// Enable CORS for OpenAI Agent Builder
router.use(cors({
  origin: '*',
  credentials: true
}));

// WCAG Guidance Database (60+ rules)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let WCAG_GUIDANCE: any = {};
try {
  const guidancePath = path.join(__dirname, '../mcp-server/wcag-guidance.json');
  WCAG_GUIDANCE = JSON.parse(readFileSync(guidancePath, 'utf-8'));
} catch (err) {
  console.error('[MCP] Could not load WCAG guidance:', err);
}

// Define MCP tools
const TOOLS: Tool[] = [
  {
    name: "scan_url_accessibility",
    description: "Scan a single URL for WCAG 2.1 A/AA accessibility violations",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to scan" },
        wcagLevel: { type: "string", enum: ["A", "AA", "AAA"], default: "AA" },
        outputFormat: { type: "string", enum: ["text", "json"], default: "text" }
      },
      required: ["url"],
    },
  },
  {
    name: "scan_website_accessibility",
    description: "Scan entire website (multiple pages) for accessibility issues",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Starting URL" },
        maxPages: { type: "number", default: 10 },
        wcagLevel: { type: "string", enum: ["A", "AA", "AAA"], default: "AA" },
        outputFormat: { type: "string", enum: ["text", "json"], default: "text" }
      },
      required: ["url"],
    },
  },
  {
    name: "get_wcag_guidance",
    description: "Get WCAG guidance for specific success criteria",
    inputSchema: {
      type: "object",
      properties: {
        criterion: { type: "string", description: "WCAG criterion or axe rule ID" }
      },
      required: ["criterion"],
    },
  }
];

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'TestraAI MCP Server',
    transport: 'SSE',
    compatible: 'OpenAI Agent Builder'
  });
});

// MCP Info endpoint
router.get('/info', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    name: 'TestraAI Accessibility Testing MCP Server',
    description: 'WCAG 2.1 A/AA compliance scanning with Playwright and axe-core',
    version: '1.0.0',
    endpoints: {
      sse: `${baseUrl}/mcp/sse`,
      health: `${baseUrl}/mcp/health`,
      info: `${baseUrl}/mcp/info`
    },
    integration: {
      platform: 'OpenAI Agent Builder',
      url: 'https://platform.openai.com/agent-builder',
      instructions: `Use ${baseUrl}/mcp/sse as the MCP Server URL`
    },
    tools: TOOLS.map(t => t.name)
  });
});

// SSE endpoint for MCP protocol
router.get('/sse', async (req, res) => {
  console.log('[MCP SSE] New connection from:', req.ip);
  
  const server = new Server(
    {
      name: "testraai-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool list requests
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "scan_url_accessibility":
          return await scanUrlAccessibility(args);
        
        case "scan_website_accessibility":
          return await scanWebsiteAccessibility(args);
        
        case "get_wcag_guidance":
          return await getWcagGuidance(args);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }],
        isError: true,
      };
    }
  });

  const transport = new SSEServerTransport('/mcp/sse', res);
  await server.connect(transport);

  req.on('close', () => {
    console.log('[MCP SSE] Connection closed');
  });
});

// Tool implementations
async function scanUrlAccessibility(args: any) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto(args.url, { waitUntil: 'networkidle', timeout: 10000 });
    const results = await new AxeBuilder({ page }).analyze();
    
    const summary = {
      url: args.url,
      violations: results.violations.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      issues: results.violations.map((v: any) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length
      }))
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(summary, null, 2)
      }]
    };
  } finally {
    await browser.close();
  }
}

async function scanWebsiteAccessibility(args: any) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const visited = new Set<string>();
  const toVisit = [args.url];
  const maxPages = args.maxPages || 10;
  const allViolations: any[] = [];
  
  try {
    while (toVisit.length > 0 && visited.size < maxPages) {
      const currentUrl = toVisit.shift()!;
      if (visited.has(currentUrl)) continue;
      
      visited.add(currentUrl);
      await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 10000 });
      
      const results = await new AxeBuilder({ page }).analyze();
      allViolations.push(...results.violations.map((v: any) => ({
        ...v,
        pageUrl: currentUrl
      })));
      
      // Discover more pages
      const links = await page.$$eval('a[href]', (anchors) =>
        anchors.map(a => (a as HTMLAnchorElement).href)
      );
      
      for (const link of links.slice(0, 20)) {
        try {
          const linkUrl = new URL(link, currentUrl);
          if (linkUrl.origin === new URL(currentUrl).origin && !visited.has(linkUrl.href)) {
            toVisit.push(linkUrl.href);
          }
        } catch {}
      }
    }
    
    const summary = {
      pagesScanned: visited.size,
      totalViolations: allViolations.length,
      uniqueIssueTypes: Array.from(new Set(allViolations.map(v => v.id))).length,
      pages: Array.from(visited),
      topIssues: Object.entries(
        allViolations.reduce((acc: any, v) => {
          acc[v.id] = (acc[v.id] || 0) + 1;
          return acc;
        }, {})
      ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10)
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(summary, null, 2)
      }]
    };
  } finally {
    await browser.close();
  }
}

async function getWcagGuidance(args: any) {
  const criterion = args.criterion;
  const guidance = WCAG_GUIDANCE[criterion];
  
  if (guidance) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify(guidance, null, 2)
      }]
    };
  }
  
  return {
    content: [{
      type: "text",
      text: `No guidance found for: ${criterion}`
    }]
  };
}

export default router;
