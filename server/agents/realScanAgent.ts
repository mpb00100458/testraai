import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { storage } from "../storage";
import type { InsertPage, InsertA11yResult } from "@shared/schema";
import { wsManager } from "../websocket";
import * as fs from 'fs';
import * as path from 'path';

const CHROMIUM_PATH = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
const MAX_PAGES_PER_ESTATE = 50; // Crawl budget per PRD requirements
const PAGE_TIMEOUT = 30000; // 30s timeout for complex pages (increased from 10s)
const REPORTS_DIR = '/tmp/accessibility-reports';

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
      browser = await chromium.launch({
        executablePath: CHROMIUM_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      // Crawl and audit pages (now with WebSocket progress)
      const crawledPages = await this.crawlWebsite(estate.baseUrl, browser, estateId);
      
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

      // Complete the scan run
      await storage.completeScanRun(scanRun.id);

      // Mark as completed
      await storage.updateEstateStatus(estateId, 'completed');

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
    } catch (error) {
      console.error('Real scan error:', error);
      
      // Emit scan error event
      wsManager.emitScanError(estateId, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Mark scan run as failed
      try {
        const latestScan = await storage.getLatestScanRun(estateId);
        if (latestScan && latestScan.status === 'running') {
          await storage.updateScanRunStatus(latestScan.id, 'failed');
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

  private async crawlWebsite(baseUrl: string, browser: Browser, estateId: string): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];
    const visitedUrls = new Set<string>();
    const urlsToVisit = [baseUrl];
    let totalDiscovered = 1;

    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const videoPath = path.join(REPORTS_DIR, `${estateId}_${timestamp}_video`);
    const tracePath = path.join(REPORTS_DIR, `${estateId}_${timestamp}_trace.zip`);

    // Create browser context with video recording
    const context = await browser.newContext({
      recordVideo: {
        dir: videoPath,
        size: { width: 1280, height: 720 }
      }
    });

    // Start Playwright tracing
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true
    });

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
          const page = await context.newPage();
        
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
            url: currentUrl,
            issuesFound: violations.reduce((sum, v) => sum + v.nodes.length, 0),
            pageNumber: results.length,
            totalPages: totalDiscovered,
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
        } finally {
          await page.close();
        }
      } catch (error) {
        console.error(`Error crawling ${currentUrl}:`, error);
        // Continue with next URL
      }
    }

    return results;
    } finally {
      // Stop tracing and save trace file
      await context.tracing.stop({ path: tracePath });
      console.log(`Playwright trace saved: ${tracePath}`);
      
      // Close context (this will finalize video recording)
      await context.close();
      
      // Wait for video to be saved
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find the video file (Playwright saves it with a unique name)
      const videoFiles = fs.readdirSync(videoPath);
      if (videoFiles.length > 0) {
        const videoFile = path.join(videoPath, videoFiles[0]);
        console.log(`Video recording saved: ${videoFile}`);
      }
    }
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
