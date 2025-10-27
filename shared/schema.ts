import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  profileImageUrl: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;

// RBAC Role Enum
export const roleEnum = pgEnum('role', ['OWNER', 'ADMIN', 'DEV', 'VIEWER']);

// Organizations table
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// Memberships table (user-org relationship with RBAC)
export const memberships = pgTable("memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull().default('VIEWER'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_memberships_user").on(table.userId),
  index("idx_memberships_org").on(table.organizationId),
]);

export const insertMembershipSchema = createInsertSchema(memberships).omit({
  id: true,
  createdAt: true,
});

export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type Membership = typeof memberships.$inferSelect;

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_projects_org").on(table.organizationId),
]);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Estate Status Enum
export const estateStatusEnum = pgEnum('estate_status', ['idle', 'crawling', 'auditing', 'completed', 'failed']);

// Scan Run Status Enum
export const scanRunStatusEnum = pgEnum('scan_run_status', ['running', 'completed', 'failed']);

// Estates table (test scope)
export const estates = pgTable("estates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  baseUrl: varchar("base_url", { length: 500 }).notNull(),
  status: estateStatusEnum('status').notNull().default('idle'),
  crawlBudget: integer("crawl_budget").notNull().default(100),
  pagesDiscovered: integer("pages_discovered").notNull().default(0),
  pagesAudited: integer("pages_audited").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_estates_project").on(table.projectId),
]);

// Scan Runs table (tracks individual scan executions)
export const scanRuns = pgTable("scan_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estateId: varchar("estate_id").notNull().references(() => estates.id, { onDelete: 'cascade' }),
  status: scanRunStatusEnum('status').notNull().default('running'),
  totalIssues: integer("total_issues").notNull().default(0),
  criticalIssues: integer("critical_issues").notNull().default(0),
  warningIssues: integer("warning_issues").notNull().default(0),
  minorIssues: integer("minor_issues").notNull().default(0),
  passRate: integer("pass_rate").notNull().default(0),
  averageScore: integer("average_score").notNull().default(0),
  pagesAudited: integer("pages_audited").notNull().default(0),
  videoPath: varchar("video_path", { length: 500 }),
  tracePath: varchar("trace_path", { length: 500 }),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_scan_runs_estate").on(table.estateId),
  index("idx_scan_runs_started").on(table.startedAt),
]);

export const insertEstateSchema = createInsertSchema(estates).omit({
  id: true,
  status: true,
  pagesDiscovered: true,
  pagesAudited: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEstate = z.infer<typeof insertEstateSchema>;
export type Estate = typeof estates.$inferSelect;

export const insertScanRunSchema = createInsertSchema(scanRuns).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export type InsertScanRun = z.infer<typeof insertScanRunSchema>;
export type ScanRun = typeof scanRuns.$inferSelect;

// Pages table
export const pages = pgTable("pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estateId: varchar("estate_id").notNull().references(() => estates.id, { onDelete: 'cascade' }),
  url: varchar("url", { length: 3000 }).notNull(),
  title: varchar("title", { length: 500 }),
  isAudited: integer("is_audited").notNull().default(0),
  screenshotUrl: varchar("screenshot_url", { length: 2000 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pages_estate").on(table.estateId),
]);

export const insertPageSchema = createInsertSchema(pages).omit({
  id: true,
  isAudited: true,
  createdAt: true,
});

export type InsertPage = z.infer<typeof insertPageSchema>;
export type Page = typeof pages.$inferSelect;

// Severity Enum
export const severityEnum = pgEnum('severity', ['critical', 'warning', 'minor', 'pass']);

// Issue Status Enum
export const issueStatusEnum = pgEnum('issue_status', ['new', 'in_progress', 'resolved', 'ignored']);

// A11y Results table (accessibility issues)
export const a11yResults = pgTable("a11y_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scanRunId: varchar("scan_run_id").references(() => scanRuns.id, { onDelete: 'cascade' }),
  pageId: varchar("page_id").notNull().references(() => pages.id, { onDelete: 'cascade' }),
  issueType: varchar("issue_type", { length: 255 }).notNull(),
  severity: severityEnum('severity').notNull(),
  wcagCriteria: varchar("wcag_criteria", { length: 100 }),
  element: text("element"),
  elementPosition: text("element_position"),
  description: text("description"),
  suggestion: text("suggestion"),
  codeSnippet: text("code_snippet"),
  impactScore: integer("impact_score"),
  isDuplicate: integer("is_duplicate").notNull().default(0),
  duplicateOfId: varchar("duplicate_of_id"),
  evidenceUrl: varchar("evidence_url", { length: 1000 }),
  status: issueStatusEnum('status').notNull().default('new'),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: 'set null' }),
  aiSuggestion: text("ai_suggestion"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_a11y_results_scan_run").on(table.scanRunId),
  index("idx_a11y_results_page").on(table.pageId),
  index("idx_a11y_results_severity").on(table.severity),
  index("idx_a11y_results_status").on(table.status),
  index("idx_a11y_results_assigned").on(table.assignedTo),
]);

export const insertA11yResultSchema = createInsertSchema(a11yResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertA11yResult = z.infer<typeof insertA11yResultSchema>;
export type A11yResult = typeof a11yResults.$inferSelect;

// A11y Rollups table (aggregated stats)
export const a11yRollups = pgTable("a11y_rollups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estateId: varchar("estate_id").notNull().references(() => estates.id, { onDelete: 'cascade' }),
  totalIssues: integer("total_issues").notNull().default(0),
  criticalIssues: integer("critical_issues").notNull().default(0),
  warningIssues: integer("warning_issues").notNull().default(0),
  minorIssues: integer("minor_issues").notNull().default(0),
  passRate: integer("pass_rate").notNull().default(0),
  averageScore: integer("average_score").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_a11y_rollups_estate").on(table.estateId),
]);

export const insertA11yRollupSchema = createInsertSchema(a11yRollups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertA11yRollup = z.infer<typeof insertA11yRollupSchema>;
export type A11yRollup = typeof a11yRollups.$inferSelect;

// A11y History table (historical snapshots for trend analysis)
export const a11yHistory = pgTable("a11y_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estateId: varchar("estate_id").notNull().references(() => estates.id, { onDelete: 'cascade' }),
  totalIssues: integer("total_issues").notNull().default(0),
  criticalIssues: integer("critical_issues").notNull().default(0),
  warningIssues: integer("warning_issues").notNull().default(0),
  minorIssues: integer("minor_issues").notNull().default(0),
  passRate: integer("pass_rate").notNull().default(0),
  averageScore: integer("average_score").notNull().default(0),
  pagesAudited: integer("pages_audited").notNull().default(0),
  snapshotDate: timestamp("snapshot_date").defaultNow(),
}, (table) => [
  index("idx_a11y_history_estate").on(table.estateId),
  index("idx_a11y_history_date").on(table.snapshotDate),
]);

export const insertA11yHistorySchema = createInsertSchema(a11yHistory).omit({
  id: true,
  snapshotDate: true,
});

export type InsertA11yHistory = z.infer<typeof insertA11yHistorySchema>;
export type A11yHistory = typeof a11yHistory.$inferSelect;

// Issue Comments table (collaboration on issues)
export const issueComments = pgTable("issue_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull().references(() => a11yResults.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_issue_comments_issue").on(table.issueId),
  index("idx_issue_comments_user").on(table.userId),
]);

export const insertIssueCommentSchema = createInsertSchema(issueComments).omit({
  id: true,
  createdAt: true,
});

export type InsertIssueComment = z.infer<typeof insertIssueCommentSchema>;
export type IssueComment = typeof issueComments.$inferSelect;

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  estates: many(estates),
}));

export const estatesRelations = relations(estates, ({ one, many }) => ({
  project: one(projects, {
    fields: [estates.projectId],
    references: [projects.id],
  }),
  pages: many(pages),
  rollups: many(a11yRollups),
  scanRuns: many(scanRuns),
}));

export const scanRunsRelations = relations(scanRuns, ({ one, many }) => ({
  estate: one(estates, {
    fields: [scanRuns.estateId],
    references: [estates.id],
  }),
  results: many(a11yResults),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  estate: one(estates, {
    fields: [pages.estateId],
    references: [estates.id],
  }),
  results: many(a11yResults),
}));

export const a11yResultsRelations = relations(a11yResults, ({ one }) => ({
  scanRun: one(scanRuns, {
    fields: [a11yResults.scanRunId],
    references: [scanRuns.id],
  }),
  page: one(pages, {
    fields: [a11yResults.pageId],
    references: [pages.id],
  }),
}));

export const a11yRollupsRelations = relations(a11yRollups, ({ one }) => ({
  estate: one(estates, {
    fields: [a11yRollups.estateId],
    references: [estates.id],
  }),
}));

// AI Agent Chat Conversations
export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull().default('New Conversation'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_chat_conversations_user").on(table.userId),
  index("idx_chat_conversations_org").on(table.organizationId),
]);

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;

// AI Agent Chat Messages
export const chatMessageRoleEnum = pgEnum('chat_message_role', ['user', 'assistant', 'system']);
export const chatMessageTypeEnum = pgEnum('chat_message_type', ['text', 'scan_result', 'scan_trigger']);

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => chatConversations.id, { onDelete: 'cascade' }),
  role: chatMessageRoleEnum('role').notNull(),
  content: text("content").notNull(),
  messageType: chatMessageTypeEnum('message_type').notNull().default('text'),
  metadata: jsonb("metadata"), // For storing scan IDs, estate IDs, etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_chat_messages_conversation").on(table.conversationId),
]);

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Relations
export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [chatConversations.organizationId],
    references: [organizations.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}));

// External MCP Servers
export const mcpServerTransportEnum = pgEnum('mcp_server_transport', ['stdio', 'sse', 'http']);

export const externalMcpServers = pgTable("external_mcp_servers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  transport: mcpServerTransportEnum('transport').notNull().default('sse'),
  url: text("url").notNull(), // For SSE/HTTP, or command for stdio
  headers: jsonb("headers"), // Optional headers for authentication
  enabled: boolean("enabled").notNull().default(true),
  lastConnected: timestamp("last_connected"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_external_mcp_servers_user").on(table.userId),
  index("idx_external_mcp_servers_org").on(table.organizationId),
]);

export const insertExternalMcpServerSchema = createInsertSchema(externalMcpServers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastConnected: true,
});

export type InsertExternalMcpServer = z.infer<typeof insertExternalMcpServerSchema>;
export type ExternalMcpServer = typeof externalMcpServers.$inferSelect;

// Relations
export const externalMcpServersRelations = relations(externalMcpServers, ({ one }) => ({
  user: one(users, {
    fields: [externalMcpServers.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [externalMcpServers.organizationId],
    references: [organizations.id],
  }),
}));
