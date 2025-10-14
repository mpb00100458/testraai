import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { insertOrganizationSchema, insertProjectSchema, insertEstateSchema } from "@shared/schema";

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

  // Download estate report
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

      // Import scanAgent
      const { scanAgent } = await import('./agents/scanAgent');
      
      // Run scan asynchronously
      scanAgent.runScan(id).catch(error => {
        console.error('Scan failed:', error);
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
      
      res.json({
        totalScans,
        totalIssues,
        pagesScanned,
        passRate,
        severityBreakdown,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Report export routes (CSV/PDF placeholder)
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
        ['Severity', 'Issue Type', 'WCAG Criteria', 'Description'].join(','),
        ...issues.map(issue => [
          issue.severity,
          `"${issue.issueType}"`,
          issue.wcagCriteria || 'N/A',
          `"${(issue.description || '').replace(/"/g, '""')}"`,
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

  const httpServer = createServer(app);

  return httpServer;
}
