import PDFDocument from 'pdfkit';

export function generateDocumentationPDF(): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });

  // Title Page
  doc.fontSize(32).fillColor('#7C3AED').text('TestraAI', { align: 'center' });
  doc.fontSize(18).fillColor('#6B7280').text('Documentation & Implementation Guide', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(10).fillColor('#9CA3AF').text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.addPage();

  // Table of Contents
  doc.fontSize(24).fillColor('#111827').text('Table of Contents');
  doc.moveDown();
  doc.fontSize(12).fillColor('#374151');
  const toc = [
    '1. Overview',
    '2. System Architecture',
    '3. Technology Stack',
    '4. Project Structure',
    '5. Database Schema',
    '6. API Endpoints',
    '7. Frontend Components',
    '8. Authentication System',
    '9. AI Agent Features',
    '10. Scanning System',
    '11. Real-time WebSocket',
    '12. Object Storage',
    '13. Development Workflow'
  ];
  toc.forEach(item => doc.text(item).moveDown(0.5));
  doc.addPage();

  // 1. Overview
  addSection(doc, '1. Overview', [
    'TestraAI is an Accessibility Testing Platform that automates WCAG 2.2 compliance auditing for web estates.',
    '',
    'Core Purpose:',
    '• Automated discovery and auditing of accessibility violations',
    '• Detailed compliance reporting with severity-based issue tracking',
    '• AI-powered chatbot for interactive accessibility testing',
    '• Real-time scan monitoring with WebSocket streaming',
    '',
    'Key Features:',
    '• Multi-tenant workspace management with RBAC',
    '• Automated WCAG 2.1 A/AA compliance scanning',
    '• AI Agent chatbot powered by OpenAI GPT-4o-mini',
    '• Real-time scan progress with live screenshots',
    '• Video recording and Playwright trace capture',
    '• Persistent cloud storage for scan artifacts',
    '• Team collaboration with role-based access control'
  ]);

  // 2. System Architecture
  addSection(doc, '2. System Architecture', [
    'Frontend Architecture:',
    '• React with TypeScript and Vite',
    '• Shadcn/ui component library with Radix UI primitives',
    '• Tailwind CSS for styling',
    '• TanStack Query for server state management',
    '• Wouter for client-side routing',
    '• React Hook Form + Zod for type-safe forms',
    '',
    'Backend Architecture:',
    '• Node.js Express.js with TypeScript',
    '• RESTful API with JSON payloads',
    '• Passport.js for authentication (local + Replit OIDC)',
    '• PostgreSQL with Drizzle ORM',
    '• WebSocket server for real-time updates',
    '• OpenAI integration for AI chatbot',
    '',
    'Data Storage:',
    '• PostgreSQL (Neon serverless) - Primary database',
    '• Replit Object Storage - Scan videos and traces',
    '• Session store - PostgreSQL with connect-pg-simple'
  ]);

  // 3. Technology Stack
  addSection(doc, '3. Technology Stack', [
    'Frontend:',
    '• React 18, TypeScript, Vite',
    '• Shadcn/ui, Radix UI, Tailwind CSS',
    '• TanStack Query v5, Wouter',
    '• React Hook Form, Zod validation',
    '• Lucide React icons',
    '',
    'Backend:',
    '• Node.js 20, Express.js, TypeScript',
    '• Passport.js, express-session',
    '• Drizzle ORM, Neon PostgreSQL',
    '• WebSocket (ws library)',
    '',
    'AI & Testing:',
    '• OpenAI GPT-4o-mini (via Replit AI)',
    '• Playwright browser automation',
    '• @axe-core/playwright for WCAG testing',
    '',
    'Cloud Services:',
    '• Replit Object Storage (Google Cloud Storage)',
    '• Neon PostgreSQL (serverless)'
  ]);

  // 4. Project Structure
  addSection(doc, '4. Project Structure', [
    'Root Structure:',
    '├── client/          # Frontend React application',
    '│   └── src/',
    '│       ├── components/  # Reusable UI components',
    '│       ├── hooks/       # Custom React hooks',
    '│       ├── lib/         # Utilities & config',
    '│       ├── pages/       # Page components',
    '│       └── App.tsx      # Main app with routes',
    '├── server/          # Backend Express application',
    '│   ├── agents/          # AI scanning agents',
    '│   ├── ai-agent.ts      # OpenAI chatbot logic',
    '│   ├── auth.ts          # Passport.js local auth',
    '│   ├── replitAuth.ts    # Replit OIDC auth',
    '│   ├── routes.ts        # API endpoints',
    '│   ├── storage.ts       # Data access layer',
    '│   ├── websocket.ts     # WebSocket server',
    '│   └── objectStorage.ts # Object storage',
    '├── shared/          # Shared code',
    '│   └── schema.ts        # DB schema + Zod',
    '└── design_guidelines.md # UI/UX design system'
  ]);

  // 5. Database Schema
  addSection(doc, '5. Database Schema', [
    'Core Tables:',
    '',
    'users:',
    '• id (varchar, UUID primary key)',
    '• email (unique, required)',
    '• password (hashed with scrypt)',
    '• firstName, lastName',
    '• profileImageUrl',
    '• createdAt, updatedAt',
    '',
    'organizations (Workspaces):',
    '• id, name, slug (unique)',
    '• Multi-tenant workspace containers',
    '',
    'memberships (Team):',
    '• userId, organizationId',
    '• role (OWNER/ADMIN/DEV/VIEWER)',
    '• RBAC for workspace access',
    '',
    'projects:',
    '• id, organizationId',
    '• name, description',
    '• Groups estates for testing',
    '',
    'estates (Websites):',
    '• id, projectId, baseUrl',
    '• status (idle/crawling/auditing/completed/failed)',
    '• pagesDiscovered, pagesAudited',
    '',
    'scan_runs:',
    '• id, estateId',
    '• status, totalPages, totalIssues',
    '• videoPath, tracePath (Object Storage)',
    '',
    'pages:',
    '• id, estateId, url',
    '• Discovered pages during crawl',
    '',
    'a11y_results:',
    '• id, pageId, scanRunId',
    '• ruleId, wcagReference, severity',
    '• element, recommendation',
    '',
    'a11y_rollups:',
    '• id, estateId, scanRunId',
    '• Aggregated statistics per scan',
    '',
    'chat_conversations & chat_messages:',
    '• AI Agent chat history persistence'
  ]);

  // 6. API Endpoints
  addSection(doc, '6. API Endpoints', [
    'Authentication:',
    '• GET  /api/user           - Get current user',
    '• POST /api/register       - Create account',
    '• POST /api/login          - Local login',
    '• GET  /api/login          - Replit Auth login',
    '• POST /api/logout         - Sign out',
    '',
    'Workspaces:',
    '• GET    /api/organizations     - List workspaces',
    '• POST   /api/organizations     - Create workspace',
    '• PATCH  /api/organizations/:id - Update workspace',
    '• DELETE /api/organizations/:id - Delete workspace',
    '',
    'Projects:',
    '• GET    /api/projects     - List projects',
    '• POST   /api/projects     - Create project',
    '• DELETE /api/projects/:id - Delete project',
    '',
    'Estates (Websites):',
    '• GET  /api/estates          - List websites',
    '• POST /api/estates          - Add website',
    '• GET  /api/estates/:id/scans - Get scan history',
    '• POST /api/estates/:id/scan  - Trigger scan',
    '',
    'Scans & Results:',
    '• GET /api/scans/:id/video  - Download video',
    '• GET /api/scans/:id/trace  - Download trace',
    '• GET /api/scan-runs/:id    - Get scan details',
    '• GET /api/issues           - List all issues',
    '',
    'AI Agent:',
    '• GET    /api/ai-agent/conversation - Get chat',
    '• POST   /api/ai-agent/chat         - Send message',
    '• DELETE /api/ai-agent/conversation - Clear chat',
    '',
    'Team Management:',
    '• GET    /api/organizations/:id/members - List members',
    '• POST   /api/organizations/:id/invite  - Invite member',
    '• PATCH  /api/memberships/:id/role      - Change role',
    '• DELETE /api/memberships/:id           - Remove member'
  ]);

  // 7. Frontend Components
  addSection(doc, '7. Frontend Components', [
    'Key Pages:',
    '• Landing.tsx       - Marketing page with feature carousel',
    '• Dashboard.tsx     - Main dashboard with stats',
    '• Projects.tsx      - Project list and management',
    '• ProjectDetail.tsx - Project details with estates',
    '• AIAgent.tsx       - ChatGPT-style AI chatbot',
    '• Issues.tsx        - Accessibility issues tracker',
    '• Workspace.tsx     - Team management',
    '• Settings.tsx      - User profile settings',
    '',
    'Core Components:',
    '• AppSidebar.tsx         - Main navigation sidebar',
    '• GradientButton.tsx     - Branded CTA button',
    '• ScanHistoryTable.tsx   - Scan results table',
    '• VisualTestingModal.tsx - Live scan monitoring',
    '',
    'UI Components (Shadcn/ui):',
    '• Button, Card, Dialog, Form',
    '• Table, Badge, Avatar, Tabs',
    '• Select, Input, Textarea',
    '• Toast, Skeleton, Separator'
  ]);

  // 8. Authentication System
  addSection(doc, '8. Authentication System', [
    'Dual Authentication:',
    '',
    '1. Replit Auth (OIDC):',
    '   • Primary authentication method',
    '   • OAuth 2.0 flow with OpenID Connect',
    '   • Auto-creates users from OIDC claims',
    '   • Session-based with PostgreSQL storage',
    '   • File: server/replitAuth.ts',
    '',
    '2. Local Authentication:',
    '   • Email/password with Passport.js',
    '   • Scrypt password hashing',
    '   • Session persistence in PostgreSQL',
    '   • File: server/auth.ts',
    '',
    'Demo Credentials:',
    '• Email: demo@testraai.com',
    '• Password: Demo123456',
    '',
    'Session Management:',
    '• PostgreSQL session store (connect-pg-simple)',
    '• Session secret for encryption',
    '• Automatic session refresh',
    '• Logout clears session data'
  ]);

  // 9. AI Agent Features
  addSection(doc, '9. AI Agent Features', [
    'OpenAI Integration:',
    '• GPT-4o-mini model via Replit AI Integrations',
    '• Natural language accessibility guidance',
    '• Automatic URL detection and scan triggering',
    '• Conversation context awareness',
    '',
    'Smart Features:',
    '• Auto-creates "AI Agent Scans" workspace/project',
    '• Seamlessly integrates with Projects/Estates',
    '• Explains WCAG requirements',
    '• Provides actionable recommendations',
    '• Streaming responses for better UX',
    '',
    'Chat Persistence:',
    '• Conversations stored in PostgreSQL',
    '• Message history with timestamps',
    '• User-specific chat sessions',
    '• Clear conversation option',
    '',
    'Implementation:',
    '• File: server/ai-agent.ts',
    '• Frontend: client/src/pages/AIAgent.tsx',
    '• Database tables: chat_conversations, chat_messages'
  ]);

  // 10. Scanning System
  addSection(doc, '10. Scanning System', [
    'Automated Web Crawler:',
    '• Playwright browser automation',
    '• Respects robots.txt',
    '• Discovers pages via link analysis',
    '• Handles dynamic content (JavaScript)',
    '• 10-second timeout per page',
    '',
    'WCAG Compliance Testing:',
    '• @axe-core/playwright integration',
    '• WCAG 2.1 Level A/AA automated checks',
    '• Detailed violation reporting',
    '• Element selectors for precise location',
    '• Remediation suggestions',
    '',
    'Severity Classification:',
    '• Critical - Major accessibility barriers',
    '• Warning - Moderate issues',
    '• Minor - Low-impact violations',
    '• Pass - Successful checks',
    '',
    'Scan Artifacts:',
    '• Video recording (WebM, 1280x720)',
    '• Playwright traces (ZIP with full logs)',
    '• Screenshot captures',
    '• Network and console logs',
    '',
    'Performance:',
    '• Optimized for 50+ pages per scan',
    '• Parallel page processing',
    '• Automatic retry on failures',
    '',
    'Implementation:',
    '• File: server/agents/realScanAgent.ts'
  ]);

  // 11. Real-time WebSocket
  addSection(doc, '11. Real-time WebSocket', [
    'WebSocket Server:',
    '• ws library for WebSocket connections',
    '• Session-based authentication',
    '• Multi-tenant data isolation',
    '',
    'Real-time Events:',
    '• scan_start       - Scan initiated',
    '• page_discovered  - New page found',
    '• page_testing     - Page being tested',
    '• page_complete    - Page test done',
    '• issue_found      - Violation detected',
    '• screenshot       - Live screenshot update',
    '• scan_complete    - Scan finished',
    '• scan_error       - Error occurred',
    '',
    'Live Features:',
    '• Real-time progress updates',
    '• Live screenshot streaming',
    '• Dynamic issue count updates',
    '• Visual testing modal',
    '',
    'Security:',
    '• Token-based WebSocket auth',
    '• Estate-level authorization',
    '• Automatic disconnect on auth failure',
    '',
    'Implementation:',
    '• File: server/websocket.ts',
    '• Frontend: client/src/components/VisualTestingModal.tsx'
  ]);

  // 12. Object Storage
  addSection(doc, '12. Object Storage', [
    'Replit Object Storage:',
    '• Google Cloud Storage backend',
    '• Bucket: repl-default-bucket-{REPL_ID}',
    '',
    'Storage Structure:',
    '• /public/*                  - Public assets',
    '• /objects/scans/{id}/video.webm - Scan videos',
    '• /objects/scans/{id}/trace.zip  - Playwright traces',
    '',
    'ObjectStorageService:',
    '• Upload scan artifacts',
    '• Download with authentication',
    '• Automatic temp file cleanup',
    '• Stream large files efficiently',
    '',
    'Environment Variables:',
    '• PUBLIC_OBJECT_SEARCH_PATHS',
    '• PRIVATE_OBJECT_DIR',
    '• DEFAULT_OBJECT_STORAGE_BUCKET_ID',
    '',
    'Database Integration:',
    '• scan_runs.videoPath  - Video location',
    '• scan_runs.tracePath  - Trace location',
    '• Paths stored as /objects/* format',
    '',
    'Implementation:',
    '• File: server/objectStorage.ts'
  ]);

  // 13. Development Workflow
  addSection(doc, '13. Development Workflow', [
    'Getting Started:',
    '• npm install         - Install dependencies',
    '• npm run dev         - Start dev server',
    '• npm run db:push     - Sync database schema',
    '',
    'Environment Setup:',
    'Required environment variables:',
    '• DATABASE_URL',
    '• SESSION_SECRET',
    '• DEFAULT_OBJECT_STORAGE_BUCKET_ID',
    '• PUBLIC_OBJECT_SEARCH_PATHS',
    '',
    'Database Migrations:',
    '• Drizzle Kit for schema management',
    '• npm run db:push to sync changes',
    '• Automatic migration generation',
    '',
    'Code Organization:',
    '• Shared types in shared/schema.ts',
    '• API routes in server/routes.ts',
    '• Data access in server/storage.ts',
    '• Frontend pages in client/src/pages/',
    '',
    'Testing:',
    '• Playwright for E2E testing',
    '• axe-core for accessibility testing',
    '',
    'Design System:',
    '• design_guidelines.md - UI/UX guidelines',
    '• Purple-to-indigo gradient branding',
    '• Inter font family',
    '• WCAG 2.2 AA compliant design'
  ]);

  // Footer
  doc.moveDown(2);
  doc.fontSize(10).fillColor('#9CA3AF').text('TestraAI - Accessibility Testing Platform', { align: 'center' });
  doc.text('https://testraai.com', { align: 'center', link: 'https://testraai.com' });

  doc.end();
  return doc;
}

function addSection(doc: PDFKit.PDFDocument, title: string, content: string[]) {
  doc.fontSize(20).fillColor('#7C3AED').text(title);
  doc.moveDown();
  doc.fontSize(11).fillColor('#374151');
  
  content.forEach(line => {
    if (line === '') {
      doc.moveDown(0.5);
    } else if (line.endsWith(':')) {
      doc.fillColor('#111827').text(line);
      doc.fillColor('#374151');
    } else {
      doc.text(line);
    }
  });
  
  doc.moveDown(1.5);
}
