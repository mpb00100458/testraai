# Live Accessibility Testing - Implementation Documentation

## Overview
The Live Accessibility Testing feature provides real-time visual feedback during accessibility scans. Users can see live screenshots, activity logs, and issue statistics as the AI agent tests web pages for WCAG compliance.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌────────────────────┐         ┌─────────────────────────┐    │
│  │   AIAgent.tsx      │         │  LiveTestingPanel.tsx   │    │
│  │  - Chat interface  │────────▶│  - Real-time display    │    │
│  │  - Scan triggers   │         │  - WebSocket client     │    │
│  └────────────────────┘         └─────────────────────────┘    │
│              │                              │                    │
└──────────────┼──────────────────────────────┼───────────────────┘
               │                              │
               │ HTTP POST                    │ WebSocket
               │ /api/ai-agent/chat          │ ws://host/ws
               │                              │
┌──────────────▼──────────────────────────────▼───────────────────┐
│                      Backend (Node.js/Express)                   │
│  ┌─────────────────┐    ┌──────────────┐    ┌────────────────┐ │
│  │   routes.ts     │───▶│ websocket.ts │───▶│ realScanAgent  │ │
│  │  - API handlers │    │  - Event hub │    │ - Playwright   │ │
│  │  - Scan trigger │    │  - Auth      │    │ - axe-core     │ │
│  └─────────────────┘    └──────────────┘    └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Implementation

### 1. LiveTestingPanel Component
**File:** `client/src/components/LiveTestingPanel.tsx`

#### Purpose
Displays real-time scan progress with live screenshots and activity logs.

#### Key Features
- **Collapsible panel** - Can be expanded/collapsed without disconnecting
- **Real-time updates** - WebSocket connection for instant feedback
- **Live screenshots** - Base64-encoded images of pages being tested
- **Activity log** - Timestamped events with severity indicators
- **Issue statistics** - Live counters for Critical, Warning, and Minor issues
- **Progress tracking** - Percentage-based progress bar

#### Component Props
```typescript
interface LiveTestingPanelProps {
  estateId: string;      // Estate ID to subscribe to
  estateName?: string;   // Optional display name
}
```

#### State Management
```typescript
const [logs, setLogs] = useState<ActivityLog[]>([]);
const [isConnected, setIsConnected] = useState(false);
const [scanComplete, setScanComplete] = useState(false);
const [pagesDiscovered, setPagesDiscovered] = useState(0);
const [pagesTested, setPagesTested] = useState(0);
const [issuesFound, setIssuesFound] = useState({ 
  critical: 0, 
  warning: 0, 
  minor: 0 
});
const [currentPage, setCurrentPage] = useState<string>("");
const [progress, setProgress] = useState(0);
const [currentScreenshot, setCurrentScreenshot] = useState<string>("");
const [isExpanded, setIsExpanded] = useState(true);
```

#### WebSocket Connection
```typescript
useEffect(() => {
  if (!estateId) return;

  // Reset state on new estate
  setLogs([]);
  setScanComplete(false);
  // ... reset other state

  // Connect to WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
  wsRef.current = ws;

  ws.onopen = () => {
    setIsConnected(true);
    // Subscribe to estate updates
    ws.send(JSON.stringify({ type: 'subscribe', estateId }));
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    // Handle different event types
  };

  return () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  };
}, [estateId]);
```

#### Event Handling
The component handles 7 event types:

1. **scan_start** - Scan initialization
2. **page_discovered** - New page found during crawl
3. **page_testing** - Page is being tested
4. **page_complete** - Page testing finished (includes screenshot)
5. **issue_found** - Accessibility issue detected
6. **scan_complete** - All pages tested
7. **scan_error** - Error occurred during scan

#### Activity Log Structure
```typescript
interface ActivityLog {
  id: string;
  type: 'scan_start' | 'page_discovered' | 'page_testing' | 
        'page_complete' | 'issue_found' | 'scan_complete' | 'scan_error';
  timestamp: string;
  message: string;
  data?: any;
  severity?: 'info' | 'warning' | 'error' | 'success';
}
```

#### UI Components
- **Progress Bar** - Shows `pagesTested / pagesDiscovered` with percentage
- **Stats Grid** - 3-column layout for Critical/Warning/Minor counts
- **Live Screenshot** - Real-time browser view with "Real-time" badge
- **Activity Log** - Scrollable terminal-style log with color-coded severity
- **Completion Status** - Green success banner when scan finishes

---

### 2. AIAgent Integration
**File:** `client/src/pages/AIAgent.tsx`

#### WebSocket Setup
```typescript
useEffect(() => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  const ws = new WebSocket(wsUrl);
  wsRef.current = ws;

  ws.onopen = () => {
    console.log('[AI Agent] WebSocket connected successfully!');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Handle scan events for inline progress display
  };

  return () => {
    ws.close();
  };
}, [conversationId]);
```

#### Auto-Subscribe to Estates
```typescript
useEffect(() => {
  if (!messages || !wsRef.current || 
      wsRef.current.readyState !== WebSocket.OPEN) return;

  // Find ALL messages with scan metadata
  const estateIds = new Set<string>();
  
  for (const msg of messages) {
    if (msg.metadata && typeof msg.metadata === 'object' && 
        'estateId' in msg.metadata) {
      const estateId = (msg.metadata as any).estateId;
      estateIds.add(estateId);
    }
  }

  // Subscribe to all estates
  estateIds.forEach(estateId => {
    wsRef.current?.send(JSON.stringify({ 
      type: 'subscribe', 
      estateId 
    }));
  });
}, [messages]);
```

#### Chat Message Handler
```typescript
const sendMessageMutation = useMutation({
  mutationFn: async (content: string) => {
    return await apiRequest('POST', '/api/ai-agent/chat', { 
      conversationId,
      message: content 
    });
  },
  onSuccess: (data: any) => {
    // If response includes estateId, subscribe immediately
    if (data.estateId && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'subscribe', 
        estateId: data.estateId 
      }));
    }
    
    queryClient.invalidateQueries({ 
      queryKey: ['/api/ai-agent/messages', conversationId] 
    });
    setMessage("");
  },
});
```

---

## Backend Implementation

### 1. WebSocket Manager
**File:** `server/websocket.ts`

#### Purpose
Manages WebSocket connections, authentication, and real-time event broadcasting.

#### Architecture
```typescript
class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  
  // Methods:
  // - initialize(server)
  // - sendToEstate(estateId, message)
  // - emitScanStart(estateId, data)
  // - emitPageDiscovered(estateId, data)
  // - emitPageTesting(estateId, data)
  // - emitPageComplete(estateId, data)
  // - emitIssueFound(estateId, data)
  // - emitScanComplete(estateId, data)
  // - emitScanError(estateId, data)
}
```

#### Initialization
```typescript
initialize(server: Server) {
  this.wss = new WebSocketServer({ 
    server, 
    path: '/ws',
    verifyClient: async ({ req }: { req: IncomingMessage }) => {
      // Verify session cookie exists
      const cookie = req.headers.cookie;
      if (!cookie) {
        console.log('WebSocket rejected: No cookie');
        return false;
      }
      return true;
    }
  });

  this.wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
    // Extract user from session
    const userId = await this.extractUserFromSession(req);
    if (!userId) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    ws.userId = userId;
    // Handle messages and subscriptions
  });
}
```

#### Authentication Flow
1. **Session Extraction** - Parse `connect.sid` cookie
2. **Database Lookup** - Query PostgreSQL sessions table
3. **User Verification** - Extract `passport.user` from session data
4. **Estate Access Check** - Verify user has access to requested estate

```typescript
private async extractUserFromSession(req: IncomingMessage): Promise<string | null> {
  const cookie = req.headers.cookie;
  if (!cookie) return null;

  // Parse session cookie
  const cookies = cookie.split(';').reduce((acc, c) => {
    const [key, ...v] = c.trim().split('=');
    acc[key] = v.join('=');
    return acc;
  }, {} as Record<string, string>);

  const sessionId = cookies['connect.sid'];
  if (!sessionId) return null;

  // Decode session ID (remove 's:' prefix and signature)
  const decodedSessionId = decodeURIComponent(sessionId)
    .split('.')[0]
    .replace('s:', '');
  
  // Query session store (PostgreSQL)
  const sessionQuery = await db.execute(
    sql`SELECT sess FROM sessions WHERE sid = ${decodedSessionId}`
  );

  if (!sessionQuery.rows.length) return null;

  const sessionData = sessionQuery.rows[0].sess as any;
  return sessionData?.passport?.user || null;
}
```

#### Subscription Management
```typescript
ws.on('message', async (message: string) => {
  const data = JSON.parse(message.toString());
  
  if (data.type === 'subscribe' && data.estateId) {
    // Verify user has access to this estate
    const hasAccess = await this.verifyEstateAccess(
      ws.userId!, 
      data.estateId
    );
    
    if (!hasAccess) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Access denied to this estate' 
      }));
      return;
    }

    // Subscribe client to estate updates
    if (!this.clients.has(data.estateId)) {
      this.clients.set(data.estateId, new Set());
    }
    this.clients.get(data.estateId)!.add(ws);
    
    // Send confirmation
    ws.send(JSON.stringify({ 
      type: 'subscribed', 
      estateId: data.estateId 
    }));
  }
});
```

#### Broadcasting Events
```typescript
sendToEstate(estateId: string, message: ScanProgressMessage) {
  const clients = this.clients.get(estateId);
  if (!clients || clients.size === 0) return;

  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}
```

#### Event Types
```typescript
interface ScanProgressMessage {
  type: 'scan_start' | 'page_discovered' | 'page_testing' |
        'page_complete' | 'issue_found' | 'scan_complete' | 'scan_error';
  estateId: string;
  data?: any;
}
```

#### Convenience Methods
```typescript
emitScanStart(estateId: string, data: any) {
  this.sendToEstate(estateId, { type: 'scan_start', estateId, data });
}

emitPageDiscovered(estateId: string, data: { url: string; totalPages: number }) {
  this.sendToEstate(estateId, { type: 'page_discovered', estateId, data });
}

emitPageTesting(estateId: string, data: {
  url: string;
  pageNumber: number;
  totalPages: number
}) {
  this.sendToEstate(estateId, { type: 'page_testing', estateId, data });
}

emitPageComplete(estateId: string, data: {
  scanRunId: string;
  url: string;
  issuesFound: number;
  pageNumber: number;
  totalPages: number;
  totalIssues?: number;
  screenshot?: string
}) {
  this.sendToEstate(estateId, { type: 'page_complete', estateId, data });
}

emitIssueFound(estateId: string, data: { url: string; issue: any }) {
  this.sendToEstate(estateId, { type: 'issue_found', estateId, data });
}

emitScanComplete(estateId: string, data: any) {
  this.sendToEstate(estateId, { type: 'scan_complete', estateId, data });
}

emitScanError(estateId: string, data: { scanRunId?: string; error: string }) {
  this.sendToEstate(estateId, { type: 'scan_error', estateId, data });
}
```

---

### 2. Real Scan Agent
**File:** `server/agents/realScanAgent.ts`

#### Purpose
Executes accessibility scans using Playwright and axe-core, emitting real-time events via WebSocket.

#### Key Technologies
- **Playwright** - Browser automation
- **axe-core** - WCAG 2.1 A/AA accessibility testing
- **WebSocket Manager** - Real-time event broadcasting

#### Scan Flow
```
1. Create scan run in database
2. Emit scan_start event
3. Launch Playwright browser
4. For each page:
   a. Emit page_discovered event
   b. Emit page_testing event
   c. Navigate to page
   d. Run axe-core analysis
   e. Capture screenshot
   f. Emit issue_found events (for each violation)
   g. Emit page_complete event (with screenshot)
   h. Discover new links
5. Generate reports (Excel, JSON, Markdown)
6. Emit scan_complete event
7. Close browser
```

#### Main Scan Method
```typescript
async runScan(estateId: string): Promise<void> {
  let browser: Browser | null = null;

  try {
    // Create scan run
    const scanRun = await storage.createScanRun({
      estateId,
      status: 'running',
      pagesAudited: 0,
    });

    await storage.updateEstateStatus(estateId, 'crawling');

    const estate = await storage.getEstate(estateId);
    if (!estate) throw new Error('Estate not found');

    // Emit scan start event
    wsManager.emitScanStart(estateId, {
      scanRunId: scanRun.id,
      baseUrl: estate.baseUrl,
      timestamp: new Date().toISOString(),
    });

    // Launch browser and run scan
    // ... (see Page Testing section below)

  } catch (error) {
    // Emit error event
    wsManager.emitScanError(estateId, {
      scanRunId: scanRun?.id,
      error: error.message,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
```

#### Page Testing Loop
```typescript
// Crawl and test pages
const urlsToVisit = [baseUrl];
const visitedUrls = new Set<string>();
const results: PageResult[] = [];
let totalDiscovered = 1;

while (urlsToVisit.length > 0 && results.length < MAX_PAGES_PER_ESTATE) {
  const currentUrl = urlsToVisit.shift()!;

  if (visitedUrls.has(currentUrl)) continue;
  visitedUrls.add(currentUrl);

  // Emit page discovered event
  wsManager.emitPageDiscovered(estateId, {
    url: currentUrl,
    totalPages: totalDiscovered,
  });

  try {
    // Emit page testing event
    wsManager.emitPageTesting(estateId, {
      url: currentUrl,
      pageNumber: results.length + 1,
      totalPages: totalDiscovered,
    });

    // Navigate to page
    await page.goto(currentUrl, {
      timeout: PAGE_TIMEOUT,
      waitUntil: 'networkidle'
    });

    // Wait for dynamic content
    await page.waitForTimeout(1000);

    // Run axe-core analysis
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = axeResults.violations.map(v => ({
      ...v,
      impact: v.impact || 'moderate',
    }));

    // Capture screenshot
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 60,
      fullPage: false
    });
    const screenshotBase64 = screenshot.toString('base64');

    // Store result
    results.push({
      url: currentUrl,
      title: await page.title(),
      violations,
      passes: axeResults.passes,
      incomplete: axeResults.incomplete,
      timestamp: new Date().toISOString(),
    });

    // Emit issues found
    for (const violation of violations) {
      wsManager.emitIssueFound(estateId, {
        url: currentUrl,
        issue: {
          type: violation.id,
          severity: this.mapImpactToSeverity(violation.impact),
          description: violation.description,
          nodesCount: violation.nodes.length,
        },
      });
    }

    // Emit page complete with screenshot
    wsManager.emitPageComplete(estateId, {
      scanRunId: scanRun.id,
      url: currentUrl,
      issuesFound: violations.reduce((sum, v) => sum + v.nodes.length, 0),
      pageNumber: results.length,
      totalPages: totalDiscovered,
      screenshot: screenshotBase64,
    });

    // Discover new links
    const links = await page.$$eval('a[href]', (anchors, base) => {
      return anchors
        .map(a => {
          try {
            const href = a.getAttribute('href');
            if (!href) return null;
            return new URL(href, base).href;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    }, baseUrl);

    // Add internal links to queue
    for (const link of links) {
      const linkUrl = new URL(link);
      const baseUrlObj = new URL(baseUrl);

      if (linkUrl.hostname === baseUrlObj.hostname &&
          !visitedUrls.has(link) &&
          !urlsToVisit.includes(link)) {
        urlsToVisit.push(link);
        totalDiscovered++;
      }
    }
  } catch (error) {
    console.error(`Error processing ${currentUrl}:`, error);
  }
}
```

#### Severity Mapping
```typescript
private mapImpactToSeverity(impact: string): 'critical' | 'warning' | 'minor' {
  switch (impact) {
    case 'critical':
    case 'serious':
      return 'critical';
    case 'moderate':
      return 'warning';
    case 'minor':
    default:
      return 'minor';
  }
}
```

#### Scan Completion
```typescript
// Generate reports
const excelPath = await this.generateExcelReport(results, estate);
const jsonPath = await this.generateJSONReport(results, estate);
const markdownPath = await this.generateMarkdownReport(results, estate);

// Upload to object storage
const excelUrl = await objectStorage.uploadFile(excelPath, 'reports');
const jsonUrl = await objectStorage.uploadFile(jsonPath, 'reports');
const markdownUrl = await objectStorage.uploadFile(markdownPath, 'reports');

// Update scan run
await storage.updateScanRun(scanRun.id, {
  status: 'completed',
  pagesAudited: results.length,
  excelReportUrl: excelUrl,
  jsonReportUrl: jsonUrl,
  markdownReportUrl: markdownUrl,
});

// Emit scan complete event
wsManager.emitScanComplete(estateId, {
  scanRunId: scanRun.id,
  totalPages: results.length,
  totalIssues: results.reduce((sum, r) =>
    sum + r.violations.reduce((s, v) => s + v.nodes.length, 0), 0
  ),
  excelReportUrl: excelUrl,
  jsonReportUrl: jsonUrl,
  markdownReportUrl: markdownUrl,
});
```

---

### 3. API Routes
**File:** `server/routes.ts`

#### Chat Endpoint
```typescript
app.post('/api/ai-agent/chat', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, message } = req.body;

    if (!message || !conversationId) {
      return res.status(400).json({
        message: "Message and conversation ID required"
      });
    }

    // Save user message
    await storage.createChatMessage({
      conversationId,
      role: 'user',
      content: message,
      messageType: 'text',
      metadata: null,
    });

    // Process with AI agent
    const { processAIAgentMessage } = await import('./ai-agent');
    const aiResponse = await processAIAgentMessage(
      message,
      userId,
      conversationId
    );

    // Save AI response
    await storage.createChatMessage({
      conversationId,
      role: 'assistant',
      content: aiResponse.content,
      messageType: aiResponse.messageType || 'text',
      metadata: aiResponse.metadata || null,
    });

    // Return estateId for immediate WebSocket subscription
    res.json({
      success: true,
      estateId: aiResponse.metadata?.estateId
    });
  } catch (error) {
    console.error("Error in AI chat:", error);
    res.status(500).json({ message: "Failed to process message" });
  }
});
```

---

### 4. AI Agent Integration
**File:** `server/ai-agent.ts`

#### Scan Trigger Logic
```typescript
// If user wants a new scan, trigger it
if (wantNewScan || !existingScan) {
  // Get or create organization
  let orgId = orgs[0]?.id;

  if (!orgId) {
    const newOrg = await storage.createOrganization({
      name: "AI Agent Scans",
      slug: `ai-scans-${nanoid(8)}`,
    }, userId);
    orgId = newOrg.id;
  }

  // Get or create "AI Scans" project
  const projects = await storage.getProjectsByOrgId(orgId);
  let aiProject = projects.find(p => p.name === "AI Agent Scans");

  if (!aiProject) {
    aiProject = await storage.createProject({
      organizationId: orgId,
      name: "AI Agent Scans",
      description: "Automated scans triggered by AI Agent",
    });
  }

  // Create estate for this URL
  const estate = await storage.createEstate({
    projectId: aiProject.id,
    baseUrl: url,
    name: `Scan: ${new URL(url).hostname}`,
    crawlBudget: 50,
  });

  // Trigger scan asynchronously
  import('./agents/realScanAgent').then(async ({ RealScanAgent }) => {
    try {
      const agent = new RealScanAgent();
      await agent.runScan(estate.id);
    } catch (error) {
      console.error('[AI Agent] Error running scan:', error);
    }
  });

  // Return response with estateId for WebSocket subscription
  return {
    content: `I'm starting a comprehensive accessibility scan...`,
    messageType: 'scan_trigger',
    metadata: {
      estateId: estate.id,
      projectId: aiProject.id,
    },
  };
}
```

---

## Event Flow Diagram

```
User sends chat message
        │
        ▼
POST /api/ai-agent/chat
        │
        ▼
AI Agent processes message
        │
        ▼
Create Estate & Trigger Scan
        │
        ▼
Return estateId to frontend
        │
        ▼
Frontend subscribes to WebSocket
        │
        ▼
RealScanAgent.runScan(estateId)
        │
        ├─▶ emitScanStart()
        │
        ├─▶ For each page:
        │   ├─▶ emitPageDiscovered()
        │   ├─▶ emitPageTesting()
        │   ├─▶ Run axe-core analysis
        │   ├─▶ Capture screenshot
        │   ├─▶ emitIssueFound() (for each violation)
        │   └─▶ emitPageComplete() (with screenshot)
        │
        └─▶ emitScanComplete()
                │
                ▼
        WebSocket broadcasts to subscribed clients
                │
                ▼
        LiveTestingPanel updates UI in real-time
```

---

## Message Formats

### 1. scan_start
```json
{
  "type": "scan_start",
  "estateId": "estate_123",
  "data": {
    "scanRunId": "run_456",
    "baseUrl": "https://example.com",
    "timestamp": "2025-10-28T10:00:00.000Z"
  }
}
```

### 2. page_discovered
```json
{
  "type": "page_discovered",
  "estateId": "estate_123",
  "data": {
    "url": "https://example.com/about",
    "totalPages": 5
  }
}
```

### 3. page_testing
```json
{
  "type": "page_testing",
  "estateId": "estate_123",
  "data": {
    "url": "https://example.com/contact",
    "pageNumber": 3,
    "totalPages": 5
  }
}
```

### 4. page_complete
```json
{
  "type": "page_complete",
  "estateId": "estate_123",
  "data": {
    "scanRunId": "run_456",
    "url": "https://example.com/contact",
    "issuesFound": 12,
    "pageNumber": 3,
    "totalPages": 5,
    "totalIssues": 45,
    "screenshot": "base64_encoded_jpeg_string..."
  }
}
```

### 5. issue_found
```json
{
  "type": "issue_found",
  "estateId": "estate_123",
  "data": {
    "url": "https://example.com/contact",
    "issue": {
      "type": "color-contrast",
      "severity": "critical",
      "description": "Elements must have sufficient color contrast",
      "nodesCount": 3
    }
  }
}
```

### 6. scan_complete
```json
{
  "type": "scan_complete",
  "estateId": "estate_123",
  "data": {
    "scanRunId": "run_456",
    "totalPages": 5,
    "totalIssues": 67,
    "excelReportUrl": "https://storage.example.com/reports/scan_456.xlsx",
    "jsonReportUrl": "https://storage.example.com/reports/scan_456.json",
    "markdownReportUrl": "https://storage.example.com/reports/scan_456.md"
  }
}
```

### 7. scan_error
```json
{
  "type": "scan_error",
  "estateId": "estate_123",
  "data": {
    "scanRunId": "run_456",
    "error": "Failed to navigate to page: Timeout exceeded"
  }
}
```

---

## Security Considerations

### 1. WebSocket Authentication
- Session-based authentication using `connect.sid` cookie
- User ID extracted from PostgreSQL session store
- Unauthorized connections are rejected with code 1008

### 2. Estate Access Control
```typescript
private async verifyEstateAccess(userId: string, estateId: string): Promise<boolean> {
  // Get estate → project → organization
  const estate = await storage.getEstate(estateId);
  if (!estate) return false;

  const project = await storage.getProject(estate.projectId);
  if (!project) return false;

  // Check if user belongs to organization
  const userOrgs = await storage.getOrganizationsByUserId(userId);
  return userOrgs.some(org => org.id === project.organizationId);
}
```

### 3. Subscription Isolation
- Clients can only subscribe to estates they have access to
- Each estate has its own set of subscribed clients
- Messages are only sent to authorized subscribers

---

## Performance Optimizations

### 1. Screenshot Compression
```typescript
const screenshot = await page.screenshot({
  type: 'jpeg',      // JPEG instead of PNG
  quality: 60,       // 60% quality
  fullPage: false    // Viewport only, not full page
});
```

### 2. Concurrent Scans
- Each scan uses its own browser instance
- Multiple scans can run simultaneously
- Local browser variable prevents race conditions

### 3. Connection Management
- WebSocket connections are reused across multiple scans
- Clients remain subscribed even when panel is collapsed
- Automatic cleanup on disconnect

### 4. Event Throttling
- Screenshots only sent on `page_complete` (not every event)
- Issue events batched per page
- Progress updates use calculated percentages

---

## Testing

### Frontend Tests
```typescript
// Test WebSocket connection
test('connects to WebSocket on mount', () => {
  render(<LiveTestingPanel estateId="test_123" />);
  expect(mockWebSocket).toHaveBeenCalledWith('ws://localhost/ws');
});

// Test subscription
test('subscribes to estate on connection', () => {
  render(<LiveTestingPanel estateId="test_123" />);
  expect(mockWebSocket.send).toHaveBeenCalledWith(
    JSON.stringify({ type: 'subscribe', estateId: 'test_123' })
  );
});

// Test event handling
test('updates progress on page_testing event', () => {
  const { getByText } = render(<LiveTestingPanel estateId="test_123" />);

  mockWebSocket.onmessage({
    data: JSON.stringify({
      type: 'page_testing',
      data: { pageNumber: 3, totalPages: 10 }
    })
  });

  expect(getByText('3 / 10 pages tested')).toBeInTheDocument();
});
```

### Backend Tests
```typescript
// Test WebSocket authentication
test('rejects unauthenticated connections', async () => {
  const ws = new WebSocket('ws://localhost/ws');
  await expect(ws).toBeRejectedWith(1008);
});

// Test estate access control
test('denies subscription to unauthorized estate', async () => {
  const ws = await authenticatedWebSocket(userId);
  ws.send(JSON.stringify({ type: 'subscribe', estateId: 'unauthorized' }));

  const response = await ws.nextMessage();
  expect(response.type).toBe('error');
});

// Test event broadcasting
test('broadcasts events to subscribed clients', async () => {
  const ws1 = await authenticatedWebSocket(userId);
  const ws2 = await authenticatedWebSocket(userId);

  ws1.send(JSON.stringify({ type: 'subscribe', estateId: 'test_123' }));
  ws2.send(JSON.stringify({ type: 'subscribe', estateId: 'test_123' }));

  wsManager.emitScanStart('test_123', { baseUrl: 'https://example.com' });

  expect(await ws1.nextMessage()).toMatchObject({ type: 'scan_start' });
  expect(await ws2.nextMessage()).toMatchObject({ type: 'scan_start' });
});
```

---

## Troubleshooting

### Issue: WebSocket connection fails
**Symptoms:** "Disconnected" status in LiveTestingPanel

**Solutions:**
1. Check browser console for WebSocket errors
2. Verify session cookie is present
3. Check server logs for authentication failures
4. Ensure `/ws` path is not blocked by proxy/firewall

### Issue: No events received
**Symptoms:** Panel shows "Live" but no activity logs

**Solutions:**
1. Verify subscription was successful (check for `subscribed` message)
2. Check estate access permissions
3. Verify scan is actually running (check server logs)
4. Ensure estateId matches between subscription and scan

### Issue: Screenshots not displaying
**Symptoms:** Activity log shows events but no screenshot

**Solutions:**
1. Check `page_complete` event includes `screenshot` field
2. Verify base64 encoding is correct
3. Check browser console for image loading errors
4. Ensure screenshot quality/size is reasonable

### Issue: Multiple duplicate events
**Symptoms:** Same event appears multiple times in log

**Solutions:**
1. Check for multiple WebSocket connections (component re-renders)
2. Verify cleanup in useEffect return function
3. Check for duplicate subscriptions to same estate

---

## Future Enhancements

### 1. Reconnection Logic
- Automatic reconnection on disconnect
- Resume from last known state
- Backoff strategy for failed connections

### 2. Event Replay
- Store events in database
- Allow users to replay past scans
- Historical view of scan progress

### 3. Multi-Estate Monitoring
- Subscribe to multiple estates simultaneously
- Dashboard view of all active scans
- Aggregate statistics across estates

### 4. Enhanced Screenshots
- Full-page screenshots option
- Annotated screenshots with issue highlights
- Screenshot comparison (before/after fixes)

### 5. Performance Metrics
- Page load times
- Scan duration per page
- Network waterfall visualization

---

## Conclusion

The Live Accessibility Testing feature provides a seamless real-time experience for users monitoring WCAG compliance scans. The architecture leverages WebSockets for instant updates, Playwright for browser automation, and axe-core for comprehensive accessibility testing.

Key benefits:
- **Real-time feedback** - Users see progress as it happens
- **Visual confirmation** - Live screenshots provide context
- **Detailed logging** - Activity log tracks every step
- **Secure** - Session-based authentication and access control
- **Scalable** - Supports concurrent scans and multiple subscribers

The implementation follows best practices for WebSocket communication, event-driven architecture, and React state management, resulting in a robust and user-friendly feature.

