#!/usr/bin/env node

/**
 * Accessibility Testing MCP Server
 * 
 * Provides accessibility scanning tools for AI assistants via Model Context Protocol
 * Powered by TestraAI's Playwright + axe-core scanning engine
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { generateExcelReport, generateJsonReport, generateMarkdownReport, ExportData, ensureVideosDir, ensureScreenshotsDir } from './exportUtils.js';
import { rename, unlink } from 'fs/promises';
import path from 'path';
import { fileServer } from './fileServer.js';

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "scan_url_accessibility",
    description: "Scan a URL for WCAG 2.1 A/AA accessibility violations using Playwright and axe-core. Returns detailed violation reports with severity, impact, and remediation guidance. Supports multiple output formats (text, Excel, JSON, or all). NEW: Visual feedback with live browser window, video recording, and screenshots!",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to scan for accessibility issues (must include http:// or https://)",
        },
        wcagLevel: {
          type: "string",
          enum: ["A", "AA", "AAA"],
          description: "WCAG conformance level to test (default: AA)",
          default: "AA"
        },
        outputFormat: {
          type: "string",
          enum: ["text", "excel", "json", "markdown", "all"],
          description: "Output format: 'text' (default, AI-readable), 'excel' (XLSX file), 'json' (JSON file), 'markdown' (MD file), or 'all' (generates all formats)",
          default: "text"
        },
        saveToFile: {
          type: "boolean",
          description: "Whether to save results to file (default: true for excel/json/markdown, false for text)",
          default: true
        },
        headless: {
          type: "boolean",
          description: "Run browser in headless mode (default: true). Set to false to watch the scan happen live in a browser window!",
          default: true
        },
        recordVideo: {
          type: "boolean",
          description: "Record video of the scan session (default: false). Video saved to ~/mcp-accessibility-reports/videos/",
          default: false
        },
        captureScreenshots: {
          type: "boolean",
          description: "Capture screenshots during scan (default: false). Screenshots saved to ~/mcp-accessibility-reports/screenshots/",
          default: false
        }
      },
      required: ["url"],
    },
  },
  {
    name: "get_wcag_guidance",
    description: "Get detailed WCAG guidance for a specific success criterion or rule. Provides context, requirements, and remediation strategies.",
    inputSchema: {
      type: "object",
      properties: {
        ruleId: {
          type: "string",
          description: "The WCAG rule ID (e.g., 'color-contrast', 'aria-required-attr', '1.4.3') or success criterion number",
        }
      },
      required: ["ruleId"],
    },
  },
  {
    name: "check_element_accessibility",
    description: "Check accessibility of specific page elements using CSS selectors. Useful for targeted testing of components or sections.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL containing the element to test",
        },
        selector: {
          type: "string",
          description: "CSS selector for the element to test (e.g., '#main-nav', '.login-form')",
        }
      },
      required: ["url", "selector"],
    },
  },
  {
    name: "generate_accessibility_report",
    description: "Generate a comprehensive accessibility report summary from scan results. Provides executive summary, statistics, and prioritized issues.",
    inputSchema: {
      type: "object",
      properties: {
        scanResults: {
          type: "string",
          description: "JSON string of scan results from scan_url_accessibility",
        }
      },
      required: ["scanResults"],
    },
  }
];

// WCAG guidance database
const WCAG_GUIDANCE: Record<string, any> = {
  "color-contrast": {
    criterion: "1.4.3 Contrast (Minimum)",
    level: "AA",
    description: "Text must have sufficient contrast ratio against background",
    requirements: "Normal text: 4.5:1, Large text: 3:1",
    remediation: "Increase color contrast using darker text or lighter backgrounds. Use browser DevTools to test ratios."
  },
  "aria-required-attr": {
    criterion: "4.1.2 Name, Role, Value",
    level: "A",
    description: "ARIA roles must have all required attributes",
    remediation: "Add missing required ARIA attributes for the role. Check ARIA specification for role requirements."
  },
  "image-alt": {
    criterion: "1.1.1 Non-text Content",
    level: "A",
    description: "Images must have alternative text",
    remediation: "Add meaningful alt text describing image content. Use alt='' for decorative images."
  },
  "label": {
    criterion: "1.3.1 Info and Relationships, 4.1.2 Name, Role, Value",
    level: "A",
    description: "Form inputs must have associated labels",
    remediation: "Add <label> elements with for attribute matching input id, or use aria-label/aria-labelledby."
  },
  "button-name": {
    criterion: "4.1.2 Name, Role, Value",
    level: "A",
    description: "Buttons must have discernible text",
    remediation: "Add text content, aria-label, or aria-labelledby to buttons."
  },
  "link-name": {
    criterion: "4.1.2 Name, Role, Value, 2.4.4 Link Purpose",
    level: "A",
    description: "Links must have discernible text",
    remediation: "Add text content, aria-label, or aria-labelledby to links. Avoid 'click here' or 'read more' without context."
  },
  "html-has-lang": {
    criterion: "3.1.1 Language of Page",
    level: "A",
    description: "HTML element must have a lang attribute",
    remediation: "Add lang='en' (or appropriate language code) to <html> tag."
  }
};

class AccessibilityMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "accessibility-testing-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "scan_url_accessibility":
            return await this.scanUrlAccessibility(args as any);
          
          case "get_wcag_guidance":
            return await this.getWcagGuidance(args as any);
          
          case "check_element_accessibility":
            return await this.checkElementAccessibility(args as any);
          
          case "generate_accessibility_report":
            return await this.generateAccessibilityReport(args as any);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async scanUrlAccessibility(args: { 
    url: string; 
    wcagLevel?: string;
    outputFormat?: string;
    saveToFile?: boolean;
    headless?: boolean;
    recordVideo?: boolean;
    captureScreenshots?: boolean;
  }) {
    const { 
      url, 
      wcagLevel = "AA",
      outputFormat = "text",
      saveToFile = outputFormat !== "text",
      headless = true,
      recordVideo = false,
      captureScreenshots = false
    } = args;

    console.error(`[MCP] Scanning ${url} for WCAG ${wcagLevel} violations...`);
    console.error(`[MCP] Output format: ${outputFormat}, Save to file: ${saveToFile}`);
    console.error(`[MCP] Visual: headless=${headless}, video=${recordVideo}, screenshots=${captureScreenshots}`);

    // Prepare video recording if requested
    let videoDir: string | undefined;
    if (recordVideo) {
      videoDir = await ensureVideosDir();
    }

    const browser = await chromium.launch({ 
      headless,
      slowMo: headless ? 0 : 300  // Slow down visible browser for better viewing
    });
    
    const contextOptions: any = {};
    if (recordVideo) {
      contextOptions.recordVideo = {
        dir: videoDir,
        size: { width: 1280, height: 720 }
      };
    }
    
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    try {
      // Navigate to page
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Capture "before" screenshot if requested
      let screenshotPaths: string[] = [];
      if (captureScreenshots) {
        const screenshotsDir = await ensureScreenshotsDir();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const beforePath = path.join(screenshotsDir, `scan-${timestamp}-before.png`);
        await page.screenshot({ path: beforePath, fullPage: true });
        screenshotPaths.push(beforePath);
        console.error(`[MCP] 📸 Screenshot saved: ${beforePath}`);
      }
      
      // Run accessibility analysis
      const axeResults = await new AxeBuilder({ page })
        .withTags([`wcag2${wcagLevel.toLowerCase()}`, 'wcag21aa', 'best-practice'])
        .analyze();

      // Capture "after" screenshot if requested
      if (captureScreenshots) {
        const screenshotsDir = await ensureScreenshotsDir();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const afterPath = path.join(screenshotsDir, `scan-${timestamp}-after.png`);
        await page.screenshot({ path: afterPath, fullPage: true });
        screenshotPaths.push(afterPath);
        console.error(`[MCP] 📸 Screenshot saved: ${afterPath}`);
      }

      const violations = axeResults.violations;
      const passes = axeResults.passes;

      const summary = {
        url,
        wcagLevel,
        timestamp: new Date().toISOString(),
        violations: violations.length,
        passes: passes.length,
        critical: violations.filter((v: any) => v.impact === 'critical').length,
        serious: violations.filter((v: any) => v.impact === 'serious').length,
        moderate: violations.filter((v: any) => v.impact === 'moderate').length,
        minor: violations.filter((v: any) => v.impact === 'minor').length,
      };

      // Prepare ALL violations for export (not just first 10)
      const allViolations = violations.map((v: any) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        tags: v.tags,
        nodes: v.nodes.length,
        exampleHtml: v.nodes[0]?.html || 'N/A',
        selector: v.nodes[0]?.target?.join(', ') || 'N/A'
      }));

      // First 10 for text report
      const detailedViolations = allViolations.slice(0, 10);

      const report = `# Accessibility Scan Report

**URL:** ${url}
**WCAG Level:** ${wcagLevel}
**Scanned:** ${new Date().toISOString()}

## Summary
- ✅ **Passed Checks:** ${summary.passes}
- ❌ **Total Violations:** ${summary.violations}
  - 🔴 Critical: ${summary.critical}
  - 🟠 Serious: ${summary.serious}
  - 🟡 Moderate: ${summary.moderate}
  - 🔵 Minor: ${summary.minor}

## Top Issues (First 10)

${detailedViolations.map((v: any, i: number) => `
### ${i + 1}. ${v.help}

**Impact:** ${v.impact?.toUpperCase() || 'UNKNOWN'}
**Rule ID:** ${v.id}
**WCAG Tags:** ${v.tags.filter((t: string) => t.startsWith('wcag')).join(', ')}

**Description:** ${v.description}

**Affected Elements:** ${v.nodes} instance(s)
**Example:** \`${v.selector}\`

\`\`\`html
${v.exampleHtml}
\`\`\`

**Documentation:** ${v.helpUrl}
`).join('\n---\n')}

${violations.length > 10 ? `\n*Note: Showing 10 of ${violations.length} total violations. Run full scan for complete report.*` : ''}

## Next Steps
1. Fix critical and serious issues first
2. Review moderate issues for user impact
3. Address minor issues for best practices
4. Re-scan after fixes to verify
`;

      // Handle video recording
      let videoPath: string | undefined;
      if (recordVideo) {
        const videoTempPath = await page.video()?.path();
        await page.close();
        await context.close();
        
        if (videoTempPath) {
          // Rename video with proper timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          videoPath = path.join(videoDir!, `scan-${timestamp}.webm`);
          await rename(videoTempPath, videoPath);
          console.error(`[MCP] 🎥 Video saved: ${videoPath}`);
        }
      }

      await browser.close();

      // Generate file exports if requested
      const exportData: ExportData = {
        summary,
        violations: allViolations
      };

      const generatedFiles: string[] = [];
      const visualFiles: { video?: string; screenshots: string[] } = { screenshots: [] };
      let responseText = report;

      // Track visual feedback files
      if (videoPath) {
        visualFiles.video = videoPath;
      }
      if (screenshotPaths.length > 0) {
        visualFiles.screenshots = screenshotPaths;
      }

      if (saveToFile) {
        try {
          if (outputFormat === 'excel' || outputFormat === 'all') {
            const excelPath = await generateExcelReport(exportData);
            generatedFiles.push(excelPath);
            console.error(`[MCP] ✅ Excel report saved: ${excelPath}`);
          }

          if (outputFormat === 'json' || outputFormat === 'all') {
            const jsonPath = await generateJsonReport(exportData);
            generatedFiles.push(jsonPath);
            console.error(`[MCP] ✅ JSON report saved: ${jsonPath}`);
          }

          if (outputFormat === 'markdown' || outputFormat === 'all') {
            const mdPath = await generateMarkdownReport(exportData, report);
            generatedFiles.push(mdPath);
            console.error(`[MCP] ✅ Markdown report saved: ${mdPath}`);
          }

          // Add file paths to response
          if (generatedFiles.length > 0) {
            responseText += `\n\n---\n\n## 📁 Generated Report Files\n\n`;
            generatedFiles.forEach((filepath, idx) => {
              const filename = filepath.split('/').pop();
              responseText += `${idx + 1}. **${filename}**\n   Path: \`${filepath}\`\n\n`;
            });
            responseText += `\nAll reports saved to: \`${generatedFiles[0].split('/').slice(0, -1).join('/')}/\`\n`;
          }
        } catch (exportError) {
          console.error('[MCP] ⚠️  Error generating file exports:', exportError);
          responseText += `\n\n⚠️ **Warning:** Failed to generate some file exports. Text report is still available above.\n`;
        }
      }

      // Add visual feedback files to response with download URLs
      if (visualFiles.video || visualFiles.screenshots.length > 0) {
        responseText += `\n\n---\n\n## 🎬 Visual Feedback Files\n\n`;
        
        if (visualFiles.video) {
          const filename = visualFiles.video.split('/').pop()!;
          const downloadUrl = fileServer.getDownloadUrl('videos', filename);
          responseText += `**📹 Video Recording:**\n`;
          responseText += `- **${filename}**\n`;
          responseText += `  📥 **Download:** ${downloadUrl}\n`;
          responseText += `  📁 Path: \`${visualFiles.video}\`\n`;
          responseText += `  ⏱️  Duration: ~${Math.ceil((Date.now() - new Date(summary.timestamp).getTime()) / 1000)}s\n\n`;
        }
        
        if (visualFiles.screenshots.length > 0) {
          responseText += `**📸 Screenshots:**\n`;
          visualFiles.screenshots.forEach((screenshot, idx) => {
            const filename = screenshot.split('/').pop()!;
            const downloadUrl = fileServer.getDownloadUrl('screenshots', filename);
            responseText += `${idx + 1}. **${filename}**\n`;
            responseText += `   📥 Download: ${downloadUrl}\n`;
            responseText += `   📁 Path: \`${screenshot}\`\n\n`;
          });
        }

        const baseDir = visualFiles.video 
          ? visualFiles.video.split('/').slice(0, -2).join('/') 
          : visualFiles.screenshots[0].split('/').slice(0, -2).join('/');
        responseText += `All visual files saved to: \`${baseDir}/\`\n`;
        responseText += `\n💡 **Tip:** Click the download links above or open them in your browser!\n`;
      }

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    } catch (error) {
      try {
        await page?.close();
        await context?.close();
        await browser?.close();
      } catch (closeError) {
        console.error('[MCP] Error closing browser:', closeError);
      }
      throw error;
    }
  }

  private async getWcagGuidance(args: { ruleId: string }) {
    const { ruleId } = args;
    const guidance = WCAG_GUIDANCE[ruleId];

    if (!guidance) {
      // Return generic guidance for unknown rules
      return {
        content: [
          {
            type: "text",
            text: `WCAG guidance for "${ruleId}" not found in database. 

Common WCAG rules:
- color-contrast (1.4.3)
- aria-required-attr (4.1.2)
- image-alt (1.1.1)
- label (1.3.1, 4.1.2)
- button-name (4.1.2)
- link-name (2.4.4, 4.1.2)
- html-has-lang (3.1.1)

For detailed guidance, visit: https://www.w3.org/WAI/WCAG21/quickref/`,
          },
        ],
      };
    }

    const report = `# WCAG Guidance: ${ruleId}

**Success Criterion:** ${guidance.criterion}
**Conformance Level:** ${guidance.level}

## Description
${guidance.description}

${guidance.requirements ? `## Requirements\n${guidance.requirements}\n` : ''}

## Remediation
${guidance.remediation}

## Resources
- [WCAG Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/master/doc/rule-descriptions.md)
`;

    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
    };
  }

  private async checkElementAccessibility(args: { url: string; selector: string }) {
    const { url, selector } = args;

    console.error(`[MCP] Checking element "${selector}" on ${url}...`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Check if element exists
      const elementExists = await page.$(selector);
      if (!elementExists) {
        await browser.close();
        return {
          content: [
            {
              type: "text",
              text: `❌ Element not found: "${selector}"\n\nThe selector did not match any elements on the page. Please verify the CSS selector is correct.`,
            },
          ],
        };
      }

      // Run axe on specific element
      const axeResults = await new AxeBuilder({ page })
        .include(selector)
        .analyze();

      const violations = axeResults.violations;

      const report = `# Element Accessibility Check

**URL:** ${url}
**Selector:** \`${selector}\`
**Scanned:** ${new Date().toISOString()}

## Results
${violations.length === 0 ? '✅ **No violations found!** This element passes automated accessibility checks.' : `❌ **Found ${violations.length} violation(s)**`}

${violations.length > 0 ? violations.map((v: any, i: number) => `
### ${i + 1}. ${v.help}

**Impact:** ${v.impact?.toUpperCase() || 'UNKNOWN'}
**Rule ID:** ${v.id}

**Description:** ${v.description}

**Fix:** Check the rule documentation at ${v.helpUrl}
`).join('\n---\n') : ''}

${violations.length > 0 ? `\n## Recommendation\nAddress these issues to ensure this element is accessible to all users.` : ''}
`;

      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: report,
          },
        ],
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  private async generateAccessibilityReport(args: { scanResults: string }) {
    const { scanResults } = args;

    try {
      const results = JSON.parse(scanResults);
      
      const report = `# Accessibility Report Summary

## Executive Summary
This report provides an analysis of accessibility compliance based on automated testing.

**Total Violations:** ${results.violations || 0}
**Conformance Level:** WCAG ${results.wcagLevel || 'AA'}

## Priority Breakdown
${results.critical ? `- 🔴 **Critical:** ${results.critical} (Fix immediately)` : ''}
${results.serious ? `- 🟠 **Serious:** ${results.serious} (Fix soon)` : ''}
${results.moderate ? `- 🟡 **Moderate:** ${results.moderate} (Plan to fix)` : ''}
${results.minor ? `- 🔵 **Minor:** ${results.minor} (Good to fix)` : ''}

## Recommendations
1. **Immediate Action:** Address all critical and serious violations
2. **Short Term:** Fix moderate impact issues affecting common user paths
3. **Long Term:** Resolve minor issues and implement accessibility testing in CI/CD
4. **Ongoing:** Regular audits and manual testing with assistive technologies

## Compliance Status
${results.violations === 0 ? '✅ **PASSED** - No automated violations detected' : `⚠️ **NEEDS WORK** - ${results.violations} violation(s) found`}

*Note: Automated testing covers ~30-40% of WCAG criteria. Manual testing is required for full compliance.*
`;

      return {
        content: [
          {
            type: "text",
            text: report,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Invalid scan results JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async run() {
    // Start file server for downloads
    await fileServer.start();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Accessibility Testing MCP Server running on stdio");
  }
}

// Start server
const server = new AccessibilityMCPServer();
server.run().catch(console.error);
