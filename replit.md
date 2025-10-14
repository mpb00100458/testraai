# Agentic AI Testing Platform

## Overview

This is an **Accessibility Testing Platform** that automates WCAG 2.2 compliance auditing across web estates. The application enables users to organize projects, run automated accessibility scans using intelligent agents, and review detailed compliance reports with severity-based issue tracking.

**Core Purpose:** Provide teams with automated discovery, auditing, and reporting of accessibility violations to ensure web applications meet WCAG standards.

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