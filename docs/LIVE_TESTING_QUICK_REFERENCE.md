# Live Accessibility Testing - Quick Reference Guide

## Overview
Quick reference for developers working with the Live Accessibility Testing feature.

---

## Key Files

| File | Purpose |
|------|---------|
| `client/src/components/LiveTestingPanel.tsx` | Real-time UI panel component |
| `client/src/pages/AIAgent.tsx` | Chat interface with WebSocket integration |
| `server/websocket.ts` | WebSocket server and event broadcasting |
| `server/agents/realScanAgent.ts` | Scan execution and event emission |
| `server/routes.ts` | API endpoints for chat and scans |
| `server/ai-agent.ts` | AI processing and scan triggering |

---

## WebSocket Events

### Event Types
```typescript
type EventType = 
  | 'scan_start'       // Scan begins
  | 'page_discovered'  // New page found
  | 'page_testing'     // Page being tested
  | 'page_complete'    // Page test finished (includes screenshot)
  | 'issue_found'      // Accessibility issue detected
  | 'scan_complete'    // All pages tested
  | 'scan_error';      // Error occurred
```

### Event Data Structures

#### scan_start
```typescript
{
  type: 'scan_start',
  estateId: string,
  data: {
    scanRunId: string,
    baseUrl: string,
    timestamp: string
  }
}
```

#### page_testing
```typescript
{
  type: 'page_testing',
  estateId: string,
  data: {
    url: string,
    pageNumber: number,
    totalPages: number
  }
}
```

#### page_complete
```typescript
{
  type: 'page_complete',
  estateId: string,
  data: {
    scanRunId: string,
    url: string,
    issuesFound: number,
    pageNumber: number,
    totalPages: number,
    totalIssues?: number,
    screenshot?: string  // Base64 JPEG
  }
}
```

#### issue_found
```typescript
{
  type: 'issue_found',
  estateId: string,
  data: {
    url: string,
    issue: {
      type: string,
      severity: 'critical' | 'warning' | 'minor',
      description: string,
      nodesCount: number
    }
  }
}
```

#### scan_complete
```typescript
{
  type: 'scan_complete',
  estateId: string,
  data: {
    scanRunId: string,
    totalPages: number,
    totalIssues: number,
    excelReportUrl: string,
    jsonReportUrl: string,
    markdownReportUrl: string
  }
}
```

---

## Frontend Usage

### Subscribe to Estate Updates
```typescript
const ws = new WebSocket(`ws://${window.location.host}/ws`);

ws.onopen = () => {
  ws.send(JSON.stringify({ 
    type: 'subscribe', 
    estateId: 'estate_123' 
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'scan_start':
      console.log('Scan started:', message.data);
      break;
    case 'page_complete':
      console.log('Page complete:', message.data);
      if (message.data.screenshot) {
        displayScreenshot(message.data.screenshot);
      }
      break;
    case 'scan_complete':
      console.log('Scan finished:', message.data);
      break;
  }
};
```

### Display Screenshot
```typescript
const displayScreenshot = (base64: string) => {
  const img = document.createElement('img');
  img.src = `data:image/jpeg;base64,${base64}`;
  document.body.appendChild(img);
};
```

---

## Backend Usage

### Emit Events from Scan Agent
```typescript
import { wsManager } from '../websocket';

// Start scan
wsManager.emitScanStart(estateId, {
  scanRunId: 'run_123',
  baseUrl: 'https://example.com',
  timestamp: new Date().toISOString(),
});

// Page testing
wsManager.emitPageTesting(estateId, {
  url: 'https://example.com/about',
  pageNumber: 2,
  totalPages: 10,
});

// Page complete with screenshot
const screenshot = await page.screenshot({ 
  type: 'jpeg', 
  quality: 60 
});
const screenshotBase64 = screenshot.toString('base64');

wsManager.emitPageComplete(estateId, {
  scanRunId: 'run_123',
  url: 'https://example.com/about',
  issuesFound: 5,
  pageNumber: 2,
  totalPages: 10,
  screenshot: screenshotBase64,
});

// Issue found
wsManager.emitIssueFound(estateId, {
  url: 'https://example.com/about',
  issue: {
    type: 'color-contrast',
    severity: 'critical',
    description: 'Elements must have sufficient color contrast',
    nodesCount: 3,
  },
});

// Scan complete
wsManager.emitScanComplete(estateId, {
  scanRunId: 'run_123',
  totalPages: 10,
  totalIssues: 45,
  excelReportUrl: 'https://storage.example.com/report.xlsx',
  jsonReportUrl: 'https://storage.example.com/report.json',
  markdownReportUrl: 'https://storage.example.com/report.md',
});

// Error
wsManager.emitScanError(estateId, {
  scanRunId: 'run_123',
  error: 'Failed to navigate to page',
});
```

---

## API Endpoints

### POST /api/ai-agent/chat
Trigger a scan via AI chat interface.

**Request:**
```json
{
  "conversationId": "conv_123",
  "message": "Scan https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "estateId": "estate_456"
}
```

**Usage:**
```typescript
const response = await fetch('/api/ai-agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: 'conv_123',
    message: 'Scan https://example.com'
  })
});

const { estateId } = await response.json();

// Subscribe to WebSocket for this estate
ws.send(JSON.stringify({ type: 'subscribe', estateId }));
```

---

## Common Patterns

### Pattern 1: Real-time Progress Bar
```typescript
const [progress, setProgress] = useState(0);
const [pagesTested, setPagesTested] = useState(0);
const [totalPages, setTotalPages] = useState(0);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'page_testing') {
    setPagesTested(message.data.pageNumber);
    setTotalPages(message.data.totalPages);
    setProgress((message.data.pageNumber / message.data.totalPages) * 100);
  }
};

return (
  <div>
    <Progress value={progress} />
    <span>{pagesTested} / {totalPages} pages tested</span>
  </div>
);
```

### Pattern 2: Issue Counter
```typescript
const [issues, setIssues] = useState({ 
  critical: 0, 
  warning: 0, 
  minor: 0 
});

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'issue_found') {
    const severity = message.data.issue.severity;
    setIssues(prev => ({
      ...prev,
      [severity]: prev[severity] + 1
    }));
  }
};

return (
  <div>
    <Badge variant="destructive">{issues.critical} Critical</Badge>
    <Badge variant="warning">{issues.warning} Warning</Badge>
    <Badge variant="secondary">{issues.minor} Minor</Badge>
  </div>
);
```

### Pattern 3: Activity Log
```typescript
const [logs, setLogs] = useState<ActivityLog[]>([]);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  const logEntry = {
    id: `${Date.now()}-${Math.random()}`,
    type: message.type,
    timestamp: new Date().toISOString(),
    message: formatMessage(message),
    severity: getSeverity(message),
  };
  
  setLogs(prev => [...prev, logEntry]);
};

const formatMessage = (message: any) => {
  switch (message.type) {
    case 'scan_start':
      return `Starting scan for ${message.data.baseUrl}`;
    case 'page_testing':
      return `Testing [${message.data.pageNumber}/${message.data.totalPages}]: ${message.data.url}`;
    case 'page_complete':
      return `Completed: ${message.data.url} (${message.data.issuesFound} issues)`;
    case 'scan_complete':
      return `Scan complete! Found ${message.data.totalIssues} issues`;
    default:
      return JSON.stringify(message);
  }
};

return (
  <ScrollArea>
    {logs.map(log => (
      <div key={log.id}>
        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
        <span>{log.message}</span>
      </div>
    ))}
  </ScrollArea>
);
```

---

## Security Checklist

- [ ] WebSocket uses session-based authentication
- [ ] User ID extracted from PostgreSQL session store
- [ ] Estate access verified before subscription
- [ ] Unauthorized connections rejected with code 1008
- [ ] Each estate has isolated subscriber list
- [ ] Messages only sent to authorized clients

---

## Performance Tips

### 1. Screenshot Optimization
```typescript
// ✅ Good - Compressed JPEG
const screenshot = await page.screenshot({ 
  type: 'jpeg', 
  quality: 60,
  fullPage: false 
});

// ❌ Bad - Large PNG
const screenshot = await page.screenshot({ 
  type: 'png',
  fullPage: true 
});
```

### 2. Event Batching
```typescript
// ✅ Good - Batch issues per page
const issues = violations.map(v => ({
  type: v.id,
  severity: mapSeverity(v.impact),
  description: v.description,
}));

for (const issue of issues) {
  wsManager.emitIssueFound(estateId, { url, issue });
}

// ❌ Bad - Emit for every node
violations.forEach(v => {
  v.nodes.forEach(node => {
    wsManager.emitIssueFound(estateId, { url, issue: node });
  });
});
```

### 3. Connection Reuse
```typescript
// ✅ Good - Single WebSocket connection
const wsRef = useRef<WebSocket | null>(null);

useEffect(() => {
  if (!wsRef.current) {
    wsRef.current = new WebSocket(wsUrl);
  }
  return () => {
    wsRef.current?.close();
  };
}, []);

// ❌ Bad - New connection on every render
useEffect(() => {
  const ws = new WebSocket(wsUrl);
  return () => ws.close();
}); // Missing dependency array
```

---

## Debugging

### Enable WebSocket Logging
```typescript
// Frontend
ws.onopen = () => console.log('[WS] Connected');
ws.onmessage = (e) => console.log('[WS] Message:', JSON.parse(e.data));
ws.onerror = (e) => console.error('[WS] Error:', e);
ws.onclose = () => console.log('[WS] Disconnected');

// Backend
console.log(`[WS] Emit ${message.type} to estate ${estateId}, clients: ${clients?.size || 0}`);
```

### Check Subscription Status
```typescript
// Send subscription request
ws.send(JSON.stringify({ type: 'subscribe', estateId: 'estate_123' }));

// Wait for confirmation
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'subscribed') {
    console.log('✅ Subscribed to estate:', message.estateId);
  } else if (message.type === 'error') {
    console.error('❌ Subscription failed:', message.message);
  }
};
```

### Verify Estate Access
```bash
# Check if user has access to estate
curl -X GET http://localhost:5000/api/estates/estate_123 \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json"
```

---

## Testing

### Mock WebSocket in Tests
```typescript
// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  send = jest.fn();
  close = jest.fn();
  
  simulateOpen() {
    this.onopen?.();
  }
  
  simulateMessage(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

global.WebSocket = MockWebSocket as any;

// Test component
test('subscribes to estate on mount', () => {
  const { container } = render(<LiveTestingPanel estateId="test_123" />);
  
  const ws = (global.WebSocket as any).mock.instances[0];
  ws.simulateOpen();
  
  expect(ws.send).toHaveBeenCalledWith(
    JSON.stringify({ type: 'subscribe', estateId: 'test_123' })
  );
});
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Disconnected" status | No session cookie | Check authentication |
| No events received | Not subscribed | Verify subscription message sent |
| Duplicate events | Multiple connections | Check useEffect cleanup |
| Screenshot not showing | Missing base64 prefix | Add `data:image/jpeg;base64,` |
| Access denied | User not in org | Check estate ownership |

---

## Best Practices

1. **Always clean up WebSocket connections**
   ```typescript
   useEffect(() => {
     const ws = new WebSocket(url);
     return () => ws.close(); // Cleanup
   }, []);
   ```

2. **Handle all event types**
   ```typescript
   switch (message.type) {
     case 'scan_start': /* ... */ break;
     case 'page_complete': /* ... */ break;
     case 'scan_complete': /* ... */ break;
     case 'scan_error': /* ... */ break;
     default:
       console.warn('Unknown event type:', message.type);
   }
   ```

3. **Verify subscription before emitting**
   ```typescript
   const clients = this.clients.get(estateId);
   if (!clients || clients.size === 0) {
     console.warn('No subscribers for estate:', estateId);
     return;
   }
   ```

4. **Use TypeScript for type safety**
   ```typescript
   interface ScanProgressMessage {
     type: EventType;
     estateId: string;
     data?: any;
   }
   ```

5. **Log important events**
   ```typescript
   console.log(`[WS] Client subscribed to estate ${estateId}`);
   console.log(`[Scan] Emitting page_complete for ${url}`);
   ```

---

## Quick Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Check WebSocket connections
# In browser console:
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('/ws'))

# Monitor WebSocket traffic
# Chrome DevTools → Network → WS → Messages
```

---

## Resources

- [WebSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Playwright Documentation](https://playwright.dev/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

