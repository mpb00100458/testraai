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
  issueComments,
  chatConversations,
  chatMessages,
  externalMcpServers,
  mcpServers,
  subscriptions,
  invoices,
  payments,
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
  type IssueComment,
  type ChatConversation,
  type InsertChatConversation,
  type ChatMessage,
  type InsertChatMessage,
  type ExternalMcpServer,
  type InsertExternalMcpServer,
  type McpServer,
  type InsertMcpServer,
  type Subscription,
  type InsertSubscription,
  type Invoice,
  type InsertInvoice,
  type Payment,
  type InsertPayment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersByOrgId(orgId: string): Promise<User[]>;
  updateUser(id: string, data: Partial<Pick<User, 'firstName' | 'lastName' | 'profileImageUrl'>>): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  
  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationsByUserId(userId: string): Promise<Organization[]>;
  createOrganization(org: InsertOrganization, ownerId: string): Promise<Organization>;
  
  // Membership operations
  getMembership(userId: string, orgId: string): Promise<Membership | undefined>;
  getMembershipsByOrgId(orgId: string): Promise<Membership[]>;
  createMembership(membership: InsertMembership): Promise<Membership>;
  updateMembershipRole(id: string, role: 'OWNER' | 'ADMIN' | 'DEV' | 'VIEWER'): Promise<Membership>;
  deleteMembership(id: string): Promise<void>;
  updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization>;
  deleteOrganization(id: string): Promise<void>;
  
  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByOrgId(orgId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Estate operations
  getEstate(id: string): Promise<Estate | undefined>;
  getEstatesByProjectId(projectId: string): Promise<Estate[]>;
  createEstate(estate: InsertEstate): Promise<Estate>;
  updateEstateStatus(id: string, status: 'idle' | 'crawling' | 'auditing' | 'completed' | 'failed'): Promise<Estate>;
  updateEstateStats(id: string, pagesDiscovered: number, pagesAudited: number): Promise<Estate>;
  deleteEstate(id: string): Promise<void>;
  
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
  deleteScanRun(id: string): Promise<void>;
  
  // A11y Result operations
  getA11yResult(id: string): Promise<A11yResult | undefined>;
  getA11yResultsByPageId(pageId: string): Promise<A11yResult[]>;
  getA11yResultsByEstateId(estateId: string): Promise<A11yResult[]>;
  getA11yResultsByScanRunId(scanRunId: string): Promise<A11yResult[]>;
  createA11yResult(result: InsertA11yResult): Promise<A11yResult>;
  updateIssuesStatus(issueIds: string[], status: string): Promise<void>;
  assignIssues(issueIds: string[], userId: string): Promise<void>;
  updateIssueAISuggestion(issueId: string, suggestion: string): Promise<void>;
  
  // Issue Comments operations
  getIssueComments(issueId: string): Promise<any[]>;
  createIssueComment(comment: { issueId: string; userId: string; comment: string }): Promise<any>;
  
  // A11y Rollup operations
  getA11yRollupByEstateId(estateId: string): Promise<A11yRollup | undefined>;
  upsertA11yRollup(rollup: InsertA11yRollup): Promise<A11yRollup>;
  
  // A11y History operations
  getA11yHistoryByEstateId(estateId: string, limit?: number): Promise<A11yHistory[]>;
  createA11yHistorySnapshot(snapshot: InsertA11yHistory): Promise<A11yHistory>;
  
  // Chat operations
  getChatConversationByUserId(userId: string): Promise<ChatConversation | undefined>;
  createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation>;
  getChatMessages(conversationId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  deleteChatMessages(conversationId: string): Promise<void>;
  
  // External MCP Server operations
  getExternalMcpServers(userId: string): Promise<ExternalMcpServer[]>;
  getExternalMcpServer(id: string): Promise<ExternalMcpServer | undefined>;
  createExternalMcpServer(server: InsertExternalMcpServer): Promise<ExternalMcpServer>;
  updateExternalMcpServer(id: string, server: Partial<InsertExternalMcpServer>): Promise<ExternalMcpServer>;
  updateExternalMcpServerLastConnected(id: string): Promise<void>;
  deleteExternalMcpServer(id: string): Promise<void>;

  // Admin: Global MCP Server operations
  getAllMcpServers(): Promise<McpServer[]>;
  getMcpServer(id: string): Promise<McpServer | undefined>;
  createMcpServer(server: InsertMcpServer): Promise<McpServer>;
  updateMcpServer(id: string, server: Partial<InsertMcpServer>): Promise<McpServer>;
  deleteMcpServer(id: string): Promise<void>;

  // Admin: User management operations
  getAllUsers(limit?: number, offset?: number): Promise<User[]>;
  updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned'): Promise<User>;
  updateUserSystemRole(userId: string, systemRole: 'SUPER_ADMIN' | 'BILLING_ADMIN' | 'SUPPORT_ADMIN' | null): Promise<User>;

  // Admin: Billing operations
  getAllSubscriptions(limit?: number, offset?: number): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  getSubscriptionByUserId(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription>;
  
  getAllInvoices(limit?: number, offset?: number): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoicesByUserId(userId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  
  getAllPayments(limit?: number, offset?: number): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByUserId(userId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // If id is provided, check if user exists
    if (userData.id) {
      const existingUser = await this.getUser(userData.id);
      
      if (existingUser) {
        // Update existing user
        const [user] = await db
          .update(users)
          .set({
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userData.id))
          .returning();
        return user;
      }
    }
    
    // Insert new user
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    } catch (error: any) {
      // If email conflict, just update the user info by email (don't change ID)
      if (error?.code === '23505' && error?.constraint === 'users_email_unique' && userData.email) {
        const [user] = await db
          .update(users)
          .set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return user;
      }
      throw error;
    }
  }

  async updateUser(id: string, data: Partial<Pick<User, 'firstName' | 'lastName' | 'profileImageUrl'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
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

  async deleteMembership(id: string): Promise<void> {
    await db.delete(memberships).where(eq(memberships.id, id));
  }

  async updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization> {
    const [updated] = await db
      .update(organizations)
      .set(org)
      .where(eq(organizations.id, id))
      .returning();
    return updated;
  }

  async deleteOrganization(id: string): Promise<void> {
    await db.delete(organizations).where(eq(organizations.id, id));
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

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
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

  async deleteEstate(id: string): Promise<void> {
    await db.delete(estates).where(eq(estates.id, id));
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
    if (screenshotUrl !== undefined) {
      const [updated] = await db
        .update(pages)
        .set({ isAudited, screenshotUrl })
        .where(eq(pages.id, id))
        .returning();
      return updated;
    } else {
      const [updated] = await db
        .update(pages)
        .set({ isAudited })
        .where(eq(pages.id, id))
        .returning();
      return updated;
    }
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

  async deleteScanRun(id: string): Promise<void> {
    await db.delete(scanRuns).where(eq(scanRuns.id, id));
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

  // User operations (additional)
  async getUsersByOrgId(orgId: string): Promise<User[]> {
    const orgMemberships = await db
      .select()
      .from(memberships)
      .where(eq(memberships.organizationId, orgId));
    
    if (orgMemberships.length === 0) return [];
    
    const userIds = orgMemberships.map(m => m.userId);
    return await db.select().from(users).where(inArray(users.id, userIds));
  }

  // A11y Result operations (additional)
  async getA11yResult(id: string): Promise<A11yResult | undefined> {
    const [result] = await db.select().from(a11yResults).where(eq(a11yResults.id, id));
    return result;
  }

  async updateIssuesStatus(issueIds: string[], status: string): Promise<void> {
    await db
      .update(a11yResults)
      .set({ status: status as any, updatedAt: new Date() })
      .where(inArray(a11yResults.id, issueIds));
  }

  async assignIssues(issueIds: string[], userId: string): Promise<void> {
    await db
      .update(a11yResults)
      .set({ assignedTo: userId, updatedAt: new Date() })
      .where(inArray(a11yResults.id, issueIds));
  }

  async updateIssueAISuggestion(issueId: string, suggestion: string): Promise<void> {
    await db
      .update(a11yResults)
      .set({ aiSuggestion: suggestion, updatedAt: new Date() })
      .where(eq(a11yResults.id, issueId));
  }

  // Issue Comments operations
  async getIssueComments(issueId: string): Promise<IssueComment[]> {
    return await db
      .select()
      .from(issueComments)
      .where(eq(issueComments.issueId, issueId))
      .orderBy(desc(issueComments.createdAt));
  }

  async createIssueComment(comment: { issueId: string; userId: string; comment: string }): Promise<IssueComment> {
    const [newComment] = await db.insert(issueComments).values(comment).returning();
    return newComment;
  }

  // Chat operations
  async getChatConversationByUserId(userId: string): Promise<ChatConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.userId, userId))
      .orderBy(desc(chatConversations.updatedAt))
      .limit(1);
    return conversation;
  }

  async createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation> {
    const [newConversation] = await db.insert(chatConversations).values(conversation).returning();
    return newConversation;
  }

  async getChatMessages(conversationId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async deleteChatMessages(conversationId: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.conversationId, conversationId));
  }

  // External MCP Server operations
  async getExternalMcpServers(userId: string): Promise<ExternalMcpServer[]> {
    return await db
      .select()
      .from(externalMcpServers)
      .where(eq(externalMcpServers.userId, userId))
      .orderBy(desc(externalMcpServers.createdAt));
  }

  async getExternalMcpServer(id: string): Promise<ExternalMcpServer | undefined> {
    const [server] = await db
      .select()
      .from(externalMcpServers)
      .where(eq(externalMcpServers.id, id));
    return server;
  }

  async createExternalMcpServer(server: InsertExternalMcpServer): Promise<ExternalMcpServer> {
    const [newServer] = await db.insert(externalMcpServers).values(server).returning();
    return newServer;
  }

  async updateExternalMcpServer(id: string, server: Partial<InsertExternalMcpServer>): Promise<ExternalMcpServer> {
    const [updated] = await db
      .update(externalMcpServers)
      .set({ ...server, updatedAt: new Date() })
      .where(eq(externalMcpServers.id, id))
      .returning();
    return updated;
  }

  async updateExternalMcpServerLastConnected(id: string): Promise<void> {
    await db
      .update(externalMcpServers)
      .set({ lastConnected: new Date() })
      .where(eq(externalMcpServers.id, id));
  }

  async deleteExternalMcpServer(id: string): Promise<void> {
    await db.delete(externalMcpServers).where(eq(externalMcpServers.id, id));
  }

  // Admin: Global MCP Server operations
  async getAllMcpServers(): Promise<McpServer[]> {
    return await db.select().from(mcpServers).orderBy(desc(mcpServers.createdAt));
  }

  async getMcpServer(id: string): Promise<McpServer | undefined> {
    const [server] = await db.select().from(mcpServers).where(eq(mcpServers.id, id));
    return server;
  }

  async createMcpServer(server: InsertMcpServer): Promise<McpServer> {
    const [newServer] = await db.insert(mcpServers).values(server).returning();
    return newServer;
  }

  async updateMcpServer(id: string, server: Partial<InsertMcpServer>): Promise<McpServer> {
    const [updated] = await db
      .update(mcpServers)
      .set({ ...server, updatedAt: new Date() })
      .where(eq(mcpServers.id, id))
      .returning();
    return updated;
  }

  async deleteMcpServer(id: string): Promise<void> {
    await db.delete(mcpServers).where(eq(mcpServers.id, id));
  }

  // Admin: User management operations
  async getAllUsers(limit: number = 100, offset: number = 0): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.createdAt));
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned'): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateUserSystemRole(userId: string, systemRole: 'SUPER_ADMIN' | 'BILLING_ADMIN' | 'SUPPORT_ADMIN' | null): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ systemRole })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  // Admin: Billing operations
  async getAllSubscriptions(limit: number = 100, offset: number = 0): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(subscriptions.createdAt));
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription;
  }

  async getSubscriptionByUserId(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return subscription;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [newSubscription] = await db.insert(subscriptions).values(subscription).returning();
    return newSubscription;
  }

  async updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription> {
    const [updated] = await db
      .update(subscriptions)
      .set(subscription)
      .where(eq(subscriptions.id, id))
      .returning();
    return updated;
  }

  async getAllInvoices(limit: number = 100, offset: number = 0): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoicesByUserId(userId: string): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const [updated] = await db
      .update(invoices)
      .set(invoice)
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  async getAllPayments(limit: number = 100, offset: number = 0): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(payments.createdAt));
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentsByUserId(userId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }
}

export const storage = new DatabaseStorage();
