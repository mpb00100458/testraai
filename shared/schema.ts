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
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums - declare before tables
// RBAC Role Enum
export const roleEnum = pgEnum('role', ['OWNER', 'ADMIN', 'DEV', 'VIEWER']);

// System-level Admin Role Enum
export const systemRoleEnum = pgEnum('system_role', ['SUPER_ADMIN', 'BILLING_ADMIN', 'SUPPORT_ADMIN']);

// User Status Enum
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'deleted']);

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
  systemRole: systemRoleEnum('system_role'), // System-level admin role
  status: userStatusEnum('status').notNull().default('active'), // User account status
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

// Scan Run Status Enum
export const scanStatusEnum = pgEnum('scan_status', ['pending', 'running', 'completed', 'failed']);

// Estates table (websites/applications to be tested)
export const estates = pgTable("estates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  baseUrl: text("base_url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_estates_project").on(table.projectId),
]);

export const insertEstateSchema = createInsertSchema(estates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEstate = z.infer<typeof insertEstateSchema>;
export type Estate = typeof estates.$inferSelect;

// Scan Runs table (individual test runs for an estate)
export const scanRuns = pgTable("scan_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estateId: varchar("estate_id").notNull().references(() => estates.id, { onDelete: 'cascade' }),
  status: scanStatusEnum('status').notNull().default('pending'),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  totalPages: integer("total_pages").default(0),
  pagesScanned: integer("pages_scanned").default(0),
  criticalIssues: integer("critical_issues").default(0),
  warningIssues: integer("warning_issues").default(0),
  minorIssues: integer("minor_issues").default(0),
  passedChecks: integer("passed_checks").default(0),
  videoPath: text("video_path"),
  tracePath: text("trace_path"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_scan_runs_estate").on(table.estateId),
  index("idx_scan_runs_status").on(table.status),
]);

export const insertScanRunSchema = createInsertSchema(scanRuns).omit({
  id: true,
  createdAt: true,
});

export type InsertScanRun = z.infer<typeof insertScanRunSchema>;
export type ScanRun = typeof scanRuns.$inferSelect;

// Pages table (individual pages discovered/tested)
export const pages = pgTable("pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estateId: varchar("estate_id").notNull().references(() => estates.id, { onDelete: 'cascade' }),
  url: text("url").notNull(),
  title: varchar("title", { length: 500 }),
  isAudited: integer("is_audited").default(0),
  screenshotUrl: varchar("screenshot_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pages_estate").on(table.estateId),
]);

export const insertPageSchema = createInsertSchema(pages).omit({
  id: true,
  createdAt: true,
});

export type InsertPage = z.infer<typeof insertPageSchema>;
export type Page = typeof pages.$inferSelect;

// Severity Level Enum
export const severityEnum = pgEnum('severity', ['critical', 'serious', 'moderate', 'minor', 'pass']);

// A11y Results table (individual accessibility test results)
export const a11yResults = pgTable("a11y_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scanRunId: varchar("scan_run_id").notNull().references(() => scanRuns.id, { onDelete: 'cascade' }),
  pageId: varchar("page_id").notNull().references(() => pages.id, { onDelete: 'cascade' }),
  ruleId: varchar("rule_id", { length: 255 }).notNull(),
  wcagReference: varchar("wcag_reference", { length: 100 }),
  severity: severityEnum('severity').notNull(),
  impact: varchar("impact", { length: 50 }),
  description: text("description").notNull(),
  helpUrl: text("help_url"),
  elementSelector: text("element_selector"),
  html: text("html"),
  failureSummary: text("failure_summary"),
  occurrenceCount: integer("occurrence_count").default(1),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_a11y_results_scan").on(table.scanRunId),
  index("idx_a11y_results_page").on(table.pageId),
  index("idx_a11y_results_severity").on(table.severity),
]);

export const insertA11yResultSchema = createInsertSchema(a11yResults).omit({
  id: true,
  createdAt: true,
});

export type InsertA11yResult = z.infer<typeof insertA11yResultSchema>;
export type A11yResult = typeof a11yResults.$inferSelect;

// A11y Rollups table (estate-level accessibility summary statistics)
export const a11yRollups = pgTable("a11y_rollups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estateId: varchar("estate_id").notNull().references(() => estates.id, { onDelete: 'cascade' }),
  totalIssues: integer("total_issues").default(0),
  criticalIssues: integer("critical_issues").default(0),
  warningIssues: integer("warning_issues").default(0),
  minorIssues: integer("minor_issues").default(0),
  passedChecks: integer("passed_checks").default(0),
  passRate: integer("pass_rate").default(0),
  averageScore: integer("average_score").default(0),
  lastScanAt: timestamp("last_scan_at"),
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

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  projects: many(projects),
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

// A11y History table (historical accessibility metrics)
export const a11yHistory = pgTable("a11y_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estateId: varchar("estate_id").notNull().references(() => estates.id, { onDelete: 'cascade' }),
  snapshotDate: timestamp("snapshot_date").notNull().defaultNow(),
  averageScore: integer("average_score").default(0),
  totalIssues: integer("total_issues").default(0),
  criticalIssues: integer("critical_issues").default(0),
  warningIssues: integer("warning_issues").default(0),
  minorIssues: integer("minor_issues").default(0),
  passRate: integer("pass_rate").default(0),
  pagesAudited: integer("pages_audited").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_a11y_history_estate").on(table.estateId),
  index("idx_a11y_history_snapshot").on(table.snapshotDate),
]);

export const insertA11yHistorySchema = createInsertSchema(a11yHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertA11yHistory = z.infer<typeof insertA11yHistorySchema>;
export type A11yHistory = typeof a11yHistory.$inferSelect;

// Issue Comments table
export const issueComments = pgTable("issue_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull(), // References a11y_rollups.id
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

// External MCP Servers (User-owned - deprecated in favor of global MCP servers)
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

// ========================================
// ADMIN PANEL TABLES
// ========================================

// Global MCP Servers (Admin-managed, available to all users)
export const mcpServers = pgTable("mcp_servers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  transport: mcpServerTransportEnum('transport').notNull().default('sse'),
  url: text("url").notNull(),
  headers: jsonb("headers"),
  enabled: boolean("enabled").notNull().default(true),
  lastConnected: timestamp("last_connected"),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_mcp_servers_enabled").on(table.enabled),
]);

export const insertMcpServerSchema = createInsertSchema(mcpServers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastConnected: true,
});

export type InsertMcpServer = z.infer<typeof insertMcpServerSchema>;
export type McpServer = typeof mcpServers.$inferSelect;

// Subscription Status Enum
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'unpaid'
]);

// Subscriptions table (organization billing)
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  stripeSubscriptionId: varchar("stripe_subscription_id").unique().notNull(),
  stripeCustomerId: varchar("stripe_customer_id").notNull(),
  stripePriceId: varchar("stripe_price_id").notNull(),
  status: subscriptionStatusEnum('status').notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  canceledAt: timestamp("canceled_at"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_subscriptions_org").on(table.organizationId),
  index("idx_subscriptions_stripe").on(table.stripeSubscriptionId),
  index("idx_subscriptions_status").on(table.status),
]);

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Invoices table
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'open',
  'paid',
  'uncollectible',
  'void'
]);

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id, { onDelete: 'set null' }),
  stripeInvoiceId: varchar("stripe_invoice_id").unique().notNull(),
  stripeCustomerId: varchar("stripe_customer_id").notNull(),
  status: invoiceStatusEnum('status').notNull(),
  amountDue: decimal("amount_due", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull().default('0'),
  currency: varchar("currency", { length: 3 }).notNull().default('usd'),
  hostedInvoiceUrl: text("hosted_invoice_url"),
  invoicePdf: text("invoice_pdf"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_invoices_subscription").on(table.subscriptionId),
  index("idx_invoices_stripe").on(table.stripeInvoiceId),
  index("idx_invoices_status").on(table.status),
]);

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Payments table
export const paymentStatusEnum = pgEnum('payment_status', [
  'succeeded',
  'pending',
  'failed',
  'canceled',
  'refunded'
]);

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id, { onDelete: 'set null' }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id").unique().notNull(),
  status: paymentStatusEnum('status').notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default('usd'),
  paymentMethod: varchar("payment_method", { length: 100 }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payments_invoice").on(table.invoiceId),
  index("idx_payments_stripe").on(table.stripePaymentIntentId),
  index("idx_payments_status").on(table.status),
]);

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Billing Relations
export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));
