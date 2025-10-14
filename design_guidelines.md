# Design Guidelines: Agentic AI Testing Platform

## Design Approach: Professional SaaS Dashboard System
**Selected Approach:** Design System (Material Design + Linear-inspired refinements)
**Justification:** Utility-focused B2B productivity tool requiring information density, consistency, and professional credibility. The "Vially-style UI" reference points toward clean, modern SaaS aesthetics prioritizing data clarity and efficiency.

**Core Principles:**
- **Data Clarity First:** Every design decision serves information comprehension
- **Professional Authority:** Visual design establishes trust and expertise
- **Accessibility Native:** Practice what we preach - WCAG 2.2 AA minimum
- **Scalable Complexity:** Handle dense data without overwhelming users

---

## Color Palette

### Light Mode
- **Background:** 0 0% 100% (pure white)
- **Surface:** 240 5% 96% (subtle gray backgrounds for cards)
- **Border:** 240 6% 90% (soft dividers)
- **Text Primary:** 240 10% 4% (near black)
- **Text Secondary:** 240 4% 46% (medium gray)
- **Primary Brand:** 221 83% 53% (professional blue - trust/tech)
- **Success:** 142 76% 36% (accessibility pass)
- **Warning:** 38 92% 50% (medium severity issues)
- **Error:** 0 84% 60% (critical violations)

### Dark Mode
- **Background:** 240 10% 4% (deep charcoal)
- **Surface:** 240 6% 10% (elevated cards)
- **Border:** 240 4% 16% (subtle separators)
- **Text Primary:** 0 0% 98% (off white)
- **Text Secondary:** 240 5% 65% (muted gray)
- **Primary Brand:** 221 83% 63% (lifted blue for dark)
- **Success:** 142 71% 45% (adjusted for dark)
- **Warning:** 38 90% 60% (visible warning)
- **Error:** 0 72% 65% (softer red for dark)

**Color Philosophy:** Accessibility severity maps to color semantics (green=pass, yellow=warning, red=critical). Minimal accent colors - let data visualization carry the color load.

---

## Typography

### Font Families
- **Primary:** 'Inter' (Google Fonts) - UI text, body copy, data tables
- **Monospace:** 'JetBrains Mono' (Google Fonts) - code snippets, technical output, URLs

### Type Scale
- **Display (Dashboard Headers):** text-3xl font-bold (2rem/3rem)
- **Page Titles:** text-2xl font-semibold (1.5rem/2rem)
- **Section Headers:** text-lg font-medium (1.125rem/1.75rem)
- **Body/Table Content:** text-sm font-normal (0.875rem/1.25rem)
- **Captions/Meta:** text-xs font-medium (0.75rem/1rem)
- **Code/Technical:** text-sm font-mono (0.875rem, monospace)

**Hierarchy Rule:** Use size + weight for hierarchy. Never rely solely on color for importance (accessibility principle).

---

## Layout System

### Spacing Primitives
**Core Units:** 1, 2, 4, 6, 8, 12, 16
- **Micro spacing:** p-1, gap-2 (tight component internals)
- **Component padding:** p-4, p-6 (cards, buttons, inputs)
- **Section spacing:** py-8, py-12 (vertical rhythm)
- **Page margins:** px-6, max-w-7xl mx-auto (content containment)

### Grid Structure
- **Dashboard:** 12-column grid with gap-6
- **Main Layout:** Sidebar (w-64 fixed) + Main (flex-1) + Right Panel (w-80 conditional)
- **Cards:** Consistent border-radius (rounded-lg) with border + shadow-sm
- **Responsive:** Mobile stacks, tablet 2-col, desktop 3-4 col grids

---

## Component Library

### Navigation
- **Top Bar:** Fixed height (h-16), logo left, search center, user menu right, border-b
- **Sidebar:** Collapsible navigation tree, active state with subtle bg + border-l-2 accent
- **Breadcrumbs:** Above page titles for deep navigation, text-sm with chevron separators

### Data Display
- **Dashboard Cards:** White/dark surface, p-6, shadow-sm, rounded-lg
  - Header: Icon + Title + Metric (large text-2xl font-bold)
  - Chart: Recharts area/bar with subtle grid, primary color fills
  - Footer: Trend indicator (↑/↓) + comparison text
  
- **Issues Table:** Striped rows (odd:bg-surface), sticky header, sortable columns
  - Severity badge: Pill shape with semantic colors (critical=red, warning=yellow)
  - Row actions: Hover reveals icon buttons (view, fix, ignore)
  - Expandable rows: Click to show evidence screenshots + fix suggestions
  
- **Stats Grid:** 3-4 column layout showing: Total Issues, Pages Scanned, Pass Rate, Avg Score
  - Each stat: Large number (text-3xl), small label, trend arrow

### Forms & Inputs
- **Text Inputs:** h-10, px-3, border rounded-md, focus:ring-2 ring-primary
- **Dropdowns:** Headless UI combobox, virtualized for large option sets
- **Search:** Prominent search bar with kbd shortcuts (⌘K), instant filtering
- **Buttons:** 
  - Primary: bg-primary text-white px-4 h-10
  - Secondary: border border-border bg-transparent
  - Ghost: Hover state only, no initial background

### Overlays
- **Modals:** Center screen, max-w-2xl, backdrop-blur-sm with bg-black/20
- **Slide-overs:** Right-side panel (w-96), for detail views/filters
- **Tooltips:** Radix UI, subtle shadow, 200ms delay, text-xs

---

## Page-Specific Layouts

### Dashboard (Home)
- **Hero Stats Grid:** 4-column overview (Total Scans, Issues, Pass Rate, Trend)
- **Recent Activity:** Timeline of crawls/audits with status indicators
- **Severity Chart:** Stacked bar showing critical/warning/minor distribution
- **Top Issues:** Ranked list of most frequent violations
- **Quick Actions:** Start new scan, view reports, manage projects

### Issues Table
- **Filter Bar:** Multi-select severity, page selector, date range, search
- **Table Columns:** Severity | Issue Type | Element | Page | Occurrences | Actions
- **Bulk Actions:** Top toolbar for export, assign, mark resolved
- **Pagination:** Bottom, showing "1-50 of 1,247 issues"

### Reports Page
- **Report Grid:** Cards showing past reports with preview, date, scope
- **Generation Form:** Project selector, date range, format (CSV/PDF), sections to include
- **Export Options:** Buttons for immediate download or schedule

### Admin/Settings
- **Tabbed Interface:** Organization, Members, Projects, Integrations, API Keys
- **Member Table:** Avatar, name, email, role dropdown, last active
- **Integration Cards:** Logo, status badge, configure button, test connection

---

## Visual Enhancements

### Micro-interactions
- **Loading States:** Skeleton screens matching content layout (not spinners)
- **Transitions:** 150ms ease for hovers, 200ms for state changes
- **Success Feedback:** Toast notifications (top-right) with auto-dismiss

### Data Visualization
- **Chart Palette:** Use primary + grayscale for single-series, semantic colors for severity data
- **Grid Lines:** Subtle (opacity-20), horizontal only for readability
- **Tooltips:** Show on hover with exact values and percentages

### Accessibility Specifics
- **Focus Indicators:** 2px ring-2 ring-primary ring-offset-2 on all interactive elements
- **Color Independence:** All severity uses icon + color (never color alone)
- **Keyboard Nav:** Visible skip links, roving tabindex for tables/grids
- **Contrast:** Minimum 4.5:1 for normal text, 7:1 preferred for data

---

## Images

**Approach:** Minimal imagery - this is a data-focused tool, not a marketing site.

**Dashboard Empty States:** 
- Illustration: Abstract line art of web accessibility concepts (wcag-style icons)
- Placement: Center of empty dashboard cards with CTA button below
- Style: Monochromatic using primary color, simple 2-3 color max

**No Hero Image:** Skip traditional hero - lead with dashboard data immediately after auth. First-time users see onboarding wizard overlay, not marketing imagery.

**Integration Logos:** Use actual brand logos (Jira, Slack) in integration cards at original dimensions (max h-8)

---

**Execution Notes:** Build with shadcn/ui components as base, customize with Tailwind utilities per these specs. Recharts for all data viz. Ensure responsive mobile views collapse to single column, hide secondary metrics, keep critical data visible.