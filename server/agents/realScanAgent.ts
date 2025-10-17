import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { storage } from "../storage";
import type { InsertPage, InsertA11yResult } from "@shared/schema";
import { wsManager } from "../websocket";
import { ObjectStorageService } from "../objectStorage";
import * as fs from 'fs';
import * as path from 'path';

const CHROMIUM_PATH = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
const MAX_PAGES_PER_ESTATE = 50; // Crawl budget per PRD requirements
const PAGE_TIMEOUT = 30000; // 30s timeout for complex pages (increased from 10s)
// Use home directory for persistent file storage (survives restarts)
const REPORTS_DIR = path.join(process.env.HOME || '/home/runner', 'accessibility-reports');

// Check if we're in production/deployment (Chromium path doesn't exist)
function getBrowserConfig() {
  const isProduction = !fs.existsSync(CHROMIUM_PATH);
  
  if (isProduction) {
    // Production: Use Playwright's bundled browser
    return {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
  } else {
    // Development: Use Nix-installed Chromium
    return {
      executablePath: CHROMIUM_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
  }
}

interface AxeViolation {
  id: string;
  impact?: string;
  description: string;
  help: string;
  helpUrl?: string;
  tags: string[];
  nodes: Array<{
    html: string;
    impact?: string;
    target: string[];
    failureSummary?: string;
  }>;
}

interface CrawlResult {
  url: string;
  title: string;
  violations: AxeViolation[];
  passes: Array<{ id: string; description: string; tags: string[] }>;
  incomplete: Array<{ id: string; description: string }>;
  screenshot?: string;
  timestamp: string;
}

interface ScanReport {
  estateId: string;
  scanRunId: string;
  baseUrl: string;
  timestamp: string;
  summary: {
    totalPages: number;
    totalViolations: number;
    criticalCount: number;
    warningCount: number;
    minorCount: number;
    passCount: number;
    passRate: number;
  };
  pages: CrawlResult[];
}

export class RealScanAgent {
  async runScan(estateId: string): Promise<void> {
    // Use local browser variable to support concurrent scans
    let browser: Browser | null = null;
    
    try {
      // Create a new scan run
      const scanRun = await storage.createScanRun({
        estateId,
        status: 'running',
        pagesAudited: 0,
      });

      // Update estate status
      await storage.updateEstateStatus(estateId, 'crawling');
      
      const estate = await storage.getEstate(estateId);
      if (!estate) throw new Error('Estate not found');

      // Emit scan start event
      wsManager.emitScanStart(estateId, {
        scanRunId: scanRun.id,
        baseUrl: estate.baseUrl,
        timestamp: new Date().toISOString(),
      });

      // Launch browser (local to this scan run)
      const browserConfig = getBrowserConfig();
      browser = await chromium.launch(browserConfig);

      // Crawl and audit pages (now with WebSocket progress, video & traces)
      const { pages: crawledPages, videoPath, tracePath } = await this.crawlWebsite(estate.baseUrl, browser, estateId, scanRun.id);
      
      await storage.updateEstateStatus(estateId, 'auditing');

      // Store pages and results
      let totalIssues = 0;
      let criticalCount = 0;
      let warningCount = 0;
      let minorCount = 0;
      let passCount = 0;

      for (const crawlResult of crawledPages) {
        // Create page record
        const page = await storage.createPage({
          estateId: estate.id,
          url: crawlResult.url,
          title: crawlResult.title,
        });

        // Process violations
        for (const violation of crawlResult.violations) {
          const severity = this.mapImpactToSeverity(violation.impact);
          
          // Create accessibility result for each node
          for (const node of violation.nodes) {
            await storage.createA11yResult({
              pageId: page.id,
              scanRunId: scanRun.id,
              issueType: violation.id,
              severity,
              wcagCriteria: violation.tags
                .filter((tag: string) => tag.startsWith('wcag'))
                .map((tag: string) => {
                  const clean = tag.replace('wcag', '');
                  // Format criterion numbers (3+ digits) as X.Y.Z (e.g., 244 → 2.4.4)
                  return clean.replace(/^(\d)(\d)(\d+)$/, '$1.$2.$3');
                })
                .join(', ') || 'N/A',
              element: node.html,
              description: violation.description,
              suggestion: violation.help,
            });

            totalIssues++;
            if (severity === 'critical') criticalCount++;
            if (severity === 'warning') warningCount++;
            if (severity === 'minor') minorCount++;
          }
        }

        // Count passes from axe-core pass results
        passCount += crawlResult.passes.length;
        for (const pass of crawlResult.passes) {
          await storage.createA11yResult({
            pageId: page.id,
            scanRunId: scanRun.id,
            issueType: pass.id,
            severity: 'pass',
            wcagCriteria: pass.tags
              .filter((tag: string) => tag.startsWith('wcag'))
              .map((tag: string) => {
                const clean = tag.replace('wcag', '');
                // Format criterion numbers (3+ digits) as X.Y.Z (e.g., 244 → 2.4.4)
                return clean.replace(/^(\d)(\d)(\d+)$/, '$1.$2.$3');
              })
              .join(', ') || 'N/A',
            description: pass.description,
          });
        }

        await storage.updatePageAuditStatus(page.id, 1);
      }

      // Update estate stats
      await storage.updateEstateStats(estateId, crawledPages.length, crawledPages.length);

      // Create rollup
      const total = totalIssues + passCount;
      const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;
      const avgScore = passRate;

      await storage.upsertA11yRollup({
        estateId: estate.id,
        totalIssues,
        criticalIssues: criticalCount,
        warningIssues: warningCount,
        minorIssues: minorCount,
        passRate,
        averageScore: avgScore,
      });

      // Update scan run with final stats
      await storage.updateScanRunStats(scanRun.id, {
        totalIssues,
        criticalIssues: criticalCount,
        warningIssues: warningCount,
        minorIssues: minorCount,
        passRate,
        averageScore: avgScore,
        pagesAudited: crawledPages.length,
      });

      // Update scan run with video and trace paths
      const { db } = await import('../db');
      const { scanRuns } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      await db.update(scanRuns)
        .set({ 
          videoPath: videoPath || null, 
          tracePath: tracePath || null 
        })
        .where(eq(scanRuns.id, scanRun.id));

      // Complete the scan run
      await storage.completeScanRun(scanRun.id);

      // Reset estate status back to idle (ready for next scan)
      await storage.updateEstateStatus(estateId, 'idle');

      // Generate comprehensive report (PRD requirement)
      const report: ScanReport = {
        estateId: estate.id,
        scanRunId: scanRun.id,
        baseUrl: estate.baseUrl,
        timestamp: new Date().toISOString(),
        summary: {
          totalPages: crawledPages.length,
          totalViolations: totalIssues,
          criticalCount,
          warningCount,
          minorCount,
          passCount,
          passRate,
        },
        pages: crawledPages,
      };

      // Export reports (PRD requirement: JSON/HTML export)
      await this.exportReports(report);

      // Emit scan complete event
      wsManager.emitScanComplete(estateId, {
        scanRunId: scanRun.id,
        totalPages: crawledPages.length,
        totalIssues,
        criticalIssues: criticalCount,
        warningIssues: warningCount,
        minorIssues: minorCount,
        passRate,
        averageScore: avgScore,
        timestamp: new Date().toISOString(),
      });

      // Add completion message to chat conversation if this scan was triggered by AI Agent
      try {
        const { db } = await import('../db');
        const { chatMessages } = await import('@shared/schema');
        const { eq, and, sql: drizzleSql } = await import('drizzle-orm');
        
        // Find chat messages with this estate ID in metadata
        const messagesWithEstate = await db.select()
          .from(chatMessages)
          .where(drizzleSql`${chatMessages.metadata}->>'estateId' = ${estateId}`)
          .limit(1);
        
        if (messagesWithEstate.length > 0) {
          const conversationId = messagesWithEstate[0].conversationId;
          
          // Add completion message
          const completionMessage = `✅ **Scan Complete!**\n\nFinished scanning ${estate.baseUrl}:\n- **${crawledPages.length}** pages audited\n- **${totalIssues}** issues found (${criticalCount} critical, ${warningCount} warnings, ${minorCount} minor)\n- **Pass rate:** ${passRate}%`;
          
          await storage.createChatMessage({
            conversationId,
            role: 'assistant',
            content: completionMessage,
            messageType: 'scan_result',
            metadata: {
              estateId: estate.id,
              scanRunId: scanRun.id,
            }
          });
          
          console.log(`[AI Agent] Added scan completion message to conversation ${conversationId}`);
        }
      } catch (msgError) {
        console.error('[AI Agent] Error adding completion message:', msgError);
        // Don't fail the scan if message addition fails
      }
    } catch (error) {
      console.error('Real scan error:', error);
      
      // Mark scan run as failed and emit error
      try {
        const latestScan = await storage.getLatestScanRun(estateId);
        if (latestScan) {
          wsManager.emitScanError(estateId, {
            scanRunId: latestScan.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          
          if (latestScan.status === 'running') {
            await storage.updateScanRunStatus(latestScan.id, 'failed');
          }
        }
      } catch (e) {
        console.error('Error updating scan run status:', e);
      }
      
      try {
        await storage.updateEstateStatus(estateId, 'failed');
      } catch (e) {
        console.error('Error updating estate status:', e);
      }
      
      // Don't throw - error already handled, scan marked as failed
      // Throwing here can crash the entire server process
    } finally {
      // Always close browser (local to this scan run)
      if (browser) {
        await browser.close();
      }
    }
  }

  private async crawlWebsite(baseUrl: string, browser: Browser, estateId: string, scanRunId: string): Promise<{ pages: CrawlResult[], videoPath: string, tracePath: string }> {
    const results: CrawlResult[] = [];
    const visitedUrls = new Set<string>();
    const urlsToVisit = [baseUrl];
    let totalDiscovered = 1;
    let finalVideoPath = '';

    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const videoDir = path.join(REPORTS_DIR, `${scanRunId}_video`);
    const tracePath = path.join(REPORTS_DIR, `${scanRunId}_trace.zip`);

    // Check if we're in production (Playwright's ffmpeg might not be installed)
    const isProduction = !fs.existsSync(CHROMIUM_PATH);
    
    // Create browser context with conditional video recording
    // In production, video recording is disabled to avoid ffmpeg dependency issues
    const contextOptions: any = {};
    if (!isProduction) {
      contextOptions.recordVideo = {
        dir: videoDir,
        size: { width: 1280, height: 720 }
      };
    }
    
    const context = await browser.newContext(contextOptions);

    // Start Playwright tracing
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true
    });

    // Create a single page for the entire scan (reuse for all URLs to get one continuous video)
    const page = await context.newPage();

    try {
      while (urlsToVisit.length > 0 && results.length < MAX_PAGES_PER_ESTATE) {
        const currentUrl = urlsToVisit.shift()!;
        
        if (visitedUrls.has(currentUrl)) continue;
        visitedUrls.add(currentUrl);

        // Emit page discovered event
        wsManager.emitPageDiscovered(estateId, {
          url: currentUrl,
          totalPages: totalDiscovered,
        });

        try {
        
        try {
          // Emit page testing event
          wsManager.emitPageTesting(estateId, {
            url: currentUrl,
            pageNumber: results.length + 1,
            totalPages: totalDiscovered,
          });

          // Navigate to page with fallback wait strategies (PRD: dynamic content)
          try {
            await page.goto(currentUrl, { 
              timeout: PAGE_TIMEOUT,
              waitUntil: 'networkidle' 
            });
          } catch (timeoutError) {
            // Fallback: try with domcontentloaded if networkidle times out
            console.log(`NetworkIdle timeout for ${currentUrl}, trying domcontentloaded...`);
            await page.goto(currentUrl, { 
              timeout: PAGE_TIMEOUT,
              waitUntil: 'domcontentloaded' 
            });
          }

          // Wait for dynamic content to load (PRD requirement)
          await page.waitForTimeout(1000);

          // Run comprehensive accessibility checks with axe-core (PRD: WCAG 2.1 A/AA)
          const axeResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .options({
              runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
              },
              resultTypes: ['violations', 'passes', 'incomplete'],
            })
            .analyze();
          
          const violations = axeResults.violations.map(v => ({
            ...v,
            impact: v.impact || 'moderate',
          }));

          const passes = axeResults.passes.map(p => ({
            id: p.id,
            description: p.description,
            tags: p.tags,
          }));

          const incomplete = axeResults.incomplete.map(i => ({
            id: i.id,
            description: i.description,
          }));

          // Get page title
          const title = await page.title();

          // Capture screenshot for live view
          const screenshot = await page.screenshot({ 
            type: 'jpeg', 
            quality: 60,
            fullPage: false 
          });
          const screenshotBase64 = screenshot.toString('base64');

          // Store comprehensive result (PRD: detailed reporting)
          results.push({
            url: currentUrl,
            title: title || currentUrl,
            violations: violations as AxeViolation[],
            passes,
            incomplete,
            timestamp: new Date().toISOString(),
          });

          // Emit issues found for this page
          for (const violation of violations) {
            wsManager.emitIssueFound(estateId, {
              url: currentUrl,
              issue: {
                type: violation.id,
                severity: this.mapImpactToSeverity(violation.impact),
                description: violation.description,
                nodesCount: violation.nodes.length,
              },
            });
          }

          // Emit page complete event with screenshot
          wsManager.emitPageComplete(estateId, {
            scanRunId,
            url: currentUrl,
            issuesFound: violations.reduce((sum, v) => sum + v.nodes.length, 0),
            pageNumber: results.length,
            totalPages: totalDiscovered,
            totalIssues: results.reduce((sum, r) => sum + r.violations.reduce((s, v) => s + v.nodes.length, 0), 0) + violations.reduce((sum, v) => sum + v.nodes.length, 0),
            screenshot: screenshotBase64,
          });

          // Find links on the page (simple crawler)
          const links = await page.$$eval('a[href]', (anchors: Element[], base: string) => {
            return anchors
              .map((a: Element) => {
                try {
                  const href = a.getAttribute('href');
                  if (!href) return null;
                  
                  // Resolve relative URLs
                  const url = new URL(href, base);
                  return url.href;
                } catch {
                  return null;
                }
              })
              .filter(Boolean) as string[];
          }, baseUrl);

          // Add internal links to crawl queue and update discovered count
          for (const link of links) {
            try {
              const linkUrl = new URL(link);
              const baseUrlObj = new URL(baseUrl);
              
              // Only crawl same domain
              if (linkUrl.hostname === baseUrlObj.hostname && !visitedUrls.has(link) && !urlsToVisit.includes(link)) {
                urlsToVisit.push(link);
                totalDiscovered++;
              }
            } catch {
              // Invalid URL, skip
            }
          }
        } catch (innerError) {
          console.error(`Error processing ${currentUrl}:`, innerError);
          // Continue with next URL
        }
      } catch (error) {
        console.error(`Error crawling ${currentUrl}:`, error);
        // Continue with next URL
      }
    }

    } finally {
      // Close the page we've been reusing
      await page.close();
      
      // Stop tracing and save trace file
      await context.tracing.stop({ path: tracePath });
      console.log(`Playwright trace saved: ${tracePath}`);
      
      // Close context (this will finalize video recording)
      await context.close();
      
      // Only process video if recording was enabled (development mode)
      if (!isProduction && fs.existsSync(videoDir)) {
        // Wait for video to be saved
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Find the LARGEST video file (the full scan recording, not individual page videos)
        const videoFiles = fs.readdirSync(videoDir);
        if (videoFiles.length > 0) {
          // Sort by file size descending to get the largest video
          const videoFilesWithSize = videoFiles.map(file => {
            const filePath = path.join(videoDir, file);
            const stats = fs.statSync(filePath);
            return { file, size: stats.size, path: filePath };
          }).sort((a, b) => b.size - a.size);
          
          finalVideoPath = videoFilesWithSize[0].path;
          console.log(`Video recording saved: ${finalVideoPath} (${(videoFilesWithSize[0].size / 1024 / 1024).toFixed(2)}MB)`);
        }
      } else if (isProduction) {
        console.log('Video recording disabled in production (ffmpeg not available)');
      }
    }

    // Upload video and trace to object storage
    const objectStorageService = new ObjectStorageService();
    let videoObjectPath = '';
    let traceObjectPath = '';

    try {
      if (finalVideoPath && fs.existsSync(finalVideoPath)) {
        videoObjectPath = await objectStorageService.uploadFile(
          finalVideoPath,
          `scans/${scanRunId}/video.webm`
        );
        console.log(`Video uploaded to object storage: ${videoObjectPath}`);
        
        // Clean up local video files
        fs.rmSync(videoDir, { recursive: true, force: true });
      }

      if (tracePath && fs.existsSync(tracePath)) {
        traceObjectPath = await objectStorageService.uploadFile(
          tracePath,
          `scans/${scanRunId}/trace.zip`
        );
        console.log(`Trace uploaded to object storage: ${traceObjectPath}`);
        
        // Clean up local trace file
        fs.unlinkSync(tracePath);
      }
    } catch (uploadError) {
      console.error('Error uploading to object storage:', uploadError);
      // If upload fails, keep the local paths
      videoObjectPath = finalVideoPath;
      traceObjectPath = tracePath;
    }

    return { pages: results, videoPath: videoObjectPath, tracePath: traceObjectPath };
  }

  private mapImpactToSeverity(impact?: string): 'critical' | 'warning' | 'minor' | 'pass' {
    switch (impact) {
      case 'critical':
      case 'serious':
        return 'critical';
      case 'moderate':
        return 'warning';
      case 'minor':
        return 'minor';
      default:
        return 'warning';
    }
  }

  private async exportReports(report: ScanReport): Promise<void> {
    try {
      // Ensure reports directory exists
      if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseFilename = `${report.estateId}_${timestamp}`;

      // Export JSON (PRD requirement)
      const jsonPath = path.join(REPORTS_DIR, `${baseFilename}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
      console.log(`JSON report exported: ${jsonPath}`);

      // Export HTML (PRD requirement)
      const htmlPath = path.join(REPORTS_DIR, `${baseFilename}.html`);
      const htmlContent = this.generateHTMLReport(report);
      fs.writeFileSync(htmlPath, htmlContent);
      console.log(`HTML report exported: ${htmlPath}`);
    } catch (error) {
      console.error('Error exporting reports:', error);
    }
  }

  private generateHTMLReport(report: ScanReport): string {
    const { summary, pages, baseUrl, timestamp } = report;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Test Report - ${baseUrl}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #1a1a1a; margin-bottom: 10px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 30px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
    .stat { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
    .stat-label { color: #666; font-size: 12px; text-transform: uppercase; }
    .critical { color: #dc3545; }
    .warning { color: #ffc107; }
    .minor { color: #17a2b8; }
    .pass { color: #28a745; }
    .page { margin-bottom: 30px; border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; }
    .page-header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #dee2e6; }
    .page-title { font-size: 18px; font-weight: 600; margin-bottom: 5px; }
    .page-url { color: #0066cc; font-size: 14px; word-break: break-all; }
    .violation { padding: 15px; border-bottom: 1px solid #f0f0f0; }
    .violation:last-child { border-bottom: none; }
    .violation-header { display: flex; align-items: start; gap: 10px; margin-bottom: 10px; }
    .severity-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .severity-critical { background: #dc3545; color: white; }
    .severity-warning { background: #ffc107; color: #000; }
    .severity-minor { background: #17a2b8; color: white; }
    .violation-title { flex: 1; font-weight: 600; }
    .violation-description { color: #666; margin-bottom: 10px; font-size: 14px; }
    .violation-help { background: #e7f3ff; padding: 10px; border-radius: 4px; font-size: 13px; }
    .violation-element { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-top: 10px; overflow-x: auto; }
    .wcag-criteria { display: inline-block; background: #e9ecef; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Accessibility Test Report</h1>
    <div class="meta">
      <div>Base URL: ${baseUrl}</div>
      <div>Scan Date: ${new Date(timestamp).toLocaleString()}</div>
      <div>WCAG 2.1 Level A/AA Compliance Check</div>
    </div>

    <div class="summary">
      <div class="stat">
        <div class="stat-value">${summary.totalPages}</div>
        <div class="stat-label">Pages Tested</div>
      </div>
      <div class="stat">
        <div class="stat-value critical">${summary.criticalCount}</div>
        <div class="stat-label">Critical Issues</div>
      </div>
      <div class="stat">
        <div class="stat-value warning">${summary.warningCount}</div>
        <div class="stat-label">Warnings</div>
      </div>
      <div class="stat">
        <div class="stat-value minor">${summary.minorCount}</div>
        <div class="stat-label">Minor Issues</div>
      </div>
      <div class="stat">
        <div class="stat-value pass">${summary.passCount}</div>
        <div class="stat-label">Passed Checks</div>
      </div>
      <div class="stat">
        <div class="stat-value">${summary.passRate}%</div>
        <div class="stat-label">Pass Rate</div>
      </div>
    </div>

    ${pages.map(page => `
      <div class="page">
        <div class="page-header">
          <div class="page-title">${page.title}</div>
          <div class="page-url">${page.url}</div>
          <div style="margin-top: 10px; color: #666; font-size: 13px;">
            ${page.violations.length} violations, ${page.passes.length} passed checks
          </div>
        </div>
        ${page.violations.length > 0 ? `
          ${page.violations.map(violation => `
            <div class="violation">
              <div class="violation-header">
                <span class="severity-badge severity-${this.mapImpactToSeverity(violation.impact)}">${this.mapImpactToSeverity(violation.impact)}</span>
                <div class="violation-title">${violation.id}: ${violation.description}</div>
              </div>
              <div class="violation-description">${violation.help}</div>
              ${violation.helpUrl ? `<div><a href="${violation.helpUrl}" target="_blank" style="color: #0066cc; font-size: 13px;">Learn more →</a></div>` : ''}
              <div class="wcag-criteria">
                WCAG: ${violation.tags.filter((t: string) => t.startsWith('wcag')).map((t: string) => t.replace('wcag', '').replace(/(\d)(\d+)/g, '$1.$2')).join(', ')}
              </div>
              ${violation.nodes.map((node: any) => `
                <div class="violation-element">
                  Target: ${node.target.join(' > ')}<br>
                  ${node.html}
                </div>
              `).join('')}
            </div>
          `).join('')}
        ` : '<div style="padding: 20px; text-align: center; color: #28a745;">No accessibility violations found on this page!</div>'}
      </div>
    `).join('')}
  </div>
</body>
</html>`;
  }
}

export const realScanAgent = new RealScanAgent();
