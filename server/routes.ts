import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { requireAdmin, requireSuperAdmin, requireBillingAdmin, requireSupportAdmin } from "./adminMiddleware";
import { z } from "zod";
import { insertOrganizationSchema, insertProjectSchema, insertEstateSchema, insertMcpServerSchema, insertSubscriptionSchema, insertInvoiceSchema, insertPaymentSchema } from "@shared/schema";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import type { A11yResult } from "@shared/schema";
import { wsManager } from "./websocket";
import mcpRoutes from "./mcpRoutes";

// Helper function to calculate issue type changes between two scans
function calculateIssueTypeChanges(issues1: A11yResult[], issues2: A11yResult[]) {
  const issueTypes1 = new Map<string, number>();
  const issueTypes2 = new Map<string, number>();

  // Count issues by type in scan 1
  issues1.forEach(issue => {
    if (issue.severity !== 'pass') {
      issueTypes1.set(issue.issueType, (issueTypes1.get(issue.issueType) || 0) + 1);
    }
  });

  // Count issues by type in scan 2
  issues2.forEach(issue => {
    if (issue.severity !== 'pass') {
      issueTypes2.set(issue.issueType, (issueTypes2.get(issue.issueType) || 0) + 1);
    }
  });

  // Calculate changes for each issue type
  const allTypes = new Set([...Array.from(issueTypes1.keys()), ...Array.from(issueTypes2.keys())]);
  const changes: Record<string, { before: number; after: number; change: number }> = {};

  allTypes.forEach(type => {
    const before = issueTypes1.get(type) || 0;
    const after = issueTypes2.get(type) || 0;
    changes[type] = {
      before,
      after,
      change: after - before,
    };
  });

  return changes;
}

// Helper function to map WCAG reference to applicable standards
function mapWcagReferenceToStandards(wcagReference: string | null): string {
  if (!wcagReference || wcagReference === 'N/A') {
    return 'N/A';
  }

  const standards: string[] = [];

  // Extract criterion numbers (e.g., "2a, 1.4.1" or "1.1.1, 2.4.4")
  const parts = wcagReference.split(',').map(c => c.trim());

  for (const part of parts) {
    // Skip non-numeric criteria like "2a", "21aa", etc.
    // Only process criteria in format X.Y.Z
    const match = part.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) continue;

    const criterion = part;

    // Determine which WCAG versions include this criterion
    // WCAG 2.0 includes criteria 1.x.x through 4.1.x
    // WCAG 2.1 adds new criteria (mostly 1.3.x, 1.4.x, 2.1.x, 2.5.x, 4.1.3)
    // WCAG 2.2 adds new criteria (2.4.11, 2.4.12, 2.4.13, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8, 3.3.9)

    // All criteria are in WCAG 2.0 unless they're 2.1 or 2.2 specific
    const wcag21NewCriteria = [
      '1.3.4', '1.3.5', '1.3.6', '1.4.10', '1.4.11', '1.4.12', '1.4.13',
      '2.1.4', '2.5.1', '2.5.2', '2.5.3', '2.5.4', '2.5.5', '2.5.6', '4.1.3'
    ];

    const wcag22NewCriteria = [
      '2.4.11', '2.4.12', '2.4.13', '2.5.7', '2.5.8', '3.2.6', '3.3.7', '3.3.8', '3.3.9'
    ];

    if (wcag22NewCriteria.includes(criterion)) {
      standards.push('WCAG 2.2');
    } else if (wcag21NewCriteria.includes(criterion)) {
      standards.push('WCAG 2.1', 'WCAG 2.2');
    } else {
      standards.push('WCAG 2.0', 'WCAG 2.1', 'WCAG 2.2');
    }
  }

  // Remove duplicates and return
  const uniqueStandards = [...new Set(standards)];
  return uniqueStandards.length > 0 ? uniqueStandards.join(', ') : 'N/A';
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount MCP routes for OpenAI Agent Builder integration
  app.use('/mcp', mcpRoutes);

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/user', (req: any, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Organization routes
  app.get('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const organizations = await storage.getOrganizationsByUserId(userId);
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.post('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  // Update organization
  app.patch('/api/organizations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Verify user has admin access
      const membership = await storage.getMembership(userId, id);
      if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedData = insertOrganizationSchema.partial().parse(req.body);
      const organization = await storage.updateOrganization(id, validatedData);
      res.json(organization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // Delete organization
  app.delete('/api/organizations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Verify user is owner
      const membership = await storage.getMembership(userId, id);
      if (!membership || membership.role !== 'OWNER') {
        return res.status(403).json({ message: "Only owners can delete organizations" });
      }
      
      await storage.deleteOrganization(id);
      res.json({ message: "Organization deleted successfully" });
    } catch (error) {
      console.error("Error deleting organization:", error);
      res.status(500).json({ message: "Failed to delete organization" });
    }
  });

  // Membership routes
  app.get('/api/organizations/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  // Get members for a specific organization
  app.get('/api/organizations/:orgId/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { orgId } = req.params;
      
      // Verify user has access to this organization
      const membership = await storage.getMembership(userId, orgId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get memberships for this org
      const memberships = await storage.getMembershipsByOrgId(orgId);
      
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

  // Add member to organization
  app.post('/api/organizations/:orgId/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { orgId } = req.params;
      const { email, role } = req.body;
      
      // Verify user has admin access
      const requesterMembership = await storage.getMembership(userId, orgId);
      if (!requesterMembership || (requesterMembership.role !== 'OWNER' && requesterMembership.role !== 'ADMIN')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Find user by email
      const targetUser = await storage.getUserByEmail(email);
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found with that email" });
      }
      
      // Check if already a member
      const existingMembership = await storage.getMembership(targetUser.id, orgId);
      if (existingMembership) {
        return res.status(400).json({ message: "User is already a member" });
      }
      
      const membership = await storage.createMembership({
        userId: targetUser.id,
        organizationId: orgId,
        role: role || 'VIEWER',
      });
      
      res.json(membership);
    } catch (error) {
      console.error("Error adding member:", error);
      res.status(500).json({ message: "Failed to add member" });
    }
  });

  // Update member role
  app.patch('/api/memberships/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { role } = req.body;
      
      // Get the membership to find orgId
      const targetMembership = await storage.getMembershipsByOrgId('');
      const membership = targetMembership.find(m => m.id === id);
      
      if (!membership) {
        return res.status(404).json({ message: "Membership not found" });
      }
      
      // Verify requester has admin access
      const requesterMembership = await storage.getMembership(userId, membership.organizationId);
      if (!requesterMembership || (requesterMembership.role !== 'OWNER' && requesterMembership.role !== 'ADMIN')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updated = await storage.updateMembershipRole(id, role);
      res.json(updated);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Remove member
  app.delete('/api/memberships/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Get the membership to find orgId
      const targetMembership = await storage.getMembershipsByOrgId('');
      const membership = targetMembership.find(m => m.id === id);
      
      if (!membership) {
        return res.status(404).json({ message: "Membership not found" });
      }
      
      // Verify requester has admin access or is removing themselves
      const requesterMembership = await storage.getMembership(userId, membership.organizationId);
      if (!requesterMembership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const canRemove = requesterMembership.role === 'OWNER' || 
                       requesterMembership.role === 'ADMIN' || 
                       membership.userId === userId;
      
      if (!canRemove) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteMembership(id);
      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
      
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

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projectId = req.params.id;

      // Verify project exists and user has access
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Verify user has access to the organization
      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return res.status(403).json({ message: "Only organization owners and admins can delete projects" });
      }

      await storage.deleteProject(projectId);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Estate routes
  app.get('/api/estates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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

  app.delete('/api/estates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const estateId = req.params.id;

      // Verify estate exists and user has access
      const estate = await storage.getEstate(estateId);
      if (!estate) {
        return res.status(404).json({ message: "Estate not found" });
      }

      // Verify user has access to the project
      const project = await storage.getProject(estate.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return res.status(403).json({ message: "Only organization owners and admins can delete estates" });
      }

      await storage.deleteEstate(estateId);
      res.json({ message: "Estate deleted successfully" });
    } catch (error) {
      console.error("Error deleting estate:", error);
      res.status(500).json({ message: "Failed to delete estate" });
    }
  });

  // Get single estate
  app.get('/api/estates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
      const { id } = req.params;
      const { scanRunId } = req.query;
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

      // Get issues for specific scan run or latest
      let issues, rollup, scanRun;
      if (scanRunId) {
        scanRun = await storage.getScanRun(scanRunId as string);
        if (!scanRun || scanRun.estateId !== id) {
          return res.status(404).json({ message: "Scan run not found" });
        }
        issues = await storage.getA11yResultsByScanRunId(scanRunId as string);
        rollup = {
          totalIssues: scanRun.totalIssues,
          criticalIssues: scanRun.criticalIssues,
          warningIssues: scanRun.warningIssues,
          minorIssues: scanRun.minorIssues,
          passRate: scanRun.passRate,
          averageScore: scanRun.averageScore,
        };
      } else {
        issues = await storage.getA11yResultsByEstateId(id);
        rollup = await storage.getA11yRollupByEstateId(id);
      }
      
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

  // Download estate Excel report
  app.get('/api/estates/:id/report/excel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { scanRunId } = req.query;
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

      // Get issues for specific scan run or latest
      let issues, rollup, scanRun;
      if (scanRunId) {
        scanRun = await storage.getScanRun(scanRunId as string);
        if (!scanRun || scanRun.estateId !== id) {
          return res.status(404).json({ message: "Scan run not found" });
        }
        issues = await storage.getA11yResultsByScanRunId(scanRunId as string);
        rollup = {
          totalIssues: scanRun.totalIssues,
          criticalIssues: scanRun.criticalIssues,
          warningIssues: scanRun.warningIssues,
          minorIssues: scanRun.minorIssues,
          passRate: scanRun.passRate,
          averageScore: scanRun.averageScore,
        };
      } else {
        issues = await storage.getA11yResultsByEstateId(id);
        rollup = await storage.getA11yRollupByEstateId(id);
      }
      
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      
      // Summary worksheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
      ];

      // Style header
      summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
      
      // Add summary data
      summarySheet.addRow({ metric: 'Estate Name', value: estate.name });
      summarySheet.addRow({ metric: 'Base URL', value: estate.baseUrl });
      summarySheet.addRow({ metric: 'Total Issues', value: rollup?.totalIssues || 0 });
      summarySheet.addRow({ metric: 'Pass Rate', value: `${rollup?.passRate || 0}%` });
      summarySheet.addRow({ metric: 'Pages Audited', value: estate.pagesAudited || 0 });
      summarySheet.addRow({ metric: 'Critical Issues', value: rollup?.criticalIssues || 0 });
      summarySheet.addRow({ metric: 'Warning Issues', value: rollup?.warningIssues || 0 });
      summarySheet.addRow({ metric: 'Minor Issues', value: rollup?.minorIssues || 0 });

      // Add download links section
      if (scanRun) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        summarySheet.addRow({ metric: '', value: '' }); // Empty row for spacing
        summarySheet.addRow({ metric: 'Download Links', value: '' }).font = { bold: true };

        if (scanRun.videoPath) {
          const videoRow = summarySheet.addRow({
            metric: 'Video Recording',
            value: `${baseUrl}/api/scans/${scanRun.id}/video`
          });
          videoRow.getCell('value').font = { color: { argb: 'FF0000FF' }, underline: true };
        }

        if (scanRun.tracePath) {
          const traceRow = summarySheet.addRow({
            metric: 'Playwright Trace',
            value: `${baseUrl}/api/scans/${scanRun.id}/trace`
          });
          traceRow.getCell('value').font = { color: { argb: 'FF0000FF' }, underline: true };
        }

        const jsonRow = summarySheet.addRow({
          metric: 'JSON Export',
          value: `${baseUrl}/api/scans/${scanRun.id}/export/json`
        });
        jsonRow.getCell('value').font = { color: { argb: 'FF0000FF' }, underline: true };
      }

      // All Issues worksheet
      const issuesSheet = workbook.addWorksheet('All Issues');
      issuesSheet.columns = [
        { header: 'Page URL', key: 'pageUrl', width: 50 },
        { header: 'Severity', key: 'severity', width: 15 },
        { header: 'Issue Type', key: 'issueType', width: 30 },
        { header: 'WCAG Criteria', key: 'wcagCriteria', width: 20 },
        { header: 'WCAG Standards', key: 'wcagStandards', width: 40 },
        { header: 'Impact', key: 'impact', width: 15 },
        { header: 'Description', key: 'description', width: 60 },
        { header: 'Element', key: 'element', width: 40 },
        { header: 'Suggestion', key: 'suggestion', width: 60 },
        { header: 'Code Snippet', key: 'codeSnippet', width: 60 },
        { header: 'Impact Score', key: 'impactScore', width: 15 }
      ];

      // Style header
      issuesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      issuesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };

      // Group issues by page and rule to avoid duplicates
      const groupedIssues = new Map<string, {
        issue: typeof issues[0];
        page: any;
        count: number;
        elements: string[];
      }>();

      for (const issue of issues) {
        if (issue.severity === 'pass') continue;

        const page = await storage.getPage(issue.pageId);
        const key = `${issue.pageId}-${issue.ruleId}`;

        if (groupedIssues.has(key)) {
          const existing = groupedIssues.get(key)!;
          existing.count++;
          if (issue.elementSelector && !existing.elements.includes(issue.elementSelector)) {
            existing.elements.push(issue.elementSelector);
          }
        } else {
          groupedIssues.set(key, {
            issue,
            page,
            count: 1,
            elements: issue.elementSelector ? [issue.elementSelector] : []
          });
        }
      }

      // Add grouped issues data
      for (const { issue, page, count, elements } of groupedIssues.values()) {
        // Map WCAG reference to standards
        const wcagStandards = mapWcagReferenceToStandards(issue.wcagReference);

        const row = issuesSheet.addRow({
          pageUrl: page?.url || 'Unknown',
          severity: issue.severity,
          issueType: issue.ruleId || 'N/A',
          wcagCriteria: issue.wcagReference || 'N/A',
          wcagStandards: wcagStandards,
          impact: issue.impact || 'N/A',
          description: issue.description || '',
          element: count > 1 ? `${count} occurrences` : (issue.elementSelector || ''),
          suggestion: issue.failureSummary || '',
          codeSnippet: elements.length > 0 ? elements.slice(0, 3).join('; ') : (issue.html || ''),
          impactScore: issue.impact || ''
        });

        // Color-code severity
        const severityColor =
          issue.severity === 'critical' ? 'FFD32F2F' :
          issue.severity === 'warning' ? 'FFF57C00' :
          issue.severity === 'minor' ? 'FF2196F3' : 'FF4CAF50';

        row.getCell('severity').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: severityColor }
        };
        row.getCell('severity').font = { color: { argb: 'FFFFFFFF' }, bold: true };
      }

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="accessibility-report-${estate.name.replace(/[^a-z0-9]/gi, '-')}.xlsx"`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error generating Excel report:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate Excel report" });
      }
    }
  });

  // Download estate CSV report
  app.get('/api/estates/:id/report', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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

      // Import real scan agent with Playwright and axe-core
      const { realScanAgent } = await import('./agents/realScanAgent');
      
      // Respond immediately so frontend can connect WebSocket
      res.json({ message: "Scan started", estateId: id });
      
      // Delay scan start to allow WebSocket connection (1s buffer for connection + subscription)
      console.log(`[Scan] Delaying scan start for estate ${id} to allow WebSocket connection`);
      setTimeout(() => {
        console.log(`[Scan] Starting scan for estate ${id}`);
        realScanAgent.runScan(id).catch(error => {
          console.error('Real scan failed:', error);
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting scan:", error);
      res.status(500).json({ message: "Failed to start scan" });
    }
  });

  // Get scan history for an estate
  app.get('/api/estates/:id/scans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const estate = await storage.getEstate(id);
      
      if (!estate) {
        return res.status(404).json({ message: "Estate not found" });
      }

      // Verify user has access
      const project = await storage.getProject(estate.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied to this estate" });
      }

      const scans = await storage.getScanRunsByEstateId(id);

      // Map database fields to frontend fields for compatibility
      const scansWithPagesAudited = scans.map(scan => ({
        ...scan,
        pagesAudited: scan.pagesScanned,
        totalIssues: (scan.criticalIssues || 0) + (scan.warningIssues || 0) + (scan.minorIssues || 0),
        criticalCount: scan.criticalIssues,
        warningCount: scan.warningIssues,
        minorCount: scan.minorIssues,
      }));

      // Disable caching to ensure fresh data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

      res.json(scansWithPagesAudited);
    } catch (error) {
      console.error("Error fetching scan history:", error);
      res.status(500).json({ message: "Failed to fetch scan history" });
    }
  });

  // Get all scan sessions for the current user
  app.get('/api/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Get all organizations the user belongs to
      const orgs = await storage.getOrganizationsByUserId(userId);

      if (!orgs || orgs.length === 0) {
        return res.json([]);
      }

      // Get all projects from all organizations
      const allProjects = await Promise.all(
        orgs.map(org => storage.getProjectsByOrgId(org.id))
      );
      const projects = allProjects.flat();

      if (projects.length === 0) {
        return res.json([]);
      }

      // Get all estates from all projects
      const allEstates = await Promise.all(
        projects.map(project => storage.getEstatesByProjectId(project.id))
      );
      const estates = allEstates.flat();

      if (estates.length === 0) {
        return res.json([]);
      }

      // Get all scan runs from all estates
      const allScanRuns = await Promise.all(
        estates.map(estate => storage.getScanRunsByEstateId(estate.id))
      );
      const scanRuns = allScanRuns.flat();

      // Attach estate information to each scan run and map database fields to frontend fields
      const scanRunsWithEstate = scanRuns.map(scanRun => {
        const estate = estates.find(e => e.id === scanRun.estateId);
        return {
          ...scanRun,
          pagesAudited: scanRun.pagesScanned,
          totalIssues: (scanRun.criticalIssues || 0) + (scanRun.warningIssues || 0) + (scanRun.minorIssues || 0),
          criticalCount: scanRun.criticalIssues,
          warningCount: scanRun.warningIssues,
          minorCount: scanRun.minorIssues,
          estate: estate || null,
        };
      }).filter(sr => sr.estate !== null);

      // Sort by creation date (newest first)
      scanRunsWithEstate.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      res.json(scanRunsWithEstate);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Get specific scan run details
  app.get('/api/scans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const scanRun = await storage.getScanRun(id);
      
      if (!scanRun) {
        return res.status(404).json({ message: "Scan run not found" });
      }

      // Verify user has access to the estate's project
      const estate = await storage.getEstate(scanRun.estateId);
      if (!estate) {
        return res.status(404).json({ message: "Estate not found" });
      }

      const project = await storage.getProject(estate.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied to this scan" });
      }

      // Get issues for this scan run
      const issues = await storage.getA11yResultsByScanRunId(id);

      // Calculate derived fields that frontend expects
      const totalIssues = (scanRun.criticalIssues || 0) + (scanRun.warningIssues || 0) + (scanRun.minorIssues || 0);
      const totalChecks = totalIssues + (scanRun.passedChecks || 0);
      const passRate = totalChecks > 0 ? Math.round(((scanRun.passedChecks || 0) / totalChecks) * 100) : null;
      const averageScore = passRate;

      res.json({
        ...scanRun,
        issues,
        totalIssues,
        pagesAudited: scanRun.pagesScanned,
        passRate,
        averageScore,
      });
    } catch (error) {
      console.error("Error fetching scan details:", error);
      res.status(500).json({ message: "Failed to fetch scan details" });
    }
  });

  app.delete('/api/scans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const scanId = req.params.id;

      // Verify scan exists and user has access
      const scanRun = await storage.getScanRun(scanId);
      if (!scanRun) {
        return res.status(404).json({ message: "Scan not found" });
      }

      // Verify user has access to the estate's project
      const estate = await storage.getEstate(scanRun.estateId);
      if (!estate) {
        return res.status(404).json({ message: "Estate not found" });
      }

      const project = await storage.getProject(estate.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        return res.status(403).json({ message: "Only organization owners and admins can delete scans" });
      }

      await storage.deleteScanRun(scanId);
      res.json({ message: "Scan deleted successfully" });
    } catch (error) {
      console.error("Error deleting scan:", error);
      res.status(500).json({ message: "Failed to delete scan" });
    }
  });

  // Download scan video
  app.get('/api/scans/:id/video', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const scanRun = await storage.getScanRun(id);
      
      if (!scanRun) {
        return res.status(404).json({ message: "Scan run not found" });
      }

      // Verify user has access
      const estate = await storage.getEstate(scanRun.estateId);
      if (!estate) {
        return res.status(404).json({ message: "Estate not found" });
      }

      const project = await storage.getProject(estate.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied to this scan" });
      }

      if (!scanRun.videoPath) {
        return res.status(404).json({ message: "Video not found for this scan" });
      }

      // Check if this is an object storage path or local path
      if (scanRun.videoPath.startsWith('/objects/')) {
        // Download from object storage
        const { ObjectStorageService, ObjectNotFoundError } = await import('./objectStorage');
        const objectStorageService = new ObjectStorageService();

        try {
          const objectFile = await objectStorageService.getObjectEntityFile(scanRun.videoPath);
          res.setHeader('Content-Disposition', `attachment; filename="scan-${id}.webm"`);
          await objectStorageService.downloadObject(objectFile, res);
        } catch (error) {
          if (error instanceof ObjectNotFoundError) {
            return res.status(404).json({ message: "Video file not found in storage" });
          }
          throw error;
        }
      } else {
        // Local filesystem path - serve the file directly
        const fs = await import('fs');
        const path = await import('path');

        if (!fs.existsSync(scanRun.videoPath)) {
          return res.status(404).json({
            message: "Video file not found. The file may have been deleted or moved."
          });
        }

        const filename = path.basename(scanRun.videoPath);
        res.setHeader('Content-Type', 'video/webm');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const fileStream = fs.createReadStream(scanRun.videoPath);
        fileStream.pipe(res);
      }
    } catch (error) {
      console.error("Error downloading video:", error);
      res.status(500).json({ message: "Failed to download video" });
    }
  });

  // Download scan Playwright trace
  app.get('/api/scans/:id/trace', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const scanRun = await storage.getScanRun(id);
      
      if (!scanRun) {
        return res.status(404).json({ message: "Scan run not found" });
      }

      // Verify user has access
      const estate = await storage.getEstate(scanRun.estateId);
      if (!estate) {
        return res.status(404).json({ message: "Estate not found" });
      }

      const project = await storage.getProject(estate.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied to this scan" });
      }

      if (!scanRun.tracePath) {
        return res.status(404).json({ message: "Trace not found for this scan" });
      }

      // Check if this is an object storage path or old local path
      if (scanRun.tracePath.startsWith('/objects/')) {
        // New: Download from object storage
        const { ObjectStorageService, ObjectNotFoundError } = await import('./objectStorage');
        const objectStorageService = new ObjectStorageService();
        
        try {
          const objectFile = await objectStorageService.getObjectEntityFile(scanRun.tracePath);
          res.setHeader('Content-Disposition', `attachment; filename="trace-${id}.zip"`);
          await objectStorageService.downloadObject(objectFile, res);
        } catch (error) {
          if (error instanceof ObjectNotFoundError) {
            return res.status(404).json({ message: "Trace file not found in storage" });
          }
          throw error;
        }
      } else {
        // Local filesystem path - serve the file directly
        const fs = await import('fs');
        const path = await import('path');

        if (!fs.existsSync(scanRun.tracePath)) {
          return res.status(404).json({
            message: "Trace file not found. The file may have been deleted or moved."
          });
        }

        const filename = path.basename(scanRun.tracePath);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const fileStream = fs.createReadStream(scanRun.tracePath);
        fileStream.pipe(res);
      }
    } catch (error) {
      console.error("Error downloading trace:", error);
      res.status(500).json({ message: "Failed to download trace" });
    }
  });

  // Export scan results as JSON
  app.get('/api/scans/:id/export/json', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const scanRun = await storage.getScanRun(id);
      
      if (!scanRun) {
        return res.status(404).json({ message: "Scan run not found" });
      }

      // Verify user has access
      const estate = await storage.getEstate(scanRun.estateId);
      if (!estate) {
        return res.status(404).json({ message: "Estate not found" });
      }

      const project = await storage.getProject(estate.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied to this scan" });
      }

      // Get issues for this scan
      const issues = await storage.getA11yResultsByScanRunId(id);

      // Build download URLs
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const downloadLinks = {
        video: scanRun.videoPath ? `${baseUrl}/api/scans/${id}/video` : null,
        trace: scanRun.tracePath ? `${baseUrl}/api/scans/${id}/trace` : null,
        json: `${baseUrl}/api/scans/${id}/export/json`,
      };

      // Create export data
      const exportData = {
        scan: scanRun,
        estate: {
          id: estate.id,
          name: estate.name,
          url: estate.baseUrl
        },
        downloadLinks: downloadLinks,
        issues: issues,
        exportedAt: new Date().toISOString()
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="scan-${id}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting JSON:", error);
      res.status(500).json({ message: "Failed to export JSON" });
    }
  });

  // Compare two scan runs
  app.get('/api/scans/compare/:id1/:id2', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id1, id2 } = req.params;

      // Get both scan runs
      const [scan1, scan2] = await Promise.all([
        storage.getScanRun(id1),
        storage.getScanRun(id2),
      ]);

      if (!scan1 || !scan2) {
        return res.status(404).json({ message: "Scan run not found" });
      }

      // Verify both scans are from the same estate
      if (scan1.estateId !== scan2.estateId) {
        return res.status(400).json({ message: "Cannot compare scans from different estates" });
      }

      // Verify user has access
      const estate = await storage.getEstate(scan1.estateId);
      if (!estate) {
        return res.status(404).json({ message: "Estate not found" });
      }

      const project = await storage.getProject(estate.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const membership = await storage.getMembership(userId, project.organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied to these scans" });
      }

      // Get issues for both scans
      const [issues1, issues2] = await Promise.all([
        storage.getA11yResultsByScanRunId(id1),
        storage.getA11yResultsByScanRunId(id2),
      ]);

      // Calculate comparison metrics
      const comparison = {
        scan1: {
          ...scan1,
          issuesCount: issues1.length,
        },
        scan2: {
          ...scan2,
          issuesCount: issues2.length,
        },
        changes: {
          totalIssues: (scan2.totalIssues || 0) - (scan1.totalIssues || 0),
          criticalIssues: (scan2.criticalIssues || 0) - (scan1.criticalIssues || 0),
          warningIssues: (scan2.warningIssues || 0) - (scan1.warningIssues || 0),
          minorIssues: (scan2.minorIssues || 0) - (scan1.minorIssues || 0),
          passRate: (scan2.passRate || 0) - (scan1.passRate || 0),
          averageScore: (scan2.averageScore || 0) - (scan1.averageScore || 0),
        },
        // Group issues by type for detailed comparison
        issueTypeChanges: calculateIssueTypeChanges(issues1, issues2),
      };

      res.json(comparison);
    } catch (error) {
      console.error("Error comparing scans:", error);
      res.status(500).json({ message: "Failed to compare scans" });
    }
  });

  // Issues routes
  app.get('/api/issues', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  // Get all users (for assignment dropdown)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orgs = await storage.getOrganizationsByUserId(userId);
      
      if (orgs.length === 0) {
        return res.json([]);
      }

      // Get all users from user's organizations
      const allUsers = await Promise.all(
        orgs.map(org => storage.getUsersByOrgId(org.id))
      );
      
      res.json(allUsers.flat());
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Bulk update issue status
  app.patch('/api/issues/bulk-status', isAuthenticated, async (req: any, res) => {
    try {
      const { issueIds, status } = req.body;
      
      if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
        return res.status(400).json({ message: "Invalid issue IDs" });
      }

      await storage.updateIssuesStatus(issueIds, status);
      res.json({ message: "Issues updated successfully" });
    } catch (error) {
      console.error("Error updating issue status:", error);
      res.status(500).json({ message: "Failed to update issues" });
    }
  });

  // Bulk assign issues
  app.patch('/api/issues/bulk-assign', isAuthenticated, async (req: any, res) => {
    try {
      const { issueIds, userId } = req.body;
      
      if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
        return res.status(400).json({ message: "Invalid issue IDs" });
      }

      await storage.assignIssues(issueIds, userId);
      res.json({ message: "Issues assigned successfully" });
    } catch (error) {
      console.error("Error assigning issues:", error);
      res.status(500).json({ message: "Failed to assign issues" });
    }
  });

  // Generate AI suggestion for an issue
  app.post('/api/issues/:issueId/ai-suggestion', isAuthenticated, async (req: any, res) => {
    try {
      const { issueId } = req.params;
      const issue = await storage.getA11yResult(issueId);
      
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      // Use OpenAI to generate fix suggestion
      const openai = await import('openai');
      const client = new openai.default();
      
      const prompt = `You are an accessibility expert. Provide a clear, actionable fix for this WCAG violation:

Issue Type: ${issue.issueType}
Severity: ${issue.severity}
Description: ${issue.description || 'N/A'}
WCAG Criteria: ${issue.wcagCriteria || 'N/A'}
Code Snippet: ${issue.codeSnippet || 'N/A'}

Provide a concise, practical solution (2-3 sentences) that a developer can implement immediately.`;

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      });

      const aiSuggestion = completion.choices[0]?.message?.content || "Unable to generate suggestion";
      
      await storage.updateIssueAISuggestion(issueId, aiSuggestion);
      res.json({ message: "AI suggestion generated", suggestion: aiSuggestion });
    } catch (error) {
      console.error("Error generating AI suggestion:", error);
      res.status(500).json({ message: "Failed to generate AI suggestion" });
    }
  });

  // Get comments for an issue
  app.get('/api/issues/comments/:issueId', isAuthenticated, async (req: any, res) => {
    try {
      const { issueId } = req.params;
      const comments = await storage.getIssueComments(issueId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Add comment to an issue
  app.post('/api/issues/comments', isAuthenticated, async (req: any, res) => {
    try {
      const { issueId, userId, comment } = req.body;
      
      if (!issueId || !userId || !comment) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const newComment = await storage.createIssueComment({ issueId, userId, comment });
      res.json(newComment);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  // Dashboard stats route
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
        { header: 'WCAG Standards', key: 'wcagStandards', width: 40 },
        { header: 'Impact', key: 'impact', width: 12 },
        { header: 'Impact Score', key: 'impactScore', width: 12 },
        { header: 'Element', key: 'element', width: 30 },
        { header: 'Description', key: 'description', width: 50 },
        { header: 'Suggestion', key: 'suggestion', width: 50 },
        { header: 'Code Snippet', key: 'codeSnippet', width: 40 },
      ];

      // Group issues by page and rule to avoid duplicates
      const groupedIssuesMap = new Map<string, {
        issue: typeof issues[0];
        page: any;
        estate: any;
        count: number;
        elements: string[];
      }>();

      issues.forEach(issue => {
        if (issue.severity === 'pass') return;

        const page = pages.find(p => p.id === issue.pageId);
        const estate = estates.find(e => e.id === page?.estateId);
        const key = `${issue.pageId}-${issue.ruleId}`;

        if (groupedIssuesMap.has(key)) {
          const existing = groupedIssuesMap.get(key)!;
          existing.count++;
          if (issue.elementSelector && !existing.elements.includes(issue.elementSelector)) {
            existing.elements.push(issue.elementSelector);
          }
        } else {
          groupedIssuesMap.set(key, {
            issue,
            page,
            estate,
            count: 1,
            elements: issue.elementSelector ? [issue.elementSelector] : []
          });
        }
      });

      // Add grouped issues data
      for (const { issue, page, estate, count, elements } of groupedIssuesMap.values()) {
        // Map WCAG reference to standards
        const wcagStandards = mapWcagReferenceToStandards(issue.wcagReference);

        const row = detailSheet.addRow({
          estateUrl: estate?.baseUrl || 'N/A',
          pageUrl: page?.url || 'N/A',
          severity: issue.severity,
          issueType: issue.ruleId || 'N/A',
          wcagCriteria: issue.wcagReference || 'N/A',
          wcagStandards: wcagStandards,
          impact: issue.impact || 'N/A',
          impactScore: issue.impact || 'N/A',
          element: count > 1 ? `${count} occurrences` : (issue.elementSelector || 'N/A'),
          description: issue.description || 'N/A',
          suggestion: issue.failureSummary || 'N/A',
          codeSnippet: elements.length > 0 ? elements.slice(0, 3).join('; ') : (issue.html || 'N/A'),
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
      }

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

  // AI Agent routes
  app.get('/api/ai-agent/conversation', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      // Get or create a conversation for the user
      let conversation = await storage.getChatConversationByUserId(userId);
      
      if (!conversation) {
        conversation = await storage.createChatConversation({
          userId,
          organizationId: null,
          title: 'New Conversation',
        });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.get('/api/ai-agent/messages/:conversationId', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = req.params.conversationId;
      const messages = await storage.getChatMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/ai-agent/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { conversationId, message } = req.body;

      if (!message || !conversationId) {
        return res.status(400).json({ message: "Message and conversation ID required" });
      }

      // Save user message
      await storage.createChatMessage({
        conversationId,
        role: 'user',
        content: message,
        messageType: 'text',
        metadata: null,
      });

      // Process with AI agent (will be implemented in the agent file)
      const { processAIAgentMessage } = await import('./ai-agent');
      const aiResponse = await processAIAgentMessage(message, userId, conversationId);

      console.log('[AI Agent Route] AI Response:', {
        messageType: aiResponse.messageType,
        hasMetadata: !!aiResponse.metadata,
        metadata: aiResponse.metadata,
      });

      // Save AI response
      const savedMessage = await storage.createChatMessage({
        conversationId,
        role: 'assistant',
        content: aiResponse.content,
        messageType: aiResponse.messageType || 'text',
        metadata: aiResponse.metadata || null,
      });

      console.log('[AI Agent Route] Saved message:', {
        id: savedMessage.id,
        messageType: savedMessage.messageType,
        hasMetadata: !!savedMessage.metadata,
        metadata: savedMessage.metadata,
      });

      res.json({ 
        success: true, 
        estateId: aiResponse.metadata?.estateId 
      });
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  app.delete('/api/ai-agent/conversations/:conversationId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = req.params.conversationId;
      await storage.deleteChatMessages(conversationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting messages:", error);
      res.status(500).json({ message: "Failed to delete messages" });
    }
  });

  // External MCP Server routes
  app.get('/api/mcp-servers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const servers = await storage.getExternalMcpServers(userId);
      res.json(servers);
    } catch (error) {
      console.error("Error fetching MCP servers:", error);
      res.status(500).json({ message: "Failed to fetch MCP servers" });
    }
  });

  app.get('/api/mcp-servers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const server = await storage.getExternalMcpServer(id);
      
      if (!server) {
        return res.status(404).json({ message: "MCP server not found" });
      }

      // Verify ownership
      if (server.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(server);
    } catch (error) {
      console.error("Error fetching MCP server:", error);
      res.status(500).json({ message: "Failed to fetch MCP server" });
    }
  });

  app.post('/api/mcp-servers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, description, transport, url, headers, enabled } = req.body;

      if (!name || !url) {
        return res.status(400).json({ message: "Name and URL are required" });
      }

      const server = await storage.createExternalMcpServer({
        userId,
        organizationId: null,
        name,
        description: description || null,
        transport: transport || 'sse',
        url,
        headers: headers || null,
        enabled: enabled !== undefined ? enabled : true,
      });

      res.status(201).json(server);
    } catch (error) {
      console.error("Error creating MCP server:", error);
      res.status(500).json({ message: "Failed to create MCP server" });
    }
  });

  app.patch('/api/mcp-servers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const server = await storage.getExternalMcpServer(id);
      
      if (!server) {
        return res.status(404).json({ message: "MCP server not found" });
      }

      if (server.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Whitelist allowed fields for security
      const allowedFields = ['name', 'description', 'transport', 'url', 'headers', 'enabled'];
      const updates: any = {};
      
      for (const field of allowedFields) {
        if (field in req.body) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updated = await storage.updateExternalMcpServer(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating MCP server:", error);
      res.status(500).json({ message: "Failed to update MCP server" });
    }
  });

  app.delete('/api/mcp-servers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const server = await storage.getExternalMcpServer(id);
      
      if (!server) {
        return res.status(404).json({ message: "MCP server not found" });
      }

      if (server.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteExternalMcpServer(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting MCP server:", error);
      res.status(500).json({ message: "Failed to delete MCP server" });
    }
  });

  app.post('/api/mcp-servers/:id/test', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const server = await storage.getExternalMcpServer(id);
      
      if (!server) {
        return res.status(404).json({ message: "MCP server not found" });
      }

      if (server.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Test connection to external MCP server
      const { testMcpServerConnection } = await import('./mcpClient');
      const result = await testMcpServerConnection(server);
      
      if (result.success) {
        await storage.updateExternalMcpServerLastConnected(id);
      }

      res.json(result);
    } catch (error) {
      console.error("Error testing MCP server:", error);
      res.status(500).json({ message: "Failed to test MCP server connection" });
    }
  });

  // ==================== ADMIN ROUTES ====================
  // Global MCP Server Management (Super Admin only)
  
  app.get('/api/admin/mcp-servers', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const servers = await storage.getAllMcpServers();
      res.json(servers);
    } catch (error) {
      console.error("Error fetching MCP servers:", error);
      res.status(500).json({ message: "Failed to fetch MCP servers" });
    }
  });

  app.post('/api/admin/mcp-servers', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const validatedData = insertMcpServerSchema.parse(req.body);
      const server = await storage.createMcpServer(validatedData);
      res.status(201).json(server);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid server data", errors: error.errors });
      }
      console.error("Error creating MCP server:", error);
      res.status(500).json({ message: "Failed to create MCP server" });
    }
  });

  app.patch('/api/admin/mcp-servers/:id', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const server = await storage.updateMcpServer(id, req.body);
      res.json(server);
    } catch (error) {
      console.error("Error updating MCP server:", error);
      res.status(500).json({ message: "Failed to update MCP server" });
    }
  });

  app.delete('/api/admin/mcp-servers/:id', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMcpServer(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting MCP server:", error);
      res.status(500).json({ message: "Failed to delete MCP server" });
    }
  });

  // User Management (Support Admin and above)
  
  app.get('/api/admin/users', isAuthenticated, requireSupportAdmin, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const users = await storage.getAllUsers(limit, offset);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id/status', isAuthenticated, requireSupportAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['active', 'suspended', 'banned'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const user = await storage.updateUserStatus(id, status);
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.patch('/api/admin/users/:id/system-role', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { systemRole } = req.body;
      
      if (systemRole !== null && !['SUPER_ADMIN', 'BILLING_ADMIN', 'SUPPORT_ADMIN'].includes(systemRole)) {
        return res.status(400).json({ message: "Invalid system role" });
      }

      const user = await storage.updateUserSystemRole(id, systemRole);
      res.json(user);
    } catch (error) {
      console.error("Error updating user system role:", error);
      res.status(500).json({ message: "Failed to update user system role" });
    }
  });

  // Billing Management (Billing Admin and above)
  
  // Subscriptions
  app.get('/api/admin/subscriptions', isAuthenticated, requireBillingAdmin, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const subscriptions = await storage.getAllSubscriptions(limit, offset);
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.get('/api/admin/subscriptions/:id', isAuthenticated, requireBillingAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const subscription = await storage.getSubscription(id);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.post('/api/admin/subscriptions', isAuthenticated, requireBillingAdmin, async (req: any, res) => {
    try {
      const validatedData = insertSubscriptionSchema.parse(req.body);
      const subscription = await storage.createSubscription(validatedData);
      res.status(201).json(subscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid subscription data", errors: error.errors });
      }
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.patch('/api/admin/subscriptions/:id', isAuthenticated, requireBillingAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const subscription = await storage.updateSubscription(id, req.body);
      res.json(subscription);
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Invoices
  app.get('/api/admin/invoices', isAuthenticated, requireBillingAdmin, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const invoices = await storage.getAllInvoices(limit, offset);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get('/api/admin/invoices/:id', isAuthenticated, requireBillingAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post('/api/admin/invoices', isAuthenticated, requireBillingAdmin, async (req: any, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.patch('/api/admin/invoices/:id', isAuthenticated, requireBillingAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.updateInvoice(id, req.body);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Payments
  app.get('/api/admin/payments', isAuthenticated, requireBillingAdmin, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const payments = await storage.getAllPayments(limit, offset);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.get('/api/admin/payments/:id', isAuthenticated, requireBillingAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const payment = await storage.getPayment(id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({ message: "Failed to fetch payment" });
    }
  });

  app.post('/api/admin/payments', isAuthenticated, requireBillingAdmin, async (req: any, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment data", errors: error.errors });
      }
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Generate and download documentation PDF
  app.get('/api/documentation/download', async (req, res) => {
    try {
      console.log('[PDF] Generating documentation PDF...');
      const { generateDocumentationPDF } = await import('./pdfGenerator.js');
      const doc = generateDocumentationPDF();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="TestraAI-Documentation.pdf"');
      console.log('[PDF] Headers set, piping PDF to response...');
      
      doc.pipe(res);
      doc.on('end', () => console.log('[PDF] PDF generation complete'));
      doc.on('error', (err: Error) => console.error('[PDF] PDF generation error:', err));
    } catch (error) {
      console.error('[PDF] Error generating PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF documentation' });
    }
  });

  const httpServer = createServer(app);

  // Initialize WebSocket server
  wsManager.initialize(httpServer);

  return httpServer;
}
