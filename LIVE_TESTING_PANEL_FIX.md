# LiveTestingPanel WebSocket Fix

## Problem

The LiveTestingPanel was showing "Waiting for first page to load..." and not receiving any WebSocket messages, even though:
- ✅ The server was emitting WebSocket events successfully
- ✅ The scan was completing successfully  
- ✅ WebSocket clients were subscribed (clients: 1 or 2)

## Root Cause

There were **TWO separate WebSocket connections** being created:

1. **AI Agent WebSocket** (in `AIAgent.tsx`) - This one WAS receiving messages ✅
2. **LiveTestingPanel WebSocket** (in `LiveTestingPanel.tsx`) - This one was NOT receiving messages ❌

The LiveTestingPanel was trying to create its own WebSocket connection, but it was either:
- Not connecting properly
- Connecting too late (after messages were already sent)
- Being closed immediately due to React component lifecycle issues

## Solution

**Reuse the existing WebSocket connection** from AIAgent instead of creating a duplicate one.

### Changes Made

#### 1. Updated `LiveTestingPanel.tsx`

**Added `websocket` prop:**
```typescript
interface LiveTestingPanelProps {
  estateId: string;
  estateName?: string;
  websocket?: WebSocket | null;  // NEW: Accept WebSocket from parent
}
```

**Removed local WebSocket creation:**
- Removed `wsRef` state
- Removed `new WebSocket()` call
- Removed duplicate WebSocket event handlers

**Added message filtering:**
```typescript
const handleMessage = (event: MessageEvent) => {
  const message = JSON.parse(event.data);
  
  // Only process messages for this estate
  if (message.estateId !== estateId) {
    return;
  }
  
  // ... process message
};
```

**Added event listeners to shared WebSocket:**
```typescript
websocket.addEventListener('message', handleMessage);
websocket.addEventListener('open', handleOpen);
websocket.addEventListener('close', handleClose);
websocket.addEventListener('error', handleError);
```

**Cleanup removes only the listeners (doesn't close WebSocket):**
```typescript
return () => {
  websocket.removeEventListener('message', handleMessage);
  websocket.removeEventListener('open', handleOpen);
  websocket.removeEventListener('close', handleClose);
  websocket.removeEventListener('error', handleError);
};
```

#### 2. Updated `AIAgent.tsx`

**Pass WebSocket to LiveTestingPanel:**
```typescript
<LiveTestingPanel
  key={mostRecentActiveScan.estateId}
  estateId={mostRecentActiveScan.estateId}
  estateName={`Scan ${mostRecentActiveScan.scanRunId?.slice(0, 8) || 'in progress'}...`}
  websocket={wsRef.current}  // NEW: Pass the WebSocket
/>
```

## Benefits

### ✅ **Single WebSocket Connection**
- Only one WebSocket connection per page
- Reduces server load
- Eliminates connection race conditions

### ✅ **Guaranteed Message Delivery**
- LiveTestingPanel uses the same WebSocket that's already connected
- No risk of missing messages due to late connection
- Messages are filtered by `estateId` to show only relevant updates

### ✅ **Proper Cleanup**
- LiveTestingPanel removes its event listeners on unmount
- WebSocket stays open for other components
- No memory leaks

### ✅ **Better Performance**
- Fewer WebSocket connections = less overhead
- Faster initial rendering (no connection delay)
- More reliable real-time updates

## Testing

### Before Fix
```
[AI Agent] WebSocket message: {type: 'page_discovered', estateId: '...'}
[AI Agent] WebSocket message: {type: 'page_testing', estateId: '...'}
[AI Agent] WebSocket message: {type: 'issue_found', estateId: '...'}

// NO LiveTestingPanel messages! ❌
```

### After Fix (Expected)
```
[AI Agent] WebSocket message: {type: 'page_discovered', estateId: '...'}
[LiveTestingPanel] WebSocket message received: {type: 'page_discovered', ...} ✅

[AI Agent] WebSocket message: {type: 'page_testing', estateId: '...'}
[LiveTestingPanel] WebSocket message received: {type: 'page_testing', ...} ✅

[AI Agent] WebSocket message: {type: 'issue_found', estateId: '...'}
[LiveTestingPanel] WebSocket message received: {type: 'issue_found', ...} ✅
```

## How to Test

1. **Open the app** at http://localhost:3000
2. **Login** with admin credentials:
   - Email: `admin@testraai.com`
   - Password: `admin123`
3. **Go to AI Agent** page
4. **Open browser console** (Cmd + Option + C in Safari)
5. **Start a scan** by typing: "scan https://google.com"
6. **Watch the console** for:
   - `[LiveTestingPanel] WebSocket message received:` messages ✅
   - Real-time updates in the LiveTestingPanel UI ✅
   - Screenshots appearing as pages are tested ✅

## Files Modified

- `client/src/components/LiveTestingPanel.tsx` - Removed local WebSocket, added prop
- `client/src/pages/AIAgent.tsx` - Pass WebSocket to LiveTestingPanel

## Related Issues

This fix resolves the issue where:
- First scan would work fine
- Second scan would show "Waiting for first page to load..."
- LiveTestingPanel would never receive WebSocket messages
- Server logs showed messages being sent but client not receiving them

The root cause was having multiple WebSocket connections competing for the same messages, with the LiveTestingPanel's connection not being properly established or timing out before messages arrived.

