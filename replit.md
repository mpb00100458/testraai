# Agentic AI Testing Platform

## Overview
This **Accessibility Testing Platform** automates WCAG 2.2 compliance auditing for web estates. It enables users to organize projects, run automated accessibility scans using intelligent agents, and review detailed compliance reports with severity-based issue tracking. The core purpose is to provide teams with automated discovery, auditing, and reporting of accessibility violations to ensure web applications meet WCAG standards. The project aims to deliver a comprehensive solution for proactive web accessibility management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with **React and TypeScript**, using Vite for development. It leverages **Shadcn/ui** with Radix UI primitives and **Tailwind CSS** for a professional SaaS dashboard aesthetic, emphasizing data clarity and accessibility. **TanStack Query** manages server state with optimistic updates and caching. Wouter handles client-side routing. Key design decisions include a component-driven architecture, type-safe forms with React Hook Form and Zod, responsive design, and built-in WCAG 2.2 AA accessibility.

### Backend Architecture
The backend is a **Node.js Express.js** application written in **TypeScript**. It provides a **RESTful API** with JSON payloads. **Replit Auth using OpenID Connect (OIDC) with Passport.js** handles authentication and session management via express-session and a PostgreSQL store. **Zod schemas** ensure type-safe request/response validation across client and server.

**Real-time Communication:** WebSocket server (ws library) provides authenticated real-time scan progress streaming. Session-based authentication verifies connections, and estate-level authorization ensures multi-tenant data isolation. Events are broadcast to subscribed clients for live visual testing feedback.

**Agent Architecture:** AI-powered automated scanning agents perform:
- Web crawling with robots.txt awareness and page discovery.
- Comprehensive **WCAG 2.2 compliance auditing** using **Playwright and axe-core**, covering 43 automated checks across Level A, AA, and WCAG 2.2 new criteria.
- Severity classification (critical, warning, minor, pass).
- Enhanced detection (8-15 issues per page) with intelligent issue descriptions, code snippet generation, impact scoring, smart deduplication, keyboard navigation analysis, and element position tracking, powered by **OpenAI (gpt-4o-mini)** for analysis, recommendations, and fix suggestions.
- **Real-time progress streaming** via WebSocket events (scan_start, page_discovered, page_testing, page_complete, issue_found, scan_complete, scan_error) for live visual testing interface.

### Data Storage
**PostgreSQL** (via Neon serverless) is the primary database, managed by **Drizzle ORM** for type-safe operations. The schema supports **multi-tenancy** with organization-based role access control and a hierarchical structure for organizations, projects, estates, pages, and accessibility results. Key tables include `users`, `organizations`, `projects`, `estates`, `pages`, `a11y_results`, `a11y_rollups`, and `sessions`. Drizzle Kit is used for schema migrations.

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