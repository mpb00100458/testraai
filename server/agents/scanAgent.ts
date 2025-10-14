import { storage } from "../storage";
import type { InsertPage, InsertA11yResult } from "@shared/schema";

// Simplified scan agent for MVP - simulates crawling and auditing
export class ScanAgent {
  async runScan(estateId: string): Promise<void> {
    try {
      // Update estate status to crawling
      await storage.updateEstateStatus(estateId, 'crawling');
      
      const estate = await storage.getEstate(estateId);
      if (!estate) throw new Error('Estate not found');

      // Simulate page discovery
      const mockPages = [
        { url: `${estate.baseUrl}/`, title: 'Home Page' },
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

      // Simulate accessibility auditing
      const mockIssues = [
        { type: 'color-contrast', severity: 'critical' as const, wcag: '1.4.3' },
        { type: 'missing-alt-text', severity: 'critical' as const, wcag: '1.1.1' },
        { type: 'keyboard-navigation', severity: 'warning' as const, wcag: '2.1.1' },
        { type: 'aria-labels', severity: 'warning' as const, wcag: '4.1.2' },
        { type: 'heading-order', severity: 'minor' as const, wcag: '1.3.1' },
        { type: 'link-purpose', severity: 'minor' as const, wcag: '2.4.4' },
        { type: 'form-labels', severity: 'warning' as const, wcag: '3.3.2' },
        { type: 'focus-visible', severity: 'critical' as const, wcag: '2.4.7' },
      ];

      let totalIssues = 0;
      let criticalCount = 0;
      let warningCount = 0;
      let minorCount = 0;
      let passCount = 0;

      for (const page of createdPages) {
        // Random issues per page
        const numIssues = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numIssues; i++) {
          const issue = mockIssues[Math.floor(Math.random() * mockIssues.length)];
          
          await storage.createA11yResult({
            pageId: page.id,
            issueType: issue.type,
            severity: issue.severity,
            wcagCriteria: issue.wcag,
            element: `<${['button', 'img', 'a', 'input', 'div'][Math.floor(Math.random() * 5)]}>`,
            description: `${issue.type.replace(/-/g, ' ')} issue detected on this page`,
            suggestion: `Fix ${issue.type.replace(/-/g, ' ')} to meet WCAG ${issue.wcag} criteria`,
          });
          
          totalIssues++;
          if (issue.severity === 'critical') criticalCount++;
          if (issue.severity === 'warning') warningCount++;
          if (issue.severity === 'minor') minorCount++;
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

      // Mark as completed
      await storage.updateEstateStatus(estateId, 'completed');
    } catch (error) {
      console.error('Scan error:', error);
      await storage.updateEstateStatus(estateId, 'failed');
      throw error;
    }
  }
}

export const scanAgent = new ScanAgent();
