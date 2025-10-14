# Agentic AI Testing Platform

## Overview

This is an **Accessibility Testing Platform** that automates WCAG 2.2 compliance auditing across web estates. The application enables users to organize projects, run automated accessibility scans using intelligent agents, and review detailed compliance reports with severity-based issue tracking.

**Core Purpose:** Provide teams with automated discovery, auditing, and reporting of accessibility violations to ensure web applications meet WCAG standards.

## Recent Changes (Latest)

### View Report Feature for Individual Scans (Current)
- **Scan Detail Page**: New dedicated page to view comprehensive details of any historical scan
  - Displays full scan overview with all metrics (status, total issues, critical, warning, minor, pass rate, score)
  - Shows complete list of accessibility issues discovered in that specific scan
  - Search and filter capabilities (by issue type and severity)
  - Color-coded metrics matching the existing design system (green ≥80, yellow 60-79, red <60)
  - Accessible via `/scans/:scanId` route
  
- **Enhanced Scan History Table**: Added "View Report" action button
  - Blue "View" button alongside Excel (green) and PDF (red) download buttons
  - Eye icon for intuitive visual identification
  - Disabled for non-completed scans
  - Table header updated to "Actions" with increased width (300px) to accommodate three buttons
  
- **Robust Error Handling**: Comprehensive error states for better user experience
  - Specific error messages for 401 (session expired - redirects to login), 403 (access denied), 404 (scan not found)
  - Contextual error UI with "Go Back" button
  - Toast notifications for all error conditions
  - Retry disabled to prevent infinite loops
  
- **Navigation Flow**: Seamless navigation between scan history and detailed view
  - Click "View" button in scan history table to navigate to detailed scan report
  - Back button returns to previous page
  - Loading skeletons during data fetch

### Historical Scan Tracking with Version Control (Previous)
- **Complete Scan History Preservation**: All scan data is now permanently preserved with full version control
  - New `scan_runs` table tracks each individual scan execution with timestamps and metrics
  - `a11y_results` linked to specific scan runs via `scanRunId` (nullable for backward compatibility)
  - No scan data is ever deleted - complete historical record maintained
  
- **Scan History UI**: New "History" button on completed estates opens a comprehensive scan history dialog
  - Displays all past scans chronologically with "Latest Scan" label
  - Shows key metrics for each scan: Total Issues, Pass Rate, Score, Pages Audited
  - Visual status indicators (✓ completed, ✗ failed, ⏰ running)
  - Timestamps with "time ago" format for easy reference
  
- **Export Specific Scans**: Export functionality enhanced to support any historical scan
  - Excel and PDF exports accept optional `scanRunId` query parameter
  - Export dropdown in scan history dialog allows downloading specific scan results
  - Maintains backward compatibility - exports latest scan by default if no ID specified
  
- **Scan Comparison Feature**: New comparison view shows differences between any two scans
  - Side-by-side scan overview with metrics for both scans
  - Changes summary showing delta for all key metrics (issues, pass rate, score)
  - Issue type breakdown showing specific changes per accessibility issue type
  - Visual trend indicators (↑ increasing, ↓ decreasing, – no change)
  - Color-coded improvements (green) vs. regressions (red)
  - Accessible via "Compare" button in scan history - select two scans to compare
  
- **API Enhancements**: New endpoints for historical data access
  - `GET /api/estates/:id/scans` - Retrieve all scan runs for an estate
  - `GET /api/scans/:id` - Get detailed results for a specific scan run
  - `GET /api/scans/compare/:id1/:id2` - Compare two scans with computed deltas
  - Export endpoints support `?scanRunId=X` parameter for historical exports
  
- **Storage Layer Updates**: 8 new methods for scan run management
  - `getScanRun()`, `getScanRunsByEstateId()`, `getLatestScanRun()`
  - `createScanRun()`, `updateScanRunStatus()`, `updateScanRunStats()`, `completeScanRun()`
  - `getA11yResultsByScanRunId()` for fetching issues from specific scans
  
- **Agent Integration**: Enhanced scan agent creates scan runs automatically
  - Every scan creates a new scan run record with 'running' status
  - All discovered issues linked to the scan run
  - Scan run updated with final statistics and marked 'completed' or 'failed'
  - Error handling ensures failed scans are properly tracked

### Individual Estate Export Functionality (Previous)
- **Excel Export**: Added individual Excel export for each estate at `/api/estates/:id/report/excel`
  - Two worksheets: Summary (estate metrics) and All Issues (detailed findings)
  - Color-coded severity cells for visual clarity
  - Professional formatting with headers and auto-sized columns
- **PDF Export**: Enhanced existing PDF export functionality for individual estates
- **UI Enhancement**: Project Detail page displays a dropdown menu for each completed estate
- **Comprehensive Reporting**: Each export contains estate-specific data including pass rate, severity breakdown, and detailed issue information with AI-generated suggestions

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React with TypeScript, using Vite as the build tool and development server.

**UI System:** Shadcn/ui component library with Radix UI primitives, styled with Tailwind CSS. The design follows a professional SaaS dashboard aesthetic inspired by Material Design and Linear, emphasizing data clarity and accessibility-first principles.

**State Management:** TanStack Query (React Query) for server state management with optimistic updates and intelligent caching. No global state management library is used - server state is managed through React Query, and local state uses React hooks.

**Routing:** Wouter for lightweight client-side routing.

**Design Tokens:** Custom CSS variables for theming support (light/dark mode), with semantic color mapping for accessibility severity levels (green=pass, yellow=warning, red=critical).

**Key Design Decisions:**
- Component-driven architecture with reusable UI primitives
- Type-safe forms using React Hook Form with Zod validation
- Responsive design with mobile-first approach
- Accessibility built-in (WCAG 2.2 AA minimum standard)

### Backend Architecture

**Runtime:** Node.js with Express.js framework.

**Language:** TypeScript with ES modules.

**API Design:** RESTful API with JSON payloads, organized around resource-based routes:
- Authentication routes (`/api/auth/*`)
- Organization management (`/api/organizations/*`)
- Project management (`/api/projects/*`)
- Estate scanning (`/api/estates/*`)
- Issue tracking (`/api/issues/*`)
- Dashboard analytics (`/api/dashboard/*`)
- Report exports (`/api/reports/*`) - CSV and Excel formats with comprehensive data

**Authentication:** Replit Auth using OpenID Connect (OIDC) with Passport.js strategy. Session management uses express-session with PostgreSQL session store.

**Data Validation:** Zod schemas shared between client and server for type-safe request/response validation.

**Agent Architecture:** AI-powered automated scanning agents provide:
- Web crawling with robots.txt awareness
- Page discovery across estates
- **Comprehensive WCAG 2.2 compliance auditing** with 43 automated checks covering:
  - 16 Level A criteria (missing-alt-text, video-captions, heading-order, keyboard-trap, etc.)
  - 13 Level AA criteria (color-contrast, keyboard-navigation, focus-visible, etc.)
  - 6 WCAG 2.2 new criteria (focus-not-obscured, target-size-minimum, accessible-authentication, etc.)
  - 8 common accessibility issues (aria-labels, empty-button, duplicate-id, etc.)
- Severity classification (critical, warning, minor, pass)
- **Enhanced detection:** 8-15 issues per page for comprehensive results
- **AI Features:**
  - Intelligent issue descriptions with context-aware analysis
  - Code snippet generation showing how to fix issues
  - Impact scoring (1-10 scale) for prioritization
  - Smart deduplication across pages using similarity detection
  - Keyboard navigation analysis
  - Element position tracking for visual feedback

**AI Integration:** Uses OpenAI (via Replit AI Integrations) for:
- Enhanced issue analysis with detailed recommendations
- Automated code fix suggestions
- Duplicate detection across pages
- Impact assessment and prioritization

**Key Design Decisions:**
- Separation of concerns with dedicated storage layer
- Middleware-based request logging and error handling
- Type-safe database operations using Drizzle ORM
- Shared schema definitions between frontend and backend
- Graceful AI fallbacks for resilient scanning

### Data Storage

**Database:** PostgreSQL (via Neon serverless).

**ORM:** Drizzle ORM for type-safe database operations with automatic TypeScript type inference.

**Schema Design:**
- **Multi-tenancy:** Organization-based with role-based access control (OWNER, ADMIN, DEV, VIEWER)
- **Hierarchical structure:** Organizations → Projects → Estates → Pages → Accessibility Results
- **Session storage:** PostgreSQL-backed sessions for Replit Auth
- **User management:** User profiles with OAuth integration

**Key Tables:**
- `users` - User profiles and authentication
- `organizations` - Tenant organizations
- `memberships` - User-organization relationships with roles
- `projects` - Project containers within organizations
- `estates` - Website estates to be scanned
- `pages` - Discovered pages within estates
- `a11y_results` - Individual accessibility violations with AI insights (code snippets, impact scores, deduplication)
- `a11y_rollups` - Aggregated statistics per estate
- `sessions` - Authentication session storage

**Migration Strategy:** Drizzle Kit for schema migrations with `drizzle-kit push` for development.

**Key Design Decisions:**
- Normalized schema with foreign key constraints
- Timestamp tracking (createdAt, updatedAt) on all major entities
- Enum types for severity levels and user roles
- JSON storage for flexible result data structures

## External Dependencies

### Authentication Services
- **Replit Auth (OIDC):** Primary authentication provider using OpenID Connect protocol
- **Passport.js:** Authentication middleware with OpenID Client strategy

### Database Services
- **Neon PostgreSQL:** Serverless PostgreSQL database with WebSocket support
- **Connect-pg-simple:** PostgreSQL session store adapter for Express sessions

### UI Component Libraries
- **Radix UI:** Unstyled, accessible component primitives (@radix-ui/react-*)
- **Shadcn/ui:** Pre-styled component patterns built on Radix UI
- **Lucide React:** Icon library for consistent iconography

### Development Tools
- **Vite:** Frontend build tool with HMR and development server
- **Replit Vite Plugins:** Development tooling including error overlay, cartographer, and dev banner
- **Recharts:** Data visualization library for dashboard charts

### Utility Libraries
- **date-fns:** Date manipulation and formatting
- **class-variance-authority (CVA):** Type-safe variant styling
- **clsx/tailwind-merge:** Conditional className composition
- **nanoid:** Unique ID generation

### Form Management
- **React Hook Form:** Performant form state management
- **@hookform/resolvers:** Integration between React Hook Form and Zod
- **Zod:** Runtime type validation and schema definition

### API & State
- **TanStack Query:** Server state management with caching and synchronization
- **Wouter:** Lightweight routing library for React

### AI & Machine Learning
- **OpenAI:** AI-powered accessibility analysis via Replit AI Integrations
  - Uses gpt-4o-mini model for cost-effective analysis
  - No API key required (billed to Replit credits)
  - Graceful fallbacks for resilient operation