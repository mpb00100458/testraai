# Agentic AI Testing Platform

## Overview
This **Accessibility Testing Platform** automates WCAG 2.2 compliance auditing for web estates. It enables users to organize projects, run automated accessibility scans using intelligent agents, and review detailed compliance reports with severity-based issue tracking. The core purpose is to provide teams with automated discovery, auditing, and reporting of accessibility violations to ensure web applications meet WCAG standards. The project aims to deliver a comprehensive solution for proactive web accessibility management.

## User Preferences
Preferred communication style: Simple, everyday language.

### UI Terminology
- The application uses "Workspace" terminology in the UI for simpler, more intuitive user experience
- Database tables remain named "organizations" and "memberships" (no schema changes)
- Team member management includes invite by email, role assignment (OWNER/ADMIN/DEV/VIEWER), and workspace access control

## System Architecture

### Frontend Architecture
The frontend is built with **React and TypeScript**, using Vite for development. It leverages **Shadcn/ui** with Radix UI primitives and **Tailwind CSS** for a professional SaaS dashboard aesthetic, emphasizing data clarity and accessibility. **TanStack Query** manages server state with optimistic updates and caching. Wouter handles client-side routing. Key design decisions include a component-driven architecture, type-safe forms with React Hook Form and Zod, responsive design, and built-in WCAG 2.2 AA accessibility.

### Backend Architecture
The backend is a **Node.js Express.js** application written in **TypeScript**. It provides a **RESTful API** with JSON payloads. **Email/password authentication using Passport.js local strategy** handles user authentication with scrypt-based password hashing and PostgreSQL session storage. **Zod schemas** ensure type-safe request/response validation across client and server.

**AI Agent System:** Interactive chatbot for accessibility testing powered by **OpenAI GPT-4o-mini** (via Replit AI Integrations):
- **Natural language interface** for accessibility questions and scan requests
- **Automatic scan triggering** when URLs are detected in user messages
- **Conversation persistence** with chat history stored in PostgreSQL
- **Smart project creation** - auto-creates "AI Agent Scans" workspace and project for AI-triggered scans
- **Seamless integration** - scans triggered by AI appear in existing Projects/Estates structure
- **Context-aware responses** using conversation history for better assistance
- **WCAG guidance** - explains accessibility requirements and provides actionable recommendations
- **External MCP Server Integration** - extends AI agent capabilities with external Model Context Protocol servers:
  - Connect to external MCP servers via SSE, HTTP, or STDIO transport
  - Automatic tool discovery from external servers
  - OpenAI function calling integration for external tool execution
  - UI for managing MCP server connections (add, edit, enable/disable, test, delete)
  - Per-user server configurations with secure header management
  - Real-time tool availability based on enabled servers

**Real-time Communication:** WebSocket server (ws library) provides authenticated real-time scan progress streaming. Session-based authentication verifies connections, and estate-level authorization ensures multi-tenant data isolation. Events are broadcast to subscribed clients for live visual testing feedback.

**Agent Architecture:** AI-powered automated scanning agents perform:
- Web crawling with robots.txt awareness and page discovery.
- Comprehensive **WCAG 2.1 A/AA compliance auditing** using **Playwright and axe-core**, covering automated checks across Level A and AA criteria.
- **Dynamic content handling** with network idle wait and timeout mechanisms for JavaScript-heavy applications.
- **Detailed violation reporting** including rule ID, WCAG reference, severity classification, element selectors, and remediation suggestions.
- **Pass/fail tracking** with comprehensive reporting of passed checks, violations, and incomplete tests.
- **Performance optimized** for 50+ pages per scan with 10-second timeout per page.
- **JSON/HTML export capabilities** generating detailed accessibility reports.
- Severity classification (critical, warning, minor, pass) with impact-based mapping.
- **Real-time progress streaming** via WebSocket events (scan_start, page_discovered, page_testing, page_complete, issue_found, scan_complete, scan_error) for live visual testing interface.
- **Video recording** of entire scan sessions (1280x720 resolution) uploaded to **Replit Object Storage** for persistent access.
- **Playwright trace capture** with full action logging, screenshots, network, and console data uploaded to **Replit Object Storage**.
- **Live screenshot streaming** via WebSocket - captures and broadcasts page screenshots during active scans for real-time visual feedback.
- **Enhanced visual testing modal** displaying live screenshots of pages being tested with real-time progress indicators.
- **Persistent file storage** - Videos (WebM) and traces (ZIP) stored in Replit Object Storage with download links in database.
- **Download capabilities** for scan videos and Playwright traces via dedicated API endpoints served from object storage.

### Data Storage
**PostgreSQL** (via Neon serverless) is the primary database, managed by **Drizzle ORM** for type-safe operations. The schema supports **multi-tenancy** with workspace-based role access control (displayed as "Workspace" in UI, stored as "organizations" in database) and a hierarchical structure for organizations, projects, estates, pages, and accessibility results. Key tables include `users`, `organizations` (workspaces), `memberships` (workspace members), `projects`, `estates`, `pages`, `a11y_results`, `a11y_rollups`, `chat_conversations`, `chat_messages`, `external_mcp_servers`, and `sessions`. Drizzle Kit is used for schema migrations.

**Replit Object Storage** (Google Cloud Storage) stores scan artifacts:
- **Video recordings** - Complete scan session videos (WebM format, 1280x720) at `/objects/scans/{scanRunId}/video.webm`
- **Playwright traces** - Full interaction traces (ZIP format) at `/objects/scans/{scanRunId}/trace.zip`
- **ObjectStorageService** (`server/objectStorage.ts`) handles upload/download operations
- Videos and traces uploaded after scan completion, local temp files cleaned up
- Database stores object storage paths (`/objects/*`) in `video_path` and `trace_path` columns
- Download endpoints serve files directly from object storage with proper authentication

**Workspace Management Features:**
- Create/edit/delete workspaces with name and URL slug
- Invite members by email with role assignment (OWNER, ADMIN, DEV, VIEWER)
- Change member roles (requires OWNER or ADMIN permission)
- Remove members from workspace
- Role-based access control (RBAC) with color-coded badges

## External Dependencies

### Authentication Services
- **Replit Auth (OIDC):** Primary authentication.
- **Passport.js:** Authentication middleware.

### Database Services
- **Neon PostgreSQL:** Serverless PostgreSQL database.
- **Connect-pg-simple:** PostgreSQL session store.

### UI Component Libraries
- **Radix UI:** Unstyled, accessible component primitives.
- **Shadcn/ui:** Pre-styled component patterns.
- **Lucide React:** Icon library.

### Development Tools
- **Vite:** Frontend build tool.
- **Replit Vite Plugins:** Development tooling.
- **Recharts:** Data visualization.

### Utility Libraries
- **date-fns:** Date manipulation.
- **class-variance-authority (CVA):** Type-safe variant styling.
- **clsx/tailwind-merge:** Conditional className composition.
- **nanoid:** Unique ID generation.

### Form Management
- **React Hook Form:** Form state management.
- **@hookform/resolvers:** Integration with Zod.
- **Zod:** Runtime type validation and schema definition.

### API & State
- **TanStack Query:** Server state management.
- **Wouter:** Lightweight routing.

### AI & Machine Learning
- **OpenAI:** AI-powered accessibility analysis via Replit AI Integrations (gpt-4o-mini).
- **Playwright:** Browser automation for real accessibility testing.
- **@axe-core/playwright:** WCAG compliance testing.
- **@modelcontextprotocol/sdk:** MCP client for connecting to external tool servers.