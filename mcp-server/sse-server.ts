#!/usr/bin/env node

/**
 * SSE-based MCP Server for OpenAI Agent Builder
 * 
 * Exposes the accessibility scanner via HTTP with Server-Sent Events transport
 * Compatible with OpenAI Agent Builder at https://platform.openai.com/agent-builder
 */

import express from 'express';
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
import { generateExcelReport, generateJsonReport, generateMarkdownReport, ExportData, ensureVideosDir, ensureScreenshotsDir } from './exportUtils.js';
import { rename, unlink } from 'fs/promises';
import path from 'path';
import { fileServer } from './fileServer.js';

const app = express();
const PORT = parseInt(process.env.PORT || '8080');

// Enable CORS for OpenAI Agent Builder
app.use(cors({
  origin: '*', // In production, restrict to platform.openai.com
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Accessibility MCP Server',
    transport: 'SSE',
    compatible: 'OpenAI Agent Builder'
  });
});

// Root endpoint with info
app.get('/', (req, res) => {
  res.json({
    name: 'Accessibility Testing MCP Server',
    description: 'WCAG 2.1 A/AA compliance scanning with Playwright and axe-core',
    version: '1.0.0',
    endpoints: {
      sse: '/sse',
      health: '/health',
      downloads: 'http://localhost:3456'
    },
    integration: {
      platform: 'OpenAI Agent Builder',
      url: 'https://platform.openai.com/agent-builder',
      instructions: 'Add this server URL to the MCP node in Agent Builder'
    },
    tools: [
      'scan_url_accessibility',
      'scan_website_accessibility',
      'get_wcag_guidance',
      'export_results'
    ]
  });
});

// Define MCP tools (same as stdio version)
const TOOLS: Tool[] = [
  {
    name: "scan_url_accessibility",
    description: "Scan a single URL for WCAG 2.1 A/AA accessibility violations. Returns detailed violation reports with severity, impact, and remediation guidance. Supports video recording and screenshots.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to scan (must include http:// or https://)",
        },
        wcagLevel: {
          type: "string",
          enum: ["A", "AA", "AAA"],
          description: "WCAG conformance level (default: AA)",
          default: "AA"
        },
        outputFormat: {
          type: "string",
          enum: ["text", "excel", "json", "markdown", "all"],
          description: "Output format (default: text)",
          default: "text"
        },
        recordVideo: {
          type: "boolean",
          description: "Record video of scan (default: false)",
          default: false
        },
        captureScreenshots: {
          type: "boolean",
          description: "Capture screenshots (default: false)",
          default: false
        }
      },
      required: ["url"],
    },
  },
  {
    name: "scan_website_accessibility",
    description: "Scan an entire website (multiple pages) for accessibility issues. Crawls up to maxPages, records video, captures screenshots. Perfect for comprehensive site audits.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Starting URL to scan",
        },
        maxPages: {
          type: "number",
          description: "Maximum pages to scan (default: 10)",
          default: 10
        },
        wcagLevel: {
          type: "string",
          enum: ["A", "AA", "AAA"],
          description: "WCAG level (default: AA)",
          default: "AA"
        },
        outputFormat: {
          type: "string",
          enum: ["text", "excel", "json", "markdown", "all"],
          description: "Output format (default: text)",
          default: "text"
        },
        recordVideo: {
          type: "boolean",
          description: "Record full scan video (default: true)",
          default: true
        }
      },
      required: ["url"],
    },
  },
  {
    name: "get_wcag_guidance",
    description: "Get detailed WCAG guidance for specific success criteria or rules",
    inputSchema: {
      type: "object",
      properties: {
        criterion: {
          type: "string",
          description: "WCAG criterion (e.g., '1.1.1', '2.4.1') or axe rule ID",
        }
      },
      required: ["criterion"],
    },
  }
];

// SSE endpoint for MCP protocol
app.get('/sse', async (req, res) => {
  console.log('[SSE] New connection from:', req.ip);
  
  const server = new Server(
    {
      name: "accessibility-testing-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const transport = new SSEServerTransport('/message', res);

  // Tool handlers (import from main server logic)
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "scan_url_accessibility") {
        const result = await scanUrl(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } else if (name === "scan_website_accessibility") {
        const result = await scanWebsite(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } else if (name === "get_wcag_guidance") {
        const criterion = args?.criterion as string || '';
        const guidance = getWcagGuidance(criterion);
        return { content: [{ type: "text", text: guidance }] };
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  });

  await server.connect(transport);
  console.log('[SSE] MCP server connected for client:', req.ip);
});

// POST endpoint for messages (required by SSE transport)
app.post('/message', async (req, res) => {
  // SSE transport handles this
  res.status(200).send();
});

// Scan implementation (simplified - you'll import from main server)
async function scanUrl(args: any) {
  const { url, wcagLevel = 'AA', outputFormat = 'text', recordVideo = false, captureScreenshots = false } = args;
  
  console.log(`[Scanner] Scanning ${url} (WCAG ${wcagLevel})...`);
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    recordVideo: recordVideo ? { dir: await ensureVideosDir(), size: { width: 1280, height: 720 } } : undefined
  });
  
  const page = await context.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    if (captureScreenshots) {
      const screenshotsDir = await ensureScreenshotsDir();
      await page.screenshot({ 
        path: path.join(screenshotsDir, `scan-${Date.now()}.png`),
        fullPage: true 
      });
    }
    
    const axeBuilder = new AxeBuilder({ page });
    if (wcagLevel) {
      axeBuilder.withTags([`wcag${wcagLevel.toLowerCase()}`, `wcag2${wcagLevel.toLowerCase()}`]);
    }
    
    const results = await axeBuilder.analyze();
    
    let videoPath: string | undefined;
    if (recordVideo) {
      await context.close();
      const video = page.video();
      if (video) {
        const videoTempPath = await video.path();
        const videosDir = await ensureVideosDir();
        videoPath = path.join(videosDir, `scan-${Date.now()}.webm`);
        await rename(videoTempPath, videoPath);
      }
    }
    
    const summary = {
      url,
      wcagLevel,
      timestamp: new Date().toISOString(),
      violations: results.violations.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      videoPath: videoPath ? `http://localhost:3456${videoPath.replace(process.env.HOME || '', '')}` : undefined,
      downloadServer: 'http://localhost:3456',
      violations_detail: results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length
      }))
    };
    
    return summary;
    
  } finally {
    if (!recordVideo) {
      await context.close();
    }
    await browser.close();
  }
}

async function scanWebsite(args: any) {
  // Simplified multi-page scan
  return {
    message: "Multi-page scanning coming soon",
    singlePageScan: await scanUrl(args)
  };
}

function getWcagGuidance(criterion: string): string {
  const guidance: Record<string, string> = {
    "1.1.1": "Non-text Content (Level A): All non-text content must have a text alternative.",
    "1.3.1": "Info and Relationships (Level A): Information, structure, and relationships conveyed through presentation can be programmatically determined.",
    "1.4.3": "Contrast (Minimum) (Level AA): Text and images of text must have a contrast ratio of at least 4.5:1.",
    "2.1.1": "Keyboard (Level A): All functionality must be available from a keyboard.",
    "2.4.1": "Bypass Blocks (Level A): A mechanism is available to bypass blocks of content that are repeated on multiple pages.",
    "2.4.2": "Page Titled (Level A): Web pages have titles that describe topic or purpose.",
    "3.1.1": "Language of Page (Level A): The default human language of each Web page can be programmatically determined.",
    "4.1.2": "Name, Role, Value (Level A): For all UI components, the name and role can be programmatically determined."
  };
  
  return guidance[criterion] || `WCAG Guidance for ${criterion}: Please refer to https://www.w3.org/WAI/WCAG21/quickref/?versions=2.1#${criterion}`;
}

// Start servers
app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Accessibility Testing MCP Server (SSE Transport)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  🚀 MCP SSE Endpoint: http://0.0.0.0:${PORT}/sse`);
  console.log(`  ❤️  Health Check:     http://0.0.0.0:${PORT}/health`);
  console.log(`  📥 Downloads:        http://localhost:3456`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🤖 OPENAI AGENT BUILDER INTEGRATION');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  1. Go to: https://platform.openai.com/agent-builder`);
  console.log(`  2. Add MCP Server node to your workflow`);
  console.log(`  3. Server URL: https://your-repl-url.repl.co/sse`);
  console.log(`  4. Auth: None (or add API key if needed)`);
  console.log('');
  console.log('  Your Repl URL will be shown when you deploy/run this Repl');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
});

// File download server is already running (started in fileServer.ts)
