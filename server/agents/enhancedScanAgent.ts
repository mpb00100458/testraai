import { storage } from "../storage";
import { aiAnalyzer } from "./aiAnalyzer";
import type { InsertPage, InsertA11yResult } from "@shared/schema";

/**
 * Enhanced scan agent with AI-powered analysis
 * Features:
 * - AI-generated issue descriptions and fix recommendations
 * - Smart deduplication across pages
 * - Code snippet generation
 * - Impact scoring
 */
export class EnhancedScanAgent {
  async runScan(estateId: string): Promise<void> {
    try {
      // Update estate status to crawling
      await storage.updateEstateStatus(estateId, 'crawling');
      
      const estate = await storage.getEstate(estateId);
      if (!estate) throw new Error('Estate not found');

      console.log(`Starting AI-powered scan for ${estate.baseUrl}`);

      // Simulate page discovery (in production, this would use real crawling)
      const mockPages = [
        { url: `${estate.baseUrl}`, title: 'Home Page' },
        { url: `${estate.baseUrl}/about`, title: 'About Us' },
        { url: `${estate.baseUrl}/contact`, title: 'Contact' },
        { url: `${estate.baseUrl}/products`, title: 'Products' },
        { url: `${estate.baseUrl}/services`, title: 'Services' },
      ];

      const createdPages = [];
      for (const mockPage of mockPages) {
        const page = await storage.createPage({
          estateId: estate.id,
          url: mockPage.url,
          title: mockPage.title,
        });
        createdPages.push(page);
      }

      // Update estate with discovered pages
      await storage.updateEstateStats(estateId, createdPages.length, 0);
      await storage.updateEstateStatus(estateId, 'auditing');

      // Enhanced accessibility auditing with AI
      const issuePatterns = [
        { type: 'color-contrast', wcag: '1.4.3', baseElement: 'button' },
        { type: 'missing-alt-text', wcag: '1.1.1', baseElement: 'img' },
        { type: 'keyboard-navigation', wcag: '2.1.1', baseElement: 'nav' },
        { type: 'aria-labels', wcag: '4.1.2', baseElement: 'div[role="button"]' },
        { type: 'heading-order', wcag: '1.3.1', baseElement: 'h2' },
        { type: 'link-purpose', wcag: '2.4.4', baseElement: 'a' },
        { type: 'form-labels', wcag: '3.3.2', baseElement: 'input' },
        { type: 'focus-visible', wcag: '2.4.7', baseElement: 'button.submit' },
      ];

      let totalIssues = 0;
      let criticalCount = 0;
      let warningCount = 0;
      let minorCount = 0;
      let passCount = 0;
      const allIssues: Array<{
        id: string;
        issueType: string;
        element: string;
        description: string;
        pageUrl: string;
      }> = [];

      for (const page of createdPages) {
        // Random issues per page (2-4)
        const numIssues = Math.floor(Math.random() * 3) + 2;
        
        for (let i = 0; i < numIssues; i++) {
          const pattern = issuePatterns[Math.floor(Math.random() * issuePatterns.length)];
          const element = `<${pattern.baseElement}>`;
          
          // Use AI to analyze the issue
          console.log(`AI analyzing: ${pattern.type} on ${page.url}`);
          const aiAnalysis = await aiAnalyzer.analyzeIssue(
            pattern.type,
            element,
            page.url,
            pattern.wcag
          );

          // Check for duplicates using AI
          const deduplication = await aiAnalyzer.checkDuplicate(
            {
              issueType: pattern.type,
              element,
              description: aiAnalysis.description,
              pageUrl: page.url,
            },
            allIssues
          );

          const result = await storage.createA11yResult({
            pageId: page.id,
            issueType: pattern.type,
            severity: aiAnalysis.severity,
            wcagCriteria: aiAnalysis.wcagReference,
            element,
            description: aiAnalysis.description,
            suggestion: aiAnalysis.suggestion,
            codeSnippet: aiAnalysis.codeSnippet,
            impactScore: aiAnalysis.impactScore,
            isDuplicate: deduplication.isDuplicate ? 1 : 0,
            duplicateOfId: deduplication.similarIssueId,
          });

          // Track all issues for deduplication
          if (!deduplication.isDuplicate) {
            allIssues.push({
              id: result.id,
              issueType: pattern.type,
              element,
              description: aiAnalysis.description,
              pageUrl: page.url,
            });
          }
          
          totalIssues++;
          if (aiAnalysis.severity === 'critical') criticalCount++;
          if (aiAnalysis.severity === 'warning') warningCount++;
          if (aiAnalysis.severity === 'minor') minorCount++;
        }

        // Add some pass results
        const passResults = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < passResults; i++) {
          await storage.createA11yResult({
            pageId: page.id,
            issueType: 'accessibility-check',
            severity: 'pass',
            wcagCriteria: '1.1.1',
            description: 'Accessibility check passed',
          });
          passCount++;
        }

        await storage.updatePageAuditStatus(page.id, 1);
      }

      // Update estate stats
      await storage.updateEstateStats(estateId, createdPages.length, createdPages.length);

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

      console.log(`Scan completed: ${totalIssues} issues found (${allIssues.length} unique)`);

      // Mark as completed
      await storage.updateEstateStatus(estateId, 'completed');
    } catch (error) {
      console.error('Enhanced scan error:', error);
      await storage.updateEstateStatus(estateId, 'failed');
      throw error;
    }
  }
}

export const enhancedScanAgent = new EnhancedScanAgent();
