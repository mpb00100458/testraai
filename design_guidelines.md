# Design Guidelines: TestraAI - Premium Accessibility Testing Platform

## Design Approach: Modern Developer SaaS System
**Selected Approach:** Design System (Linear + Vercel inspired refinements)
**Justification:** Professional B2B productivity tool demanding data clarity with premium aesthetic. Dark-first design establishes modern developer tool credibility while glassmorphic elements add depth without sacrificing information density.

**Core Principles:**
- **Dark-First Premium:** Sophisticated dark UI with strategic light accents
- **Data Clarity with Depth:** Glassmorphic layers enhance hierarchy without distraction
- **Enterprise Polish:** Every pixel communicates professional authority
- **Intelligent Density:** Dense data presentation with breathing room

---

## Color Palette

### Dark Mode (Primary)
- **Background Base:** 245 15% 8% (deep indigo-tinted charcoal)
- **Background Elevated:** 245 12% 12% (raised surfaces)
- **Glass Surface:** 245 10% 16% with 40% opacity (glassmorphic cards)
- **Border Subtle:** 245 8% 20% (soft separators)
- **Border Accent:** 245 60% 40% at 30% opacity (glass edges)
- **Text Primary:** 0 0% 98% (crisp white)
- **Text Secondary:** 245 5% 65% (muted gray)
- **Text Tertiary:** 245 4% 50% (deemphasized)

**Brand & Status Colors:**
- **Primary (Purple):** 258 90% 66% (vivid purple for actions)
- **Primary Glow:** 258 90% 66% at 20% opacity (button halos)
- **Secondary (Indigo):** 243 75% 59% (supporting accent)
- **Success:** 142 71% 45% (passes/resolved)
- **Warning:** 38 90% 60% (moderate issues)
- **Critical:** 0 72% 65% (violations/errors)
- **AI Accent:** 280 85% 70% (AI-powered features)

### Light Mode (Secondary)
- **Background:** 0 0% 99%
- **Surface:** 245 30% 96%
- **Text Primary:** 245 15% 15%
- **Primary:** 258 85% 58% (adjusted purple)

**Gradient System:**
- **Hero Gradient:** `from-[245_15%_8%] via-[258_40%_12%] to-[245_15%_8%]`
- **Card Glow:** Radial gradient `from-primary/10 to-transparent` on hover
- **Border Gradient:** `from-primary/50 via-secondary/30 to-transparent`

---

## Typography

**Font Families:**
- **Primary:** 'Inter Variable' (system: -apple-system, Inter, sans-serif)
- **Monospace:** 'JetBrains Mono' (code, technical data)

**Type Scale:**
- **Dashboard Title:** text-4xl font-bold tracking-tight (2.25rem)
- **Section Headers:** text-xl font-semibold (1.25rem)
- **Card Titles:** text-lg font-medium (1.125rem)
- **Body/Data:** text-sm font-normal (0.875rem)
- **Metrics (Large):** text-5xl font-bold tabular-nums (3rem)
- **Labels/Meta:** text-xs font-medium uppercase tracking-wide (0.75rem)
- **Code/URLs:** text-sm font-mono (monospace)

**Hierarchy:** Combine weight + letter-spacing + size. Use `tracking-tight` for display text, `tracking-wide` for uppercase labels.

---

## Layout System

**Spacing Primitives:** 2, 4, 6, 8, 12, 16, 20, 24
- **Micro:** gap-2, p-2 (tight internals)
- **Component:** p-4, p-6 (card padding)
- **Sections:** py-8, py-12, py-16 (vertical rhythm)
- **Container:** px-6, max-w-[1400px] mx-auto (wide dashboard layout)

**Grid Structure:**
- **Main Layout:** Sidebar (w-64) + Content (flex-1) + Inspector Panel (w-96 slide-over)
- **Dashboard Grid:** grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- **Data Tables:** Full width with horizontal scroll, sticky headers
- **Card Radius:** rounded-xl (12px) for premium feel

---

## Component Library

### Glassmorphic Cards
**Base Style:**
```
bg-glass (245 10% 16% / 40%)
backdrop-blur-xl
border border-border-subtle
shadow-2xl shadow-black/20
rounded-xl
```
**Variants:**
- **Dashboard Stats:** p-6, gradient border top, large metric display, trend indicator
- **Data Cards:** p-4, hover glow effect (ring-1 ring-primary/20), smooth transition
- **Glass Panel:** Floating panels with `bg-elevated/60 backdrop-blur-2xl`

### Navigation
- **Sidebar:** Fixed, collapsible, active state: `bg-primary/10 border-l-2 border-primary`
- **Top Bar:** h-16, glass effect, logo left, global search center, user avatar right
- **Tabs:** Underline style with `border-b-2 border-primary` active state

### Data Visualization
**Dashboard Cards:**
- **Metric Display:** Icon (lucide) + Label (text-sm) + Value (text-5xl font-bold) + Trend
- **Mini Charts:** Recharts area with gradient fill (`fill-primary/20 stroke-primary`)
- **Severity Badges:** Pill shape, semantic colors, icons included (never color alone)

**Issues Table:**
- **Header:** Sticky, glass surface, sortable columns with arrow indicators
- **Rows:** Striped (`odd:bg-white/5`), hover: `bg-primary/5`, expandable for details
- **Columns:** Severity Badge | Issue Type | Element (mono font) | Page | Count | Actions
- **Bulk Actions:** Top toolbar with checkboxes, export/assign/resolve buttons

### Forms & Inputs
**Input Fields:**
```
h-11 px-4
bg-elevated/50 backdrop-blur
border border-border-subtle
focus:border-primary focus:ring-2 focus:ring-primary/20
rounded-lg
text-primary placeholder:text-tertiary
```

**Buttons:**
- **Primary:** `bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 h-11 px-6 rounded-lg font-medium`
- **Secondary:** `border border-border-accent bg-elevated/50 backdrop-blur hover:bg-elevated`
- **Ghost:** `hover:bg-white/5 text-secondary hover:text-primary`
- **AI Button:** `bg-gradient-to-r from-primary to-ai-accent` with sparkle icon

### Overlays
- **Modals:** Center, max-w-2xl, glass panel with `backdrop-blur-xl bg-black/50` backdrop
- **Slide-overs:** Right panel w-96, glass surface, slide-in animation (300ms ease)
- **Toasts:** Top-right, glass cards with status icon, auto-dismiss 4s

---

## Visual Effects

**Glassmorphism Implementation:**
- Cards: `backdrop-blur-xl` + `bg-surface/40` + subtle border
- Panels: `backdrop-blur-2xl` + `bg-elevated/60` for floating elements
- Hover states: Add `ring-1 ring-primary/20` glow effect

**Gradient Accents:**
- **Background:** Subtle radial gradient `from-primary/5 via-transparent to-secondary/5` on page backgrounds
- **Borders:** Linear gradient borders on premium cards using `border-image` or pseudo-elements
- **Button Glow:** `shadow-lg shadow-primary/25` on primary buttons

**Animations (Minimal):**
- **Loading:** Skeleton screens with shimmer gradient animation
- **Transitions:** 200ms ease for state changes, 150ms for hovers
- **Success:** Subtle scale + fade for completed actions
- **Charts:** 400ms ease-in-out for data updates

---

## Page-Specific Layouts

### Dashboard (Home)
**Hero Stats Grid (4-col):**
- Total Issues Scanned | Pass Rate % | Critical Issues | AI Suggestions
- Each: Glass card, large metric (text-5xl), trend arrow, mini sparkline chart

**Real-Time Activity Feed:**
- Left column (w-2/3): Live scan results with WebSocket updates, animated new entries
- Right column (w-1/3): Team activity, recent fixes, collaboration updates

**Severity Distribution Chart:**
- Stacked area chart showing critical/warning/minor over time
- Gradient fills with transparency, interactive tooltips

**AI Insights Panel:**
- Glass card with gradient border, AI icon, suggested fixes ranked by impact
- "Apply Fix" buttons with shimmer effect

### Issues Explorer
**Filter Bar:** Glass panel, sticky top, multi-select dropdowns (severity, page, element type), search with ⌘K
**Table:** Full-width, virtualized scroll (react-window), expandable rows show:
- Screenshot thumbnail
- Code snippet (syntax highlighted with prism.js)
- AI-generated fix suggestion with "Copy" button
- Resolution history timeline

### Reports & Analytics
**Report Grid:** 3-column masonry layout, glass cards with:
- Report preview (mini chart visualization)
- Date range, scope, compliance score badge
- Download/Share/Schedule buttons

**Compliance Dashboard:**
- WCAG 2.2 level overview (A, AA, AAA) with circular progress indicators
- Heat map showing issue distribution across pages
- Export to PDF with branded template

### Team & Settings
**Member Management:**
- Avatar grid with glass cards, role badges, status indicators (online/offline)
- Invite modal with role selector, permission matrix

**Integrations:**
- Card grid: Service logo, connection status badge, configure button
- OAuth flow for Jira, Slack, GitHub with real-time test connection

---

## Images

**Strategy:** Minimal, strategic imagery for empty states and onboarding only.

**No Hero Image:** Dashboard-first approach - users land directly in data interface post-auth.

**Empty State Illustrations:**
- **First Scan:** Abstract line art of accessibility tree (purple/indigo gradient)
- **No Issues:** Celebration graphic (simple geometric shapes, brand colors)
- **Integration Empty:** Service-specific iconography (monochromatic, h-16)
- **Placement:** Center of empty cards with CTA below, max-w-xs

**Integration Logos:** Actual brand logos in original colors (Jira, Slack, GitHub) at h-8, displayed in connection cards.

**Team Avatars:** Use Gravatar or custom uploads, rounded-full, ring-2 ring-primary/20 on active users.

---

**Technical Implementation:** Build with Radix UI primitives, Tailwind custom config for glass utilities, Recharts for visualization, Framer Motion for micro-interactions. Ensure WCAG 2.2 AA compliance - all glass effects maintain 4.5:1 text contrast minimum.