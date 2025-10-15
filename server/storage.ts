import {
  users,
  organizations,
  memberships,
  projects,
  estates,
  pages,
  scanRuns,
  a11yResults,
  a11yRollups,
  a11yHistory,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type Membership,
  type InsertMembership,
  type Project,
  type InsertProject,
  type Estate,
  type InsertEstate,
  type Page,
  type InsertPage,
  type ScanRun,
  type InsertScanRun,
  type A11yResult,
  type InsertA11yResult,
  type A11yRollup,
  type InsertA11yRollup,
  type A11yHistory,
  type InsertA11yHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationsByUserId(userId: string): Promise<Organization[]>;
  createOrganization(org: InsertOrganization, ownerId: string): Promise<Organization>;
  
  // Membership operations
  getMembership(userId: string, orgId: string): Promise<Membership | undefined>;
  getMembershipsByOrgId(orgId: string): Promise<Membership[]>;
  createMembership(membership: InsertMembership): Promise<Membership>;
  updateMembershipRole(id: string, role: 'OWNER' | 'ADMIN' | 'DEV' | 'VIEWER'): Promise<Membership>;
  
  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByOrgId(orgId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  
  // Estate operations
  getEstate(id: string): Promise<Estate | undefined>;
  getEstatesByProjectId(projectId: string): Promise<Estate[]>;
  createEstate(estate: InsertEstate): Promise<Estate>;
  updateEstateStatus(id: string, status: 'idle' | 'crawling' | 'auditing' | 'completed' | 'failed'): Promise<Estate>;
  updateEstateStats(id: string, pagesDiscovered: number, pagesAudited: number): Promise<Estate>;
  
  // Page operations
  getPage(id: string): Promise<Page | undefined>;
  getPagesByEstateId(estateId: string): Promise<Page[]>;
  createPage(page: InsertPage): Promise<Page>;
  updatePageAuditStatus(id: string, isAudited: number, screenshotUrl?: string): Promise<Page>;
  
  // Scan Run operations
  getScanRun(id: string): Promise<ScanRun | undefined>;
  getScanRunsByEstateId(estateId: string): Promise<ScanRun[]>;
  getLatestScanRun(estateId: string): Promise<ScanRun | undefined>;
  createScanRun(scanRun: InsertScanRun): Promise<ScanRun>;
  updateScanRunStatus(id: string, status: 'running' | 'completed' | 'failed'): Promise<ScanRun>;
  updateScanRunStats(id: string, stats: {
    totalIssues?: number;
    criticalIssues?: number;
    warningIssues?: number;
    minorIssues?: number;
    passRate?: number;
    averageScore?: number;
    pagesAudited?: number;
  }): Promise<ScanRun>;
  completeScanRun(id: string): Promise<ScanRun>;
  
  // A11y Result operations
  getA11yResultsByPageId(pageId: string): Promise<A11yResult[]>;
  getA11yResultsByEstateId(estateId: string): Promise<A11yResult[]>;
  getA11yResultsByScanRunId(scanRunId: string): Promise<A11yResult[]>;
  createA11yResult(result: InsertA11yResult): Promise<A11yResult>;
  
  // A11y Rollup operations
  getA11yRollupByEstateId(estateId: string): Promise<A11yRollup | undefined>;
  upsertA11yRollup(rollup: InsertA11yRollup): Promise<A11yRollup>;
  
  // A11y History operations
  getA11yHistoryByEstateId(estateId: string, limit?: number): Promise<A11yHistory[]>;
  createA11yHistorySnapshot(snapshot: InsertA11yHistory): Promise<A11yHistory>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Try to upsert by id (primary key)
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error: any) {
      // If email conflict (different id, same email), update by email
      if (error?.code === '23505' && error?.constraint === 'users_email_unique') {
        const [user] = await db
          .update(users)
          .set({
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email!))
          .returning();
        return user;
      }
      throw error;
    }
  }

  // Organization operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationsByUserId(userId: string): Promise<Organization[]> {
    const userMemberships = await db
      .select({ organizationId: memberships.organizationId })
      .from(memberships)
      .where(eq(memberships.userId, userId));
    
    if (userMemberships.length === 0) return [];
    
    const orgIds = userMemberships.map(m => m.organizationId);
    return await db.select().from(organizations).where(inArray(organizations.id, orgIds));
  }

  async createOrganization(org: InsertOrganization, ownerId: string): Promise<Organization> {
    const [newOrg] = await db.insert(organizations).values(org).returning();
    
    // Create owner membership
    await db.insert(memberships).values({
      userId: ownerId,
      organizationId: newOrg.id,
      role: 'OWNER',
    });
    
    return newOrg;
  }

  // Membership operations
  async getMembership(userId: string, orgId: string): Promise<Membership | undefined> {
    const [membership] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, orgId)));
    return membership;
  }

  async getMembershipsByOrgId(orgId: string): Promise<Membership[]> {
    return await db.select().from(memberships).where(eq(memberships.organizationId, orgId));
  }

  async createMembership(membership: InsertMembership): Promise<Membership> {
    const [newMembership] = await db.insert(memberships).values(membership).returning();
    return newMembership;
  }

  async updateMembershipRole(id: string, role: 'OWNER' | 'ADMIN' | 'DEV' | 'VIEWER'): Promise<Membership> {
    const [updated] = await db
      .update(memberships)
      .set({ role })
      .where(eq(memberships.id, id))
      .returning();
    return updated;
  }

  // Project operations
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByOrgId(orgId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.organizationId, orgId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  // Estate operations
  async getEstate(id: string): Promise<Estate | undefined> {
    const [estate] = await db.select().from(estates).where(eq(estates.id, id));
    return estate;
  }

  async getEstatesByProjectId(projectId: string): Promise<Estate[]> {
    return await db.select().from(estates).where(eq(estates.projectId, projectId));
  }

  async createEstate(estate: InsertEstate): Promise<Estate> {
    const [newEstate] = await db.insert(estates).values(estate).returning();
    return newEstate;
  }

  async updateEstateStatus(id: string, status: 'idle' | 'crawling' | 'auditing' | 'completed' | 'failed'): Promise<Estate> {
    const [updated] = await db
      .update(estates)
      .set({ status, updatedAt: new Date() })
      .where(eq(estates.id, id))
      .returning();
    return updated;
  }

  async updateEstateStats(id: string, pagesDiscovered: number, pagesAudited: number): Promise<Estate> {
    const [updated] = await db
      .update(estates)
      .set({ pagesDiscovered, pagesAudited, updatedAt: new Date() })
      .where(eq(estates.id, id))
      .returning();
    return updated;
  }

  // Page operations
  async getPage(id: string): Promise<Page | undefined> {
    const [page] = await db.select().from(pages).where(eq(pages.id, id));
    return page;
  }

  async getPagesByEstateId(estateId: string): Promise<Page[]> {
    return await db.select().from(pages).where(eq(pages.estateId, estateId));
  }

  async createPage(page: InsertPage): Promise<Page> {
    const [newPage] = await db.insert(pages).values(page).returning();
    return newPage;
  }

  async updatePageAuditStatus(id: string, isAudited: number, screenshotUrl?: string): Promise<Page> {
    const [updated] = await db
      .update(pages)
      .set({ isAudited, screenshotUrl })
      .where(eq(pages.id, id))
      .returning();
    return updated;
  }

  // Scan Run operations
  async getScanRun(id: string): Promise<ScanRun | undefined> {
    const [scanRun] = await db.select().from(scanRuns).where(eq(scanRuns.id, id));
    return scanRun;
  }

  async getScanRunsByEstateId(estateId: string): Promise<ScanRun[]> {
    return await db
      .select()
      .from(scanRuns)
      .where(eq(scanRuns.estateId, estateId))
      .orderBy(desc(scanRuns.startedAt));
  }

  async getLatestScanRun(estateId: string): Promise<ScanRun | undefined> {
    const runs = await this.getScanRunsByEstateId(estateId);
    return runs[0];
  }

  async createScanRun(scanRun: InsertScanRun): Promise<ScanRun> {
    const [newScanRun] = await db.insert(scanRuns).values(scanRun).returning();
    return newScanRun;
  }

  async updateScanRunStatus(id: string, status: 'running' | 'completed' | 'failed'): Promise<ScanRun> {
    const [updated] = await db
      .update(scanRuns)
      .set({ status })
      .where(eq(scanRuns.id, id))
      .returning();
    return updated;
  }

  async updateScanRunStats(id: string, stats: {
    totalIssues?: number;
    criticalIssues?: number;
    warningIssues?: number;
    minorIssues?: number;
    passRate?: number;
    averageScore?: number;
    pagesAudited?: number;
  }): Promise<ScanRun> {
    const [updated] = await db
      .update(scanRuns)
      .set(stats)
      .where(eq(scanRuns.id, id))
      .returning();
    return updated;
  }

  async completeScanRun(id: string): Promise<ScanRun> {
    const [updated] = await db
      .update(scanRuns)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(scanRuns.id, id))
      .returning();
    return updated;
  }

  // A11y Result operations
  async getA11yResultsByPageId(pageId: string): Promise<A11yResult[]> {
    return await db.select().from(a11yResults).where(eq(a11yResults.pageId, pageId));
  }

  async getA11yResultsByScanRunId(scanRunId: string): Promise<A11yResult[]> {
    return await db.select().from(a11yResults).where(eq(a11yResults.scanRunId, scanRunId));
  }

  async getA11yResultsByEstateId(estateId: string, latestScanOnly: boolean = true): Promise<A11yResult[]> {
    if (latestScanOnly) {
      const latestScan = await this.getLatestScanRun(estateId);
      if (!latestScan) return [];
      return await this.getA11yResultsByScanRunId(latestScan.id);
    }
    
    // Get all results across all scans
    const estatePages = await db.select({ id: pages.id }).from(pages).where(eq(pages.estateId, estateId));
    const pageIds = estatePages.map(p => p.id);
    if (pageIds.length === 0) return [];
    return await db.select().from(a11yResults).where(inArray(a11yResults.pageId, pageIds));
  }

  async createA11yResult(result: InsertA11yResult): Promise<A11yResult> {
    const [newResult] = await db.insert(a11yResults).values(result).returning();
    return newResult;
  }

  // A11y Rollup operations
  async getA11yRollupByEstateId(estateId: string): Promise<A11yRollup | undefined> {
    const [rollup] = await db.select().from(a11yRollups).where(eq(a11yRollups.estateId, estateId));
    return rollup;
  }

  async upsertA11yRollup(rollup: InsertA11yRollup): Promise<A11yRollup> {
    const existing = await this.getA11yRollupByEstateId(rollup.estateId);
    
    if (existing) {
      const [updated] = await db
        .update(a11yRollups)
        .set({ ...rollup, updatedAt: new Date() })
        .where(eq(a11yRollups.estateId, rollup.estateId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(a11yRollups).values(rollup).returning();
      return created;
    }
  }

  // A11y History operations
  async getA11yHistoryByEstateId(estateId: string, limit: number = 30): Promise<A11yHistory[]> {
    return await db
      .select()
      .from(a11yHistory)
      .where(eq(a11yHistory.estateId, estateId))
      .orderBy(desc(a11yHistory.snapshotDate))
      .limit(limit);
  }

  async createA11yHistorySnapshot(snapshot: InsertA11yHistory): Promise<A11yHistory> {
    const [newSnapshot] = await db.insert(a11yHistory).values(snapshot).returning();
    return newSnapshot;
  }
}

export const storage = new DatabaseStorage();
