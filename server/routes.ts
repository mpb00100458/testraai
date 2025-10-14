import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { insertOrganizationSchema, insertProjectSchema, insertEstateSchema } from "@shared/schema";
import PDFDocument from "pdfkit";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Organization routes
  app.get('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizations = await storage.getOrganizationsByUserId(userId);
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.post('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertOrganizationSchema.parse(req.body);
      const organization = await storage.createOrganization(validatedData, userId);
      res.json(organization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  // Membership routes
  app.get('/api/organizations/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgs = await storage.getOrganizationsByUserId(userId);
      
      if (orgs.length === 0) {
        return res.json([]);
      }

      // Get memberships for the first org (for MVP)
      const memberships = await storage.getMembershipsByOrgId(orgs[0].id);
      
      // Enrich with user data
      const enrichedMemberships = await Promise.all(
        memberships.map(async (membership) => {
          const user = await storage.getUser(membership.userId);
          return { ...membership, user };
        })
      );
      
      res.json(enrichedMemberships);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgs = await storage.getOrganizationsByUserId(userId);
      
      if (orgs.length === 0) {
        return res.json([]);
      }

      // Get projects for all user's orgs
      const allProjects = await Promise.all(
        orgs.map(org => storage.getProjectsByOrgId(org.id))
      );
      
      res.json(allProjects.flat());
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate organizationId is provided
      if (!req.body.organizationId) {
        return res.status(400).json({ message: "organizationId is required" });
      }

      // Verify user has access to this organization
      const membership = await storage.getMembership(userId, req.body.organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Estate routes
  app.get('/api/estates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgs = await storage.getOrganizationsByUserId(userId);
      
      if (orgs.length === 0) {
        return res.json([]);
      }

      const allProjects = await Promise.all(
        orgs.map(org => storage.getProjectsByOrgId(org.id))
      );
      
      const projects = allProjects.flat();
      
      const allEstates = await Promise.all(
        projects.map(project => storage.getEstatesByProjectId(project.id))
      );
      
      res.json(allEstates.flat());
    } catch (error) {
      console.error("Error fetching estates:", error);
      res.status(500).json({ message: "Failed to fetch estates" });
    }
  });

  app.post('/api/estates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertEstateSchema.parse(req.body);
      
      // Verify user has access to the project
      const project = await storage.getProject(validatedData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied to this project" });
      }
      
      const estate = await storage.createEstate(validatedData);
      res.json(estate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating estate:", error);
      res.status(500).json({ message: "Failed to create estate" });
    }
  });

  // Get single estate
  app.get('/api/estates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const estate = await storage.getEstate(id);
      
      if (!estate) {
        return res.status(404).json({ message: "Estate not found" });
      }

      // Verify user has access to the estate's project
      const project = await storage.getProject(estate.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied to this estate" });
      }

      res.json(estate);
    } catch (error) {
      console.error("Error fetching estate:", error);
      res.status(500).json({ message: "Failed to fetch estate" });
    }
  });

  // Download estate PDF report
  app.get('/api/estates/:id/report/pdf', isAuthenticated, async (req: any, res) => {
    let doc: any = null;
    
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const estate = await storage.getEstate(id);
      
      if (!estate) {
        return res.status(404).json({ message: "Estate not found" });
      }

      // Verify user has access to the estate's project
      const project = await storage.getProject(estate.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied to this estate" });
      }

      // Get all issues for this estate
      const issues = await storage.getA11yResultsByEstateId(id);
      const rollup = await storage.getA11yRollupByEstateId(id);
      
      // Create PDF document
      doc = new PDFDocument({ margin: 50 });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="accessibility-report-${estate.name.replace(/[^a-z0-9]/gi, '-')}.pdf"`);
      
      // Pipe PDF to response
      doc.pipe(res);

      // Title
      doc.fontSize(24).fillColor('#1976D2').text('Accessibility Audit Report', { align: 'center' });
      doc.moveDown(0.5);
      
      // Estate info
      doc.fontSize(14).fillColor('#333333').text(estate.name, { align: 'center' });
      doc.fontSize(10).fillColor('#666666').text(estate.baseUrl, { align: 'center' });
      doc.moveDown(1);

      // Summary Section
      doc.fontSize(16).fillColor('#1976D2').text('Summary', { underline: true });
      doc.moveDown(0.5);
      
      const totalIssues = rollup?.totalIssues || 0;
      const criticalIssues = rollup?.criticalIssues || 0;
      const warningIssues = rollup?.warningIssues || 0;
      const minorIssues = rollup?.minorIssues || 0;
      const passRate = rollup?.passRate || 0;
      
      doc.fontSize(12).fillColor('#333333');
      doc.text(`Total Issues: ${totalIssues}`);
      doc.text(`Pass Rate: ${passRate}%`);
      doc.text(`Pages Audited: ${estate.pagesAudited}`);
      doc.moveDown(0.5);
      
      // Severity breakdown
      doc.fontSize(12).fillColor('#d32f2f').text(`● Critical: ${criticalIssues}`, { continued: true });
      doc.fillColor('#f57c00').text(`  ● Warning: ${warningIssues}`, { continued: true });
      doc.fillColor('#fbc02d').text(`  ● Minor: ${minorIssues}`);
      doc.moveDown(2);

      // Issues by Page
      doc.fontSize(16).fillColor('#1976D2').text('Issues by Page', { underline: true });
      doc.moveDown(0.5);

      // Group issues by page
      const issuesByPage = new Map<string, any[]>();
      for (const issue of issues) {
        if (issue.severity === 'pass') continue;
        if (!issuesByPage.has(issue.pageId)) {
          issuesByPage.set(issue.pageId, []);
        }
        issuesByPage.get(issue.pageId)!.push(issue);
      }

      // Render each page's issues
      for (const [pageId, pageIssues] of Array.from(issuesByPage.entries())) {
        const page = await storage.getPage(pageId);
        if (!page) continue;

        // Page header
        doc.fontSize(14).fillColor('#333333').text(page.title || 'Untitled Page', { underline: false });
        doc.fontSize(10).fillColor('#666666').text(page.url);
        doc.moveDown(0.5);

        // Issues for this page
        for (const issue of pageIssues) {
          // Severity color
          const severityColor = 
            issue.severity === 'critical' ? '#d32f2f' :
            issue.severity === 'warning' ? '#f57c00' : '#fbc02d';
          
          doc.fontSize(11).fillColor(severityColor).text(`● ${issue.severity.toUpperCase()}`, { continued: true });
          doc.fillColor('#333333').text(` - ${issue.issueType.replace(/-/g, ' ')}`);
          
          if (issue.wcagCriteria) {
            doc.fontSize(9).fillColor('#666666').text(`   WCAG ${issue.wcagCriteria}`);
          }
          
          if (issue.description) {
            doc.fontSize(9).fillColor('#555555').text(`   ${issue.description}`);
          }
          
          if (issue.element) {
            doc.fontSize(8).fillColor('#888888').text(`   Element: ${issue.element}`);
          }
          
          if (issue.suggestion) {
            doc.fontSize(9).fillColor('#1976D2').text(`   Suggestion: ${issue.suggestion}`);
          }
          
          if (issue.codeSnippet) {
            doc.fontSize(8).font('Courier').fillColor('#2e7d32').text(`   Code Fix:`);
            doc.fontSize(8).fillColor('#555555').text(`   ${issue.codeSnippet}`);
            doc.font('Helvetica');
          }
          
          if (issue.impactScore) {
            doc.fontSize(8).fillColor('#666666').text(`   Impact Score: ${issue.impactScore}/10`);
          }
          
          doc.moveDown(0.3);
        }
        
        doc.moveDown(0.5);
      }

      // Footer - Add page numbers (only if there are multiple pages)
      const pageCount = doc.bufferedPageRange().count;
      if (pageCount > 0) {
        for (let i = 0; i < pageCount; i++) {
          try {
            doc.switchToPage(i);
            doc.fontSize(8).fillColor('#999999').text(
              `Page ${i + 1} of ${pageCount}`,
              50,
              doc.page.height - 50,
              { align: 'center' }
            );
          } catch (e) {
            // Ignore page switching errors
          }
        }
      }

      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error("Error generating PDF report:", error);
      
      // End the PDF stream if it was started
      if (doc) {
        try {
          doc.end();
        } catch (e) {
          // Ignore errors when ending the doc
        }
      }
      
      // Only send error response if headers haven't been sent
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF report" });
      }
    }
  });

  // Download estate CSV report
  app.get('/api/estates/:id/report', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const estate = await storage.getEstate(id);
      
      if (!estate) {
        return res.status(404).json({ message: "Estate not found" });
      }

      // Verify user has access to the estate's project
      const project = await storage.getProject(estate.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied to this estate" });
      }

      // Get all issues for this estate
      const issues = await storage.getA11yResultsByEstateId(id);
      
      // Helper function to escape CSV fields
      const escapeCsvField = (field: string | null | undefined): string => {
        const value = field || '';
        // Wrap in quotes and escape any existing quotes by doubling them
        return `"${value.replace(/"/g, '""')}"`;
      };
      
      // Generate CSV with proper escaping
      const csvRows = [
        ['Estate', 'Page URL', 'Page Title', 'Issue Type', 'Severity', 'WCAG Criteria', 'Element', 'Description', 'Suggestion'].join(',')
      ];

      for (const issue of issues) {
        if (issue.severity === 'pass') continue; // Skip pass results in report
        
        const page = await storage.getPage(issue.pageId);
        if (!page) continue;

        const row = [
          escapeCsvField(estate.name),
          escapeCsvField(page.url),
          escapeCsvField(page.title),
          escapeCsvField(issue.issueType),
          escapeCsvField(issue.severity),
          escapeCsvField(issue.wcagCriteria),
          escapeCsvField(issue.element),
          escapeCsvField(issue.description),
          escapeCsvField(issue.suggestion)
        ].join(',');
        
        csvRows.push(row);
      }

      const csv = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="estate-${estate.name.replace(/[^a-z0-9]/gi, '-')}-report.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Scan trigger route
  app.post('/api/estates/:id/scan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const estate = await storage.getEstate(id);
      
      if (!estate) {
        return res.status(404).json({ message: "Estate not found" });
      }

      // Verify user has access to the estate's project
      const project = await storage.getProject(estate.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied to this estate" });
      }

      // Import enhanced scan agent with AI capabilities
      const { enhancedScanAgent } = await import('./agents/enhancedScanAgent');
      
      // Run AI-powered scan asynchronously
      enhancedScanAgent.runScan(id).catch(error => {
        console.error('AI scan failed:', error);
      });
      
      res.json({ message: "Scan started", estateId: id });
    } catch (error) {
      console.error("Error starting scan:", error);
      res.status(500).json({ message: "Failed to start scan" });
    }
  });

  // Issues routes
  app.get('/api/issues', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgs = await storage.getOrganizationsByUserId(userId);
      
      if (orgs.length === 0) {
        return res.json([]);
      }

      // Get all estates for user's orgs
      const allProjects = await Promise.all(
        orgs.map(org => storage.getProjectsByOrgId(org.id))
      );
      
      const projects = allProjects.flat();
      
      const allEstates = await Promise.all(
        projects.map(project => storage.getEstatesByProjectId(project.id))
      );
      
      const estates = allEstates.flat();
      
      // Get all issues for all estates
      const allIssues = await Promise.all(
        estates.map(estate => storage.getA11yResultsByEstateId(estate.id))
      );
      
      res.json(allIssues.flat());
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  // Dashboard stats route
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgs = await storage.getOrganizationsByUserId(userId);
      
      if (orgs.length === 0) {
        return res.json({
          totalScans: 0,
          totalIssues: 0,
          pagesScanned: 0,
          passRate: 0,
          averageScore: 0,
          severityBreakdown: {
            critical: 0,
            warning: 0,
            minor: 0,
            pass: 0,
          },
        });
      }

      // Get all estates
      const allProjects = await Promise.all(
        orgs.map(org => storage.getProjectsByOrgId(org.id))
      );
      
      const projects = allProjects.flat();
      
      const allEstates = await Promise.all(
        projects.map(project => storage.getEstatesByProjectId(project.id))
      );
      
      const estates = allEstates.flat();
      
      // Calculate stats
      const totalScans = estates.length;
      const pagesScanned = estates.reduce((sum, e) => sum + e.pagesAudited, 0);
      
      // Get all issues
      const allIssues = await Promise.all(
        estates.map(estate => storage.getA11yResultsByEstateId(estate.id))
      );
      
      const issues = allIssues.flat();
      
      const severityBreakdown = {
        critical: issues.filter(i => i.severity === 'critical').length,
        warning: issues.filter(i => i.severity === 'warning').length,
        minor: issues.filter(i => i.severity === 'minor').length,
        pass: issues.filter(i => i.severity === 'pass').length,
      };
      
      const totalIssues = severityBreakdown.critical + severityBreakdown.warning + severityBreakdown.minor;
      
      // Calculate pass rate (percentage of pass results)
      const totalResults = issues.length;
      const passRate = totalResults > 0 ? Math.round((severityBreakdown.pass / totalResults) * 100) : 0;
      
      // Get average accessibility score (weighted Lighthouse-style score from rollups)
      const allRollups = await Promise.all(
        estates.map(estate => storage.getA11yRollupByEstateId(estate.id))
      );
      const rollups = allRollups.filter(r => r !== null);
      const averageScore = rollups.length > 0 
        ? Math.round(rollups.reduce((sum, r) => sum + (r?.averageScore || 0), 0) / rollups.length)
        : 0;
      
      res.json({
        totalScans,
        totalIssues,
        pagesScanned,
        passRate,
        averageScore, // Weighted Lighthouse-style accessibility score
        severityBreakdown,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Historical trend data route
  app.get('/api/dashboard/history/:estateId?', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { estateId } = req.params;
      const orgs = await storage.getOrganizationsByUserId(userId);
      
      if (orgs.length === 0) {
        return res.json([]);
      }

      // Get all user's estates for authorization
      const allProjects = await Promise.all(
        orgs.map(org => storage.getProjectsByOrgId(org.id))
      );
      
      const projects = allProjects.flat();
      
      const allEstates = await Promise.all(
        projects.map(project => storage.getEstatesByProjectId(project.id))
      );
      
      const estates = allEstates.flat();
      const userEstateIds = estates.map(e => e.id);

      let historyData = [];

      if (estateId) {
        // Verify the requested estate belongs to the user's organizations
        if (!userEstateIds.includes(estateId)) {
          return res.status(403).json({ message: "Unauthorized access to this estate" });
        }
        
        // Get history for the authorized estate
        historyData = await storage.getA11yHistoryByEstateId(estateId, 30);
      } else {
        // Get history for all user's estates
        const allHistory = await Promise.all(
          estates.map(estate => storage.getA11yHistoryByEstateId(estate.id, 30))
        );
        
        historyData = allHistory.flat();
      }
      
      res.json(historyData);
    } catch (error) {
      console.error("Error fetching historical data:", error);
      res.status(500).json({ message: "Failed to fetch historical data" });
    }
  });

  // Report export routes
  app.get('/api/reports/csv', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgs = await storage.getOrganizationsByUserId(userId);
      
      if (orgs.length === 0) {
        return res.status(400).json({ message: "No data available" });
      }

      // Get all issues
      const allProjects = await Promise.all(
        orgs.map(org => storage.getProjectsByOrgId(org.id))
      );
      
      const projects = allProjects.flat();
      
      const allEstates = await Promise.all(
        projects.map(project => storage.getEstatesByProjectId(project.id))
      );
      
      const estates = allEstates.flat();
      
      const allIssues = await Promise.all(
        estates.map(estate => storage.getA11yResultsByEstateId(estate.id))
      );
      
      const issues = allIssues.flat();
      
      // Generate CSV
      const csv = [
        ['Severity', 'Issue Type', 'WCAG Criteria', 'Description', 'Element', 'Suggestion', 'Impact Score'].join(','),
        ...issues.map(issue => [
          issue.severity,
          `"${issue.issueType}"`,
          issue.wcagCriteria || 'N/A',
          `"${(issue.description || '').replace(/"/g, '""')}"`,
          `"${(issue.element || '').replace(/"/g, '""')}"`,
          `"${(issue.suggestion || '').replace(/"/g, '""')}"`,
          issue.impactScore || 'N/A',
        ].join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=accessibility-report.csv');
      res.send(csv);
    } catch (error) {
      console.error("Error generating CSV:", error);
      res.status(500).json({ message: "Failed to generate CSV report" });
    }
  });

  app.get('/api/reports/excel', isAuthenticated, async (req: any, res) => {
    try {
      const ExcelJS = require('exceljs');
      const userId = req.user.claims.sub;
      const orgs = await storage.getOrganizationsByUserId(userId);
      
      if (orgs.length === 0) {
        return res.status(400).json({ message: "No data available" });
      }

      // Get all issues with estate context
      const allProjects = await Promise.all(
        orgs.map(org => storage.getProjectsByOrgId(org.id))
      );
      
      const projects = allProjects.flat();
      
      const allEstates = await Promise.all(
        projects.map(project => storage.getEstatesByProjectId(project.id))
      );
      
      const estates = allEstates.flat();
      
      const allPages = await Promise.all(
        estates.map(estate => storage.getPagesByEstateId(estate.id))
      );
      
      const pages = allPages.flat();
      
      const allIssues = await Promise.all(
        estates.map(estate => storage.getA11yResultsByEstateId(estate.id))
      );
      
      const issues = allIssues.flat();

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      
      // Summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Estate', key: 'estate', width: 40 },
        { header: 'Total Issues', key: 'totalIssues', width: 15 },
        { header: 'Critical', key: 'critical', width: 15 },
        { header: 'Warning', key: 'warning', width: 15 },
        { header: 'Minor', key: 'minor', width: 15 },
        { header: 'Pages Scanned', key: 'pages', width: 15 },
      ];

      estates.forEach(estate => {
        const estateIssues = issues.filter(i => {
          const page = pages.find(p => p.id === i.pageId);
          return page?.estateId === estate.id;
        });
        
        summarySheet.addRow({
          estate: estate.baseUrl,
          totalIssues: estateIssues.length,
          critical: estateIssues.filter(i => i.severity === 'critical').length,
          warning: estateIssues.filter(i => i.severity === 'warning').length,
          minor: estateIssues.filter(i => i.severity === 'minor').length,
          pages: pages.filter(p => p.estateId === estate.id).length,
        });
      });

      // Style summary header
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4A5568' },
      };
      summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Issues detail sheet
      const detailSheet = workbook.addWorksheet('All Issues');
      detailSheet.columns = [
        { header: 'Estate URL', key: 'estateUrl', width: 40 },
        { header: 'Page URL', key: 'pageUrl', width: 40 },
        { header: 'Severity', key: 'severity', width: 12 },
        { header: 'Issue Type', key: 'issueType', width: 30 },
        { header: 'WCAG Criteria', key: 'wcagCriteria', width: 15 },
        { header: 'Impact Score', key: 'impactScore', width: 12 },
        { header: 'Element', key: 'element', width: 30 },
        { header: 'Description', key: 'description', width: 50 },
        { header: 'Suggestion', key: 'suggestion', width: 50 },
        { header: 'Code Snippet', key: 'codeSnippet', width: 40 },
      ];

      issues.forEach(issue => {
        const page = pages.find(p => p.id === issue.pageId);
        const estate = estates.find(e => e.id === page?.estateId);
        
        const row = detailSheet.addRow({
          estateUrl: estate?.baseUrl || 'N/A',
          pageUrl: page?.url || 'N/A',
          severity: issue.severity,
          issueType: issue.issueType,
          wcagCriteria: issue.wcagCriteria || 'N/A',
          impactScore: issue.impactScore || 'N/A',
          element: issue.element || 'N/A',
          description: issue.description || 'N/A',
          suggestion: issue.suggestion || 'N/A',
          codeSnippet: issue.codeSnippet || 'N/A',
        });

        // Color code severity
        const severityColors: Record<string, string> = {
          critical: 'FFEF4444',
          warning: 'FFF59E0B',
          minor: 'FF3B82F6',
          pass: 'FF10B981',
        };
        
        if (severityColors[issue.severity]) {
          row.getCell('severity').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: severityColors[issue.severity] },
          };
          row.getCell('severity').font = { color: { argb: 'FFFFFFFF' } };
        }
      });

      // Style detail header
      detailSheet.getRow(1).font = { bold: true };
      detailSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4A5568' },
      };
      detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=accessibility-report.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error("Error generating Excel:", error);
      res.status(500).json({ message: "Failed to generate Excel report" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
