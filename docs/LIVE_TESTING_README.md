# Live Accessibility Testing - Documentation Index

## 📚 Documentation Overview

This directory contains comprehensive documentation for the **Live Accessibility Testing** feature in Agentium. The feature provides real-time visual feedback during accessibility scans, allowing users to see live screenshots, activity logs, and issue statistics as the AI agent tests web pages for WCAG compliance.

---

## 📖 Documentation Files

### 1. [LIVE_TESTING_IMPLEMENTATION.md](./LIVE_TESTING_IMPLEMENTATION.md)
**Complete Implementation Guide** - 1,100+ lines

Comprehensive technical documentation covering:
- Architecture overview with diagrams
- Frontend implementation (LiveTestingPanel, AIAgent)
- Backend implementation (WebSocket, RealScanAgent, API routes)
- Event flow diagrams
- Message formats (7 event types)
- Security considerations
- Performance optimizations
- Testing strategies
- Troubleshooting guide
- Future enhancements

**Best for:** Understanding the complete system architecture and implementation details.

---

### 2. [LIVE_TESTING_QUICK_REFERENCE.md](./LIVE_TESTING_QUICK_REFERENCE.md)
**Developer Quick Reference** - 400+ lines

Quick reference guide with:
- Key files and their purposes
- WebSocket event types and data structures
- Frontend usage examples
- Backend usage examples
- API endpoints
- Common patterns (progress bar, issue counter, activity log)
- Security checklist
- Performance tips
- Debugging techniques
- Testing examples
- Troubleshooting table
- Best practices

**Best for:** Day-to-day development work and quick lookups.

---

### 3. [LIVE_TESTING_UI_COMPONENTS.md](./LIVE_TESTING_UI_COMPONENTS.md)
**UI Components Guide** - 500+ lines

Visual guide covering:
- Component hierarchy
- Visual states (6 different states)
- Component props and usage
- Styling details (colors, icons, spacing)
- Responsive behavior
- Accessibility features (keyboard, screen reader, ARIA)
- Animation & transitions
- Data flow
- State management
- Testing with test IDs
- Performance considerations
- Customization options
- Browser compatibility

**Best for:** Frontend developers working on UI/UX and styling.

---

## 🚀 Quick Start

### For New Developers

1. **Start here:** Read the [Architecture Overview](#architecture-overview) section below
2. **Understand the flow:** Review the [Event Flow Diagram](#event-flow-diagram) 
3. **See it in action:** Check the [Visual States](./LIVE_TESTING_UI_COMPONENTS.md#visual-states) in the UI guide
4. **Build something:** Use the [Quick Reference](./LIVE_TESTING_QUICK_REFERENCE.md) for code examples

### For Frontend Developers

1. Read [LIVE_TESTING_UI_COMPONENTS.md](./LIVE_TESTING_UI_COMPONENTS.md)
2. Review the [Frontend Implementation](./LIVE_TESTING_IMPLEMENTATION.md#frontend-implementation) section
3. Check [Common Patterns](./LIVE_TESTING_QUICK_REFERENCE.md#common-patterns) for reusable code

### For Backend Developers

1. Read the [Backend Implementation](./LIVE_TESTING_IMPLEMENTATION.md#backend-implementation) section
2. Review [WebSocket Manager](./LIVE_TESTING_IMPLEMENTATION.md#1-websocket-manager) details
3. Check [Backend Usage](./LIVE_TESTING_QUICK_REFERENCE.md#backend-usage) for examples

### For QA/Testing

1. Review [Testing](./LIVE_TESTING_IMPLEMENTATION.md#testing) section
2. Check [Test IDs](./LIVE_TESTING_UI_COMPONENTS.md#test-ids) for automation
3. Use [Troubleshooting](./LIVE_TESTING_QUICK_REFERENCE.md#troubleshooting) guide

---

## 🏗️ Architecture Overview

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

## 🔄 Event Flow Diagram

```
User: "Scan example.com"
        ↓
POST /api/ai-agent/chat
        ↓
Create Estate & Trigger Scan
        ↓
Return estateId
        ↓
Frontend subscribes to WebSocket
        ↓
RealScanAgent.runScan(estateId)
        ↓
┌───────────────────────────────────┐
│ For each page:                    │
│  1. emitPageDiscovered()          │
│  2. emitPageTesting()             │
│  3. Run axe-core analysis         │
│  4. Capture screenshot            │
│  5. emitIssueFound() (per issue)  │
│  6. emitPageComplete(screenshot)  │
└───────────────────────────────────┘
        ↓
emitScanComplete()
        ↓
WebSocket broadcasts to clients
        ↓
LiveTestingPanel updates UI
```

---

## 📡 WebSocket Events

### Event Types (7 total)

| Event | Description | Includes Screenshot |
|-------|-------------|---------------------|
| `scan_start` | Scan initialization | ❌ |
| `page_discovered` | New page found | ❌ |
| `page_testing` | Page being tested | ❌ |
| `page_complete` | Page test finished | ✅ |
| `issue_found` | Accessibility issue | ❌ |
| `scan_complete` | All pages tested | ❌ |
| `scan_error` | Error occurred | ❌ |

### Example Event
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
    "screenshot": "base64_encoded_jpeg..."
  }
}
```

---

## 🔑 Key Features

### Real-time Updates
- Live progress tracking (X / Y pages tested)
- Instant issue counters (Critical, Warning, Minor)
- Activity log with timestamped events

### Visual Feedback
- Live browser screenshots (JPEG, 60% quality)
- Color-coded severity indicators
- Animated connection status

### User Experience
- Collapsible panel (maintains connection)
- Auto-scrolling activity log
- Responsive design (mobile-friendly)

### Security
- Session-based WebSocket authentication
- Estate access control
- Subscription isolation

### Performance
- Compressed screenshots (JPEG 60%)
- Concurrent scan support
- Connection reuse

---

## 📁 File Structure

```
Agentium/
├── client/src/
│   ├── components/
│   │   └── LiveTestingPanel.tsx       # Real-time UI panel
│   └── pages/
│       └── AIAgent.tsx                 # Chat interface
│
├── server/
│   ├── websocket.ts                    # WebSocket manager
│   ├── routes.ts                       # API endpoints
│   ├── ai-agent.ts                     # AI processing
│   └── agents/
│       └── realScanAgent.ts            # Scan execution
│
└── docs/
    ├── LIVE_TESTING_README.md          # This file
    ├── LIVE_TESTING_IMPLEMENTATION.md  # Complete guide
    ├── LIVE_TESTING_QUICK_REFERENCE.md # Quick reference
    └── LIVE_TESTING_UI_COMPONENTS.md   # UI guide
```

---

## 🛠️ Common Tasks

### Add a New Event Type

1. **Define event type** in `server/websocket.ts`:
   ```typescript
   type EventType = 'scan_start' | ... | 'new_event';
   ```

2. **Add emit method** in `WebSocketManager`:
   ```typescript
   emitNewEvent(estateId: string, data: any) {
     this.sendToEstate(estateId, { type: 'new_event', estateId, data });
   }
   ```

3. **Emit from scan agent** in `realScanAgent.ts`:
   ```typescript
   wsManager.emitNewEvent(estateId, { /* data */ });
   ```

4. **Handle in frontend** in `LiveTestingPanel.tsx`:
   ```typescript
   case 'new_event':
     // Update state
     break;
   ```

### Customize UI Appearance

1. **Colors** - Edit Tailwind classes in `LiveTestingPanel.tsx`
2. **Icons** - Import from `lucide-react` and replace
3. **Layout** - Modify component hierarchy
4. **Animations** - Add CSS transitions or use Framer Motion

### Debug WebSocket Issues

1. **Enable logging:**
   ```typescript
   ws.onmessage = (e) => console.log('[WS]', JSON.parse(e.data));
   ```

2. **Check Chrome DevTools:**
   - Network tab → WS → Messages

3. **Verify subscription:**
   ```typescript
   ws.send(JSON.stringify({ type: 'subscribe', estateId }));
   // Wait for { type: 'subscribed', estateId }
   ```

---

## 🧪 Testing

### Run Tests
```bash
# Frontend tests
cd client && npm test

# Backend tests
cd server && npm test

# E2E tests
npm run test:e2e
```

### Test Coverage
- WebSocket connection/disconnection
- Event handling (all 7 types)
- UI state updates
- Authentication/authorization
- Error handling

---

## 🐛 Troubleshooting

| Issue | Quick Fix |
|-------|-----------|
| "Disconnected" status | Check session cookie |
| No events received | Verify subscription sent |
| Duplicate events | Check useEffect cleanup |
| Screenshot not showing | Add base64 prefix |
| Access denied | Verify estate ownership |

See [Troubleshooting Guide](./LIVE_TESTING_IMPLEMENTATION.md#troubleshooting) for detailed solutions.

---

## 📊 Performance Metrics

### Screenshot Optimization
- Format: JPEG (not PNG)
- Quality: 60%
- Size: ~50-100KB per screenshot
- Viewport only (not full page)

### WebSocket Efficiency
- Single connection per client
- Multiplexed estates (one connection, many subscriptions)
- Event batching (issues per page, not per node)

### Scan Performance
- Concurrent scans: Unlimited (separate browser instances)
- Page timeout: 30 seconds
- Max pages per estate: 50

---

## 🔮 Future Enhancements

### Planned Features
1. **Reconnection Logic** - Auto-reconnect on disconnect
2. **Event Replay** - View historical scan progress
3. **Multi-Estate Monitoring** - Dashboard for all active scans
4. **Enhanced Screenshots** - Full-page with issue annotations
5. **Performance Metrics** - Page load times, scan duration

See [Future Enhancements](./LIVE_TESTING_IMPLEMENTATION.md#future-enhancements) for details.

---

## 🤝 Contributing

### Before Making Changes

1. Read relevant documentation
2. Check existing tests
3. Follow coding standards
4. Update documentation

### Code Review Checklist

- [ ] WebSocket events properly typed
- [ ] Frontend state management correct
- [ ] Backend authentication verified
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console errors
- [ ] Performance impact considered

---

## 📞 Support

### Getting Help

1. **Check documentation** - Start with Quick Reference
2. **Search issues** - GitHub issues for similar problems
3. **Ask team** - Slack #agentium-dev channel
4. **Create issue** - If bug or feature request

### Useful Links

- [WebSocket API Docs](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Playwright Docs](https://playwright.dev/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 📝 Version History

### v1.0.0 (Current)
- Initial implementation
- 7 WebSocket event types
- Real-time UI panel
- Screenshot support
- Session-based auth
- Concurrent scan support

---

## 📄 License

This documentation is part of the Agentium project.

---

## ✨ Summary

The Live Accessibility Testing feature is a sophisticated real-time monitoring system that combines:

- **WebSocket technology** for instant updates
- **Playwright automation** for browser control
- **axe-core testing** for WCAG compliance
- **React components** for beautiful UI
- **Session authentication** for security

It provides users with an engaging, informative experience while their websites are being tested for accessibility issues.

**Key Benefits:**
- ✅ Real-time feedback
- ✅ Visual confirmation
- ✅ Detailed logging
- ✅ Secure & scalable
- ✅ User-friendly

---

**Happy coding! 🚀**

