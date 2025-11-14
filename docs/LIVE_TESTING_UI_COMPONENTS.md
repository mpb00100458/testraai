# Live Accessibility Testing - UI Components Guide

## Overview
Visual guide to the UI components used in the Live Accessibility Testing feature.

---

## LiveTestingPanel Component

### Component Hierarchy
```
LiveTestingPanel
├── Card (border-primary/20)
│   ├── Collapsible
│   │   ├── CardHeader
│   │   │   ├── TestTube2 Icon
│   │   │   ├── CardTitle ("Live Accessibility Testing")
│   │   │   ├── Connection Status Indicator
│   │   │   └── CollapsibleTrigger (ChevronUp/Down)
│   │   │
│   │   └── CollapsibleContent
│   │       └── CardContent
│   │           ├── Progress Section (if !scanComplete)
│   │           │   ├── Progress Text ("X / Y pages tested")
│   │           │   └── Progress Bar
│   │           │
│   │           ├── Stats Grid (3 columns)
│   │           │   ├── Critical Issues Counter (red)
│   │           │   ├── Warning Issues Counter (yellow)
│   │           │   └── Minor Issues Counter (blue)
│   │           │
│   │           ├── Live Screenshot Section (if screenshot exists)
│   │           │   ├── Section Header (Globe icon + "Live Browser View")
│   │           │   ├── "Real-time" Badge
│   │           │   ├── Screenshot Image
│   │           │   └── Current Page URL
│   │           │
│   │           ├── Activity Log Section
│   │           │   ├── Section Header (Terminal icon + "Activity Log")
│   │           │   └── ScrollArea
│   │           │       └── Log Entries (with icons, timestamps, messages)
│   │           │
│   │           └── Completion Status (if scanComplete)
│   │               └── Success Banner (CheckCircle2 + "Scan Complete")
```

---

## Visual States

### 1. Initial State (No Logs)
```
Component returns null - not visible
```

### 2. Scan Starting
```
┌─────────────────────────────────────────────────────────┐
│ 🧪 Live Accessibility Testing • example.com    🟢 Live ▲│
├─────────────────────────────────────────────────────────┤
│ 0 / 1 pages tested                                  0%  │
│ ▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│ │    0    │  │    0    │  │    0    │                 │
│ │Critical │  │ Warning │  │  Minor  │                 │
│ └─────────┘  └─────────┘  └─────────┘                 │
│                                                         │
│ 💻 Activity Log                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ℹ️  10:30:15  Starting scan for https://example.com ││
│ │ ℹ️  10:30:16  Discovered: https://example.com       ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 3. Scan In Progress (with Screenshot)
```
┌─────────────────────────────────────────────────────────┐
│ 🧪 Live Accessibility Testing • example.com    🟢 Live ▲│
├─────────────────────────────────────────────────────────┤
│ 3 / 5 pages tested                                 60%  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                         │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│ │   12    │  │    8    │  │    5    │                 │
│ │Critical │  │ Warning │  │  Minor  │                 │
│ └─────────┘  └─────────┘  └─────────┘                 │
│                                                         │
│ 🌐 Live Browser View                    [Real-time]    │
│ ┌─────────────────────────────────────────────────────┐│
│ │                                                     ││
│ │         [Screenshot of webpage being tested]       ││
│ │                                                     ││
│ └─────────────────────────────────────────────────────┘│
│ https://example.com/contact                            │
│                                                         │
│ 💻 Activity Log                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ℹ️  10:30:15  Starting scan for https://example.com ││
│ │ ℹ️  10:30:16  Discovered: https://example.com       ││
│ │ ℹ️  10:30:17  Testing [1/5]: https://example.com    ││
│ │ ⚠️  10:30:18  WARNING: color-contrast issue         ││
│ │ ✅ 10:30:19  Completed: https://example.com (4 iss) ││
│ │ ℹ️  10:30:20  Testing [2/5]: https://example.com/ab ││
│ │ ⚠️  10:30:21  CRITICAL: missing-alt-text            ││
│ │ ✅ 10:30:22  Completed: https://example.com/ab (6)  ││
│ │ ℹ️  10:30:23  Testing [3/5]: https://example.com/co ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 4. Scan Complete
```
┌─────────────────────────────────────────────────────────┐
│ 🧪 Live Accessibility Testing • example.com    🟢 Live ▲│
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│ │   25    │  │   18    │  │   12    │                 │
│ │Critical │  │ Warning │  │  Minor  │                 │
│ └─────────┘  └─────────┘  └─────────┘                 │
│                                                         │
│ 💻 Activity Log                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ℹ️  10:30:15  Starting scan for https://example.com ││
│ │ ℹ️  10:30:16  Discovered: https://example.com       ││
│ │ ...                                                 ││
│ │ ✅ 10:30:45  Completed: https://example.com/cont... ││
│ │ ✅ 10:30:46  Scan complete! Found 55 issues across  ││
│ │              5 pages                                ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │         ✅ Scan Complete                            ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 5. Collapsed State
```
┌─────────────────────────────────────────────────────────┐
│ 🧪 Live Accessibility Testing • example.com    🟢 Live ▼│
└─────────────────────────────────────────────────────────┘
```

### 6. Disconnected State
```
┌─────────────────────────────────────────────────────────┐
│ 🧪 Live Accessibility Testing • example.com  ⚫ Disconn ▲│
├─────────────────────────────────────────────────────────┤
│ ... (content remains visible but no updates)           │
└─────────────────────────────────────────────────────────┘
```

---

## Component Props

```typescript
interface LiveTestingPanelProps {
  estateId: string;      // Required - Estate to monitor
  estateName?: string;   // Optional - Display name in header
}
```

### Usage Examples

```tsx
// Basic usage
<LiveTestingPanel estateId="estate_123" />

// With estate name
<LiveTestingPanel 
  estateId="estate_123" 
  estateName="example.com" 
/>

// In AIAgent page
{messages.map(msg => (
  msg.metadata?.estateId && (
    <LiveTestingPanel 
      estateId={msg.metadata.estateId}
      estateName={msg.metadata.estateName}
    />
  )
))}
```

---

## Styling Details

### Colors

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Critical issues | Red | `text-red-500` |
| Warning issues | Yellow | `text-yellow-500` |
| Minor issues | Blue | `text-blue-500` |
| Success messages | Green | `text-green-500` |
| Error messages | Red | `text-red-500` |
| Info messages | Muted | `text-muted-foreground` |
| Live indicator | Green (pulsing) | `bg-green-500 animate-pulse` |
| Disconnected indicator | Gray | `bg-gray-400` |
| Card border | Primary (20% opacity) | `border-primary/20` |

### Icons

| Icon | Component | Usage |
|------|-----------|-------|
| 🧪 | `TestTube2` | Panel header |
| 🌐 | `Globe` | Live browser view section |
| 💻 | `Terminal` | Activity log section |
| ✅ | `CheckCircle2` | Success messages, completion |
| ❌ | `XCircle` | Error messages |
| ⚠️ | `AlertTriangle` | Warning messages |
| ℹ️ | `Terminal` | Info messages |
| 🔄 | `Loader2` | Loading states (if needed) |
| ▲ | `ChevronUp` | Collapse trigger (expanded) |
| ▼ | `ChevronDown` | Collapse trigger (collapsed) |

### Spacing

```css
/* Card */
.card {
  border-radius: 0.5rem;
  border-width: 1px;
}

/* Card Header */
.card-header {
  padding-bottom: 0.75rem; /* pb-3 */
}

/* Card Content */
.card-content {
  gap: 1rem; /* space-y-4 */
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem; /* gap-2 */
}

/* Activity Log */
.activity-log {
  height: 12rem; /* h-48 */
  padding: 0.75rem; /* p-3 */
}
```

---

## Responsive Behavior

### Desktop (≥1024px)
- Full width panel
- 3-column stats grid
- Screenshot displayed at full width
- Activity log height: 12rem

### Tablet (768px - 1023px)
- Full width panel
- 3-column stats grid (slightly narrower)
- Screenshot displayed at full width
- Activity log height: 12rem

### Mobile (<768px)
- Full width panel
- 3-column stats grid (compact)
- Screenshot displayed at full width
- Activity log height: 12rem
- Smaller font sizes for log entries

---

## Accessibility Features

### Keyboard Navigation
- **Tab** - Navigate between interactive elements
- **Enter/Space** - Toggle collapse/expand
- **Escape** - Close panel (if modal)

### Screen Reader Support
```tsx
// Connection status
<div role="status" aria-live="polite">
  {isConnected ? 'Live' : 'Disconnected'}
</div>

// Progress bar
<Progress 
  value={progress} 
  aria-label={`Scan progress: ${pagesTested} of ${totalPages} pages tested`}
/>

// Activity log
<ScrollArea 
  role="log" 
  aria-live="polite" 
  aria-atomic="false"
>
  {logs.map(log => (
    <div role="listitem" key={log.id}>
      {log.message}
    </div>
  ))}
</ScrollArea>

// Screenshot
<img 
  src={`data:image/jpeg;base64,${screenshot}`}
  alt="Current page screenshot"
  data-testid="img-live-screenshot-panel"
/>
```

### ARIA Labels
- Panel: `aria-label="Live accessibility testing panel"`
- Collapse button: `aria-label="Toggle panel visibility"`
- Progress bar: `aria-label="Scan progress"`
- Activity log: `aria-label="Scan activity log"`

---

## Animation & Transitions

### Connection Indicator
```css
/* Pulsing green dot when connected */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

### Collapse/Expand
```tsx
<Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
  {/* Smooth height transition handled by Collapsible component */}
</Collapsible>
```

### Auto-scroll
```typescript
// Auto-scroll to bottom when new logs arrive
useEffect(() => {
  if (scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
}, [logs]);
```

---

## Data Flow

```
WebSocket Message
      ↓
onmessage handler
      ↓
Parse JSON
      ↓
Switch on message.type
      ↓
Update state (setLogs, setProgress, etc.)
      ↓
React re-renders component
      ↓
UI updates in real-time
```

---

## State Management

### Local State
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

### Refs
```typescript
const wsRef = useRef<WebSocket | null>(null);
const scrollRef = useRef<HTMLDivElement>(null);
const maxTotalPagesRef = useRef(0);
```

---

## Testing

### Test IDs
```tsx
// Panel
data-testid="panel-live-testing"

// Screenshot
data-testid="img-live-screenshot-panel"

// Log entries
data-testid="log-scan_start"
data-testid="log-page_discovered"
data-testid="log-page_testing"
data-testid="log-page_complete"
data-testid="log-issue_found"
data-testid="log-scan_complete"
data-testid="log-scan_error"
```

### Example Tests
```typescript
import { render, screen } from '@testing-library/react';
import { LiveTestingPanel } from './LiveTestingPanel';

test('renders panel when logs exist', () => {
  const { container } = render(
    <LiveTestingPanel estateId="test_123" />
  );
  
  // Simulate WebSocket message
  const ws = mockWebSocket.instances[0];
  ws.simulateMessage({
    type: 'scan_start',
    data: { baseUrl: 'https://example.com' }
  });
  
  expect(screen.getByTestId('panel-live-testing')).toBeInTheDocument();
});

test('displays screenshot when received', () => {
  render(<LiveTestingPanel estateId="test_123" />);
  
  const ws = mockWebSocket.instances[0];
  ws.simulateMessage({
    type: 'page_complete',
    data: { screenshot: 'base64string...' }
  });
  
  const img = screen.getByTestId('img-live-screenshot-panel');
  expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,base64string...');
});

test('updates issue counters', () => {
  render(<LiveTestingPanel estateId="test_123" />);
  
  const ws = mockWebSocket.instances[0];
  ws.simulateMessage({
    type: 'issue_found',
    data: { 
      issue: { severity: 'critical' }
    }
  });
  
  expect(screen.getByText('1')).toBeInTheDocument(); // Critical counter
});
```

---

## Performance Considerations

### Optimization Techniques

1. **Memoization**
   ```typescript
   const getSeverityColor = useMemo(() => (severity?: string) => {
     switch (severity) {
       case 'success': return 'text-green-500';
       case 'error': return 'text-red-500';
       case 'warning': return 'text-yellow-500';
       default: return 'text-muted-foreground';
     }
   }, []);
   ```

2. **Virtual Scrolling** (for large log lists)
   ```typescript
   import { useVirtualizer } from '@tanstack/react-virtual';
   
   const virtualizer = useVirtualizer({
     count: logs.length,
     getScrollElement: () => scrollRef.current,
     estimateSize: () => 24, // Height of each log entry
   });
   ```

3. **Debounced Updates**
   ```typescript
   const debouncedSetProgress = useMemo(
     () => debounce(setProgress, 100),
     []
   );
   ```

4. **Lazy Screenshot Loading**
   ```typescript
   <img 
     src={`data:image/jpeg;base64,${screenshot}`}
     loading="lazy"
     alt="Current page screenshot"
   />
   ```

---

## Customization

### Custom Themes
```typescript
// Override default colors
<LiveTestingPanel 
  estateId="estate_123"
  theme={{
    critical: 'text-red-600',
    warning: 'text-orange-500',
    minor: 'text-blue-400',
  }}
/>
```

### Custom Icons
```typescript
// Replace default icons
<LiveTestingPanel 
  estateId="estate_123"
  icons={{
    success: <CustomSuccessIcon />,
    error: <CustomErrorIcon />,
    warning: <CustomWarningIcon />,
  }}
/>
```

### Custom Log Formatter
```typescript
// Custom message formatting
<LiveTestingPanel 
  estateId="estate_123"
  formatMessage={(message) => {
    return `[${message.type}] ${message.data.url}`;
  }}
/>
```

---

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Opera | 76+ | ✅ Full |

### WebSocket Support
All modern browsers support WebSocket API. For older browsers, consider using a polyfill:

```typescript
if (!window.WebSocket) {
  // Load WebSocket polyfill
  import('websocket-polyfill');
}
```

---

## Related Components

- **VisualTestingModal** - Full-screen modal version with video recording
- **ScanProgressCard** - Simplified progress display for dashboard
- **ActivityLogViewer** - Standalone activity log component
- **IssueCounter** - Reusable issue statistics component

---

## Resources

- [Shadcn/ui Components](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Testing Library](https://testing-library.com/react)

