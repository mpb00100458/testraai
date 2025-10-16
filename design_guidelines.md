# Design Guidelines: TestraAI - Premium Accessibility Testing Platform

## Design Approach: Modern Clean SaaS System
**Selected Approach:** Clean Light Design (Aikido/Linear inspired)
**Justification:** Professional B2B productivity tool demanding data clarity with clean aesthetic. Light-first design establishes modern, accessible tool credibility while gradient accents add premium visual interest without sacrificing information density.

**Core Principles:**
- **Light-First Clean:** Sophisticated white UI with colorful gradient accents
- **Data Clarity:** Clean table layouts enhance hierarchy and readability
- **Modern Polish:** Every pixel communicates professional simplicity
- **Smart Use of Color:** Gradient colors for branding and interactive elements

---

## Color Palette

### Light Mode (Primary)
- **Background Base:** 0 0% 100% (pure white)
- **Background Elevated:** 240 5% 98% (subtle gray for cards)
- **Surface:** 0 0% 99% (card backgrounds)
- **Border Subtle:** 240 6% 90% (soft separators)
- **Border Accent:** 240 5% 84% (defined borders)
- **Text Primary:** 240 10% 10% (almost black)
- **Text Secondary:** 240 4% 46% (muted gray)
- **Text Tertiary:** 240 3% 62% (deemphasized)

**Brand & Interactive Colors (Gradient-based):**
- **Primary (Purple):** 258 90% 66% (vivid purple for actions)
- **Primary Light:** 258 90% 95% (light purple backgrounds)
- **Secondary (Indigo):** 243 75% 59% (supporting accent)
- **Success:** 142 71% 45% (passes/resolved)
- **Warning:** 38 90% 60% (moderate issues)
- **Critical:** 0 72% 65% (violations/errors)
- **AI Accent:** 280 85% 70% (AI-powered features)

**Gradient System (Keep for Logo & Buttons):**
- **Logo Gradient:** `from-purple-600 via-indigo-500 to-purple-600`
- **Button Gradient:** `from-purple-600 to-indigo-600` (purple-to-pink gradient)
- **Border Gradient:** `from-primary/50 via-secondary/30 to-transparent`
- **Glow Effect:** `shadow-lg shadow-primary/25` on hover

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
- **Card Radius:** rounded-lg (8px) for clean modern feel

---

## Component Library

### Clean Cards
**Base Style:**
```
bg-white
border border-border-subtle
shadow-sm
rounded-lg
hover:shadow-md transition-shadow
```
**Variants:**
- **Dashboard Stats:** p-6, gradient button for actions, large metric display, trend indicator
- **Data Cards:** p-4, hover elevation, smooth transition
- **Table Cards:** White background, bordered rows, clean spacing

### Navigation
- **Sidebar:** Fixed, collapsible, active state: `bg-primary/10 border-l-2 border-primary`
- **Top Bar:** h-16, white background, logo left (with gradient), global search center, user avatar right
- **Tabs:** Underline style with `border-b-2 border-primary` active state

### Data Visualization
**Dashboard Cards:**
- **Metric Display:** Icon (lucide) + Label (text-sm) + Value (text-5xl font-bold) + Trend
- **Mini Charts:** Recharts area with gradient fill (`fill-primary/20 stroke-primary`)
- **Severity Badges:** Purple pill badges with percentages (100%, 79%, 49%)

**Issues Table:**
- **Header:** Sticky, white background, sortable columns with arrow indicators
- **Rows:** Clean white background, hover: `bg-gray-50`, expandable for details
- **Columns:** Severity Badge | Issue Type | Element (mono font) | Page | Count | Actions
- **Bulk Actions:** Top toolbar with checkboxes, export/assign/resolve buttons

### Forms & Inputs
**Input Fields:**
```
h-11 px-4
bg-white
border border-border-subtle
focus:border-primary focus:ring-2 focus:ring-primary/20
rounded-lg
text-primary placeholder:text-tertiary
```

**Buttons:**
- **Primary (Gradient):** `bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white shadow-lg shadow-primary/25 h-11 px-6 rounded-lg font-medium`
- **Secondary:** `border border-border-accent bg-white hover:bg-gray-50`
- **Ghost:** `hover:bg-gray-100 text-secondary hover:text-primary`
- **AI Button:** `bg-gradient-to-r from-purple-600 to-indigo-600` with sparkle icon
- **Badge Pills:** `bg-primary text-white rounded-full px-3 py-1` for percentages

### Overlays
- **Modals:** Center, max-w-2xl, white card with shadow-xl
- **Slide-overs:** Right panel w-96, white surface, slide-in animation (300ms ease)
- **Toasts:** Top-right, white cards with status icon, auto-dismiss 4s

---

## Visual Effects

**Clean Design Implementation:**
- Cards: `bg-white` + `shadow-sm` + subtle border
- Panels: White backgrounds with clean borders
- Hover states: Add `shadow-md` elevation effect

**Gradient Accents (Strategic Use):**
- **Logo:** Always uses gradient colors (purple to indigo)
- **Primary Buttons:** Gradient background with glow effect
- **AI Features:** Gradient buttons with sparkle icon
- **Status Badges:** Purple gradient pills for percentages

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
- Each: White card, large metric (text-5xl), trend arrow, mini sparkline chart

**Category Table (Like Screenshot):**
- Left column: Colorful icon + category name (Code, Build, Artifacts, Cloud)
- Middle columns: Tools/stats with icons
- Right columns: Purple percentage badges (100%, 79%, 49%)
- Clean white rows with subtle borders

**Real-Time Activity Feed:**
- Left column (w-2/3): Live scan results with WebSocket updates, animated new entries
- Right column (w-1/3): Team activity, recent fixes, collaboration updates

**Statistics Panels:**
- Three sections: PREVENTED | DETECTED | REMEDIATED
- Large numbers with colored progress bars below
- Clean white backgrounds with subtle shadows

### Issues Explorer
**Filter Bar:** White panel, sticky top, multi-select dropdowns (severity, page, element type), search with ⌘K
**Table:** Full-width, clean white background, bordered rows show:
- Screenshot thumbnail
- Code snippet (syntax highlighted)
- AI-generated fix suggestion with gradient "AI Fix" button
- Resolution history timeline

### Reports & Analytics
**Report Grid:** 3-column masonry layout, white cards with:
- Report preview (mini chart visualization)
- Date range, scope, compliance score badge
- Download/Share/Schedule gradient buttons

**Compliance Dashboard:**
- WCAG 2.2 level overview (A, AA, AAA) with circular progress indicators
- Heat map showing issue distribution across pages
- Export to PDF with branded template

### Team & Settings
**Member Management:**
- Avatar grid with white cards, role badges, status indicators (online/offline)
- Invite modal with role selector, permission matrix

**Integrations:**
- Card grid: Service logo, connection status badge, configure button
- OAuth flow for Jira, Slack, GitHub with real-time test connection

---

## Images

**Strategy:** Minimal, strategic imagery for empty states and onboarding only.

**Logo:** Always uses gradient colors (purple to indigo gradient text or graphic)

**Empty State Illustrations:**
- **First Scan:** Abstract line art of accessibility tree (purple/indigo gradient)
- **No Issues:** Celebration graphic (simple geometric shapes, brand colors)
- **Integration Empty:** Service-specific iconography (monochromatic, h-16)
- **Placement:** Center of empty cards with CTA below, max-w-xs

**Integration Logos:** Actual brand logos in original colors (Jira, Slack, GitHub) at h-8, displayed in connection cards.

**Team Avatars:** Use Gravatar or custom uploads, rounded-full, ring-2 ring-primary/20 on active users.

---

**Technical Implementation:** Build with Radix UI primitives, Tailwind custom config for gradient utilities, Recharts for visualization, Framer Motion for micro-interactions. Ensure WCAG 2.2 AA compliance - all effects maintain 4.5:1 text contrast minimum.
