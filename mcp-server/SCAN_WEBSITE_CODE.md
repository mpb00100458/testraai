# scan_website_accessibility - Multi-Page Website Scanning

## Overview

This tool scans multiple pages of a website for accessibility issues, crawls links, records video, and generates comprehensive reports.

## Function Signature

```typescript
async scan_website_accessibility(args: {
  url: string;              // Starting URL
  maxPages?: number;        // Max pages to scan (default: 10)
  wcagLevel?: string;       // "A", "AA", or "AAA" (default: "AA")
  outputFormat?: string;    // "text", "excel", "json", "markdown", "all"
  recordVideo?: boolean;    // Record entire scan session (default: true)
  captureScreenshots?: boolean; // Screenshot each page (default: true)
})
```

## Complete Implementation Code

```typescript
private async scanWebsiteAccessibility(args: {
  url: string;
  maxPages?: number;
  wcagLevel?: string;
  outputFormat?: string;
  recordVideo?: boolean;
  captureScreenshots?: boolean;
}) {
  const {
    url,
    maxPages = 10,
    wcagLevel = "AA",
    outputFormat = "text",
    recordVideo = true,
    captureScreenshots = true
  } = args;

  console.error(`[MCP] 🌐 Scanning website: ${url} (max ${maxPages} pages)`);
  console.error(`[MCP] WCAG Level: ${wcagLevel}, Video: ${recordVideo}, Screenshots: ${captureScreenshots}`);

  // Prepare directories
  let videoDir: string | undefined;
  let screenshotsDir: string | undefined;
  
  if (recordVideo) {
    videoDir = await ensureVideosDir();
  }
  if (captureScreenshots) {
    screenshotsDir = await ensureScreenshotsDir();
  }

  // Launch browser with video recording
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  
  const contextOptions: any = {
    viewport: { width: 1280, height: 720 }
  };
  
  if (recordVideo) {
    contextOptions.recordVideo = {
      dir: videoDir,
      size: { width: 1280, height: 720 }
    };
  }
  
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  // Data structures for crawling
  const visitedUrls = new Set<string>();
  const toVisit: string[] = [url];
  const allResults: any[] = [];
  const baseUrl = new URL(url);
  
  try {
    // Crawl and scan pages
    while (toVisit.length > 0 && visitedUrls.size < maxPages) {
      const currentUrl = toVisit.shift()!;
      
      // Skip if already visited
      if (visitedUrls.has(currentUrl)) {
        continue;
      }
      
      visitedUrls.add(currentUrl);
      console.error(`[MCP] 📄 Scanning page ${visitedUrls.size}/${maxPages}: ${currentUrl}`);
      
      try {
        // Navigate to page
        await page.goto(currentUrl, { 
          waitUntil: 'networkidle', 
          timeout: 30000 
        });
        
        // Capture screenshot
        if (captureScreenshots && screenshotsDir) {
          const timestamp = Date.now();
          const pageNum = visitedUrls.size;
          const screenshotPath = path.join(
            screenshotsDir, 
            `page-${pageNum}-${timestamp}.png`
          );
          await page.screenshot({ 
            path: screenshotPath, 
            fullPage: true 
          });
          console.error(`[MCP] 📸 Screenshot: ${screenshotPath}`);
        }
        
        // Run accessibility scan
        const axeResults = await new AxeBuilder({ page })
          .withTags([`wcag2${wcagLevel.toLowerCase()}`, 'wcag21aa'])
          .analyze();
        
        // Store results
        allResults.push({
          url: currentUrl,
          pageNumber: visitedUrls.size,
          violations: axeResults.violations.length,
          passes: axeResults.passes.length,
          incomplete: axeResults.incomplete.length,
          violationDetails: axeResults.violations.map((v: any) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            help: v.help,
            helpUrl: v.helpUrl,
            tags: v.tags,
            nodes: v.nodes.length,
            exampleHtml: v.nodes[0]?.html || 'N/A',
            selector: v.nodes[0]?.target?.join(', ') || 'N/A'
          }))
        });
        
        // Extract links for crawling (only from same domain)
        if (visitedUrls.size < maxPages) {
          const links = await page.$$eval('a[href]', (anchors) =>
            anchors.map((a) => (a as HTMLAnchorElement).href)
          );
          
          for (const link of links) {
            try {
              const linkUrl = new URL(link);
              // Only crawl same domain, skip anchors, skip already visited
              if (
                linkUrl.origin === baseUrl.origin &&
                !linkUrl.hash &&
                !visitedUrls.has(link) &&
                !toVisit.includes(link)
              ) {
                toVisit.push(link);
              }
            } catch (e) {
              // Skip invalid URLs
            }
          }
        }
        
      } catch (pageError) {
        console.error(`[MCP] ⚠️  Error scanning ${currentUrl}:`, pageError);
        // Continue with next page
      }
    }
    
    // Handle video
    let videoPath: string | undefined;
    if (recordVideo) {
      const videoTempPath = await page.video()?.path();
      await page.close();
      await context.close();
      
      if (videoTempPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        videoPath = path.join(videoDir!, `website-scan-${timestamp}.webm`);
        await rename(videoTempPath, videoPath);
        console.error(`[MCP] 🎥 Video saved: ${videoPath}`);
      }
    }
    
    await browser.close();
    
    // Aggregate statistics
    const totalViolations = allResults.reduce((sum, r) => sum + r.violations, 0);
    const totalPasses = allResults.reduce((sum, r) => sum + r.passes, 0);
    
    // Count by severity across all pages
    const allViolations = allResults.flatMap(r => r.violationDetails);
    const criticalCount = allViolations.filter(v => v.impact === 'critical').length;
    const seriousCount = allViolations.filter(v => v.impact === 'serious').length;
    const moderateCount = allViolations.filter(v => v.impact === 'moderate').length;
    const minorCount = allViolations.filter(v => v.impact === 'minor').length;
    
    // Find most common violations
    const violationCounts = new Map<string, number>();
    allViolations.forEach(v => {
      violationCounts.set(v.id, (violationCounts.get(v.id) || 0) + 1);
    });
    
    const topViolations = Array.from(violationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => {
        const example = allViolations.find(v => v.id === id)!;
        return { id, count, help: example.help, impact: example.impact };
      });
    
    // Generate report
    const summary = {
      startUrl: url,
      pagesScanned: visitedUrls.size,
      maxPages,
      wcagLevel,
      timestamp: new Date().toISOString(),
      totalViolations,
      totalPasses,
      critical: criticalCount,
      serious: seriousCount,
      moderate: moderateCount,
      minor: minorCount
    };
    
    const report = `# Website Accessibility Scan Report

**Starting URL:** ${url}
**Pages Scanned:** ${summary.pagesScanned} / ${summary.maxPages}
**WCAG Level:** ${wcagLevel}
**Scanned:** ${new Date().toISOString()}

## Overall Summary
- ✅ **Total Passed Checks:** ${totalPasses}
- ❌ **Total Violations:** ${totalViolations}
  - 🔴 Critical: ${criticalCount}
  - 🟠 Serious: ${seriousCount}
  - 🟡 Moderate: ${moderateCount}
  - 🔵 Minor: ${minorCount}

## Top 10 Most Common Issues

${topViolations.map((v, i) => `
${i + 1}. **${v.help}** (${v.count} occurrences)
   - Impact: ${v.impact?.toUpperCase() || 'UNKNOWN'}
   - Rule ID: ${v.id}
`).join('\n')}

## Page-by-Page Results

${allResults.map((result, i) => `
### Page ${result.pageNumber}: ${result.url}
- Violations: ${result.violations}
- Passes: ${result.passes}
- Status: ${result.violations === 0 ? '✅ PASSED' : `❌ ${result.violations} issue(s)`}
`).join('\n')}

## Recommendations
1. **Critical Priority:** Fix ${criticalCount} critical violations across all pages
2. **High Priority:** Address ${seriousCount} serious violations
3. **Medium Priority:** Resolve ${moderateCount} moderate issues
4. **Low Priority:** ${minorCount} minor issues for best practices

## Next Steps
1. Download full reports (Excel/JSON) for detailed analysis
2. Focus on common issues appearing across multiple pages
3. Fix violations on high-traffic pages first
4. Re-scan after fixes to verify improvements
`;

    // Export to files if requested
    const exportData: ExportData = {
      summary,
      violations: allViolations
    };
    
    const generatedFiles: string[] = [];
    let responseText = report;
    
    if (outputFormat === 'excel' || outputFormat === 'all') {
      const excelPath = await generateExcelReport(exportData);
      generatedFiles.push(excelPath);
      console.error(`[MCP] 📊 Excel report: ${excelPath}`);
    }
    
    if (outputFormat === 'json' || outputFormat === 'all') {
      const jsonPath = await generateJsonReport(exportData);
      generatedFiles.push(jsonPath);
      console.error(`[MCP] 📄 JSON report: ${jsonPath}`);
    }
    
    if (outputFormat === 'markdown' || outputFormat === 'all') {
      const markdownPath = await generateMarkdownReport(exportData);
      generatedFiles.push(markdownPath);
      console.error(`[MCP] 📝 Markdown report: ${markdownPath}`);
    }
    
    // Add download links
    if (generatedFiles.length > 0) {
      responseText += `\n\n## 📥 Generated Reports\n\n`;
      generatedFiles.forEach(filePath => {
        const filename = filePath.split('/').pop()!;
        const fileType = filename.endsWith('.xlsx') ? 'reports' :
                        filename.endsWith('.json') ? 'reports' : 'reports';
        const downloadUrl = fileServer.getDownloadUrl(fileType, filename);
        responseText += `- **${filename}**\n`;
        responseText += `  📥 Download: ${downloadUrl}\n`;
        responseText += `  📁 Path: \`${filePath}\`\n\n`;
      });
    }
    
    // Add video download link
    if (videoPath) {
      const filename = videoPath.split('/').pop()!;
      const downloadUrl = fileServer.getDownloadUrl('videos', filename);
      responseText += `\n## 🎥 Scan Video\n\n`;
      responseText += `Watch the entire scan session:\n`;
      responseText += `- **${filename}**\n`;
      responseText += `  📥 Download: ${downloadUrl}\n`;
      responseText += `  📁 Path: \`${videoPath}\`\n`;
      responseText += `  ⏱️  Duration: ~${summary.pagesScanned * 5} seconds\n\n`;
    }
    
    responseText += `\n💡 **Tip:** All files saved to \`~/mcp-accessibility-reports/\`\n`;
    responseText += `📥 Download server: http://localhost:3456\n`;
    
    return {
      content: [{
        type: "text",
        text: responseText
      }]
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
```

## Key Features Explained

### 1. **Web Crawling**
```typescript
// Extract links from current page
const links = await page.$$eval('a[href]', (anchors) =>
  anchors.map((a) => (a as HTMLAnchorElement).href)
);

// Filter to same domain only
if (linkUrl.origin === baseUrl.origin && !linkUrl.hash) {
  toVisit.push(link);
}
```

### 2. **Video Recording**
```typescript
// Single video for entire scan session
const contextOptions: any = {
  recordVideo: {
    dir: videoDir,
    size: { width: 1280, height: 720 }
  }
};
```

### 3. **Screenshot Each Page**
```typescript
const screenshotPath = path.join(
  screenshotsDir, 
  `page-${pageNum}-${timestamp}.png`
);
await page.screenshot({ 
  path: screenshotPath, 
  fullPage: true 
});
```

### 4. **Aggregate Statistics**
```typescript
// Count violations across all pages
const totalViolations = allResults.reduce(
  (sum, r) => sum + r.violations, 0
);

// Find most common issues
const violationCounts = new Map<string, number>();
allViolations.forEach(v => {
  violationCounts.set(v.id, (violationCounts.get(v.id) || 0) + 1);
});
```

## Usage Examples

### Example 1: Basic Multi-Page Scan
```typescript
{
  "url": "https://example.com",
  "maxPages": 5
}
```

### Example 2: Comprehensive Audit with Video
```typescript
{
  "url": "https://mysite.com",
  "maxPages": 20,
  "wcagLevel": "AA",
  "outputFormat": "all",
  "recordVideo": true,
  "captureScreenshots": true
}
```

### Example 3: Quick Scan without Visual Feedback
```typescript
{
  "url": "https://testsite.com",
  "maxPages": 10,
  "recordVideo": false,
  "captureScreenshots": false,
  "outputFormat": "json"
}
```

## From OpenAI Agent Builder

**Agent Prompt:**
```
"Scan the first 10 pages of https://mycompany.com for WCAG AA violations and record a video"
```

**Agent Will Call:**
```json
{
  "tool": "scan_website_accessibility",
  "arguments": {
    "url": "https://mycompany.com",
    "maxPages": 10,
    "wcagLevel": "AA",
    "recordVideo": true
  }
}
```

## Output Files

After scan completes:

```
~/mcp-accessibility-reports/
├── videos/
│   └── website-scan-2025-01-19T14-30-00.webm  (1-5MB)
├── screenshots/
│   ├── page-1-1234567890.png
│   ├── page-2-1234567891.png
│   └── page-3-1234567892.png
└── reports/
    ├── accessibility-scan-2025-01-19T14-30-00.xlsx
    ├── accessibility-scan-2025-01-19T14-30-00.json
    └── accessibility-scan-2025-01-19T14-30-00.md
```

## Performance Notes

- **Time:** ~5-10 seconds per page
- **10 pages:** ~1-2 minutes
- **Video size:** ~1-5MB for 10 pages
- **Screenshots:** ~200KB per page
- **Memory:** ~500MB-1GB during scan

## Limitations

1. **Same domain only** - Won't follow external links
2. **No authentication** - Can't scan pages behind login (yet)
3. **JavaScript required** - Uses Playwright (full browser)
4. **Robots.txt** - Should respect but doesn't check
5. **Rate limiting** - No delay between pages (add if needed)

## Error Handling

```typescript
try {
  await page.goto(currentUrl, { timeout: 30000 });
  // ... scan logic ...
} catch (pageError) {
  console.error(`Error scanning ${currentUrl}:`, pageError);
  // Continue with next page instead of failing entire scan
}
```

Continues even if individual pages fail!

---

**This is the complete, production-ready implementation of `scan_website_accessibility`!**
