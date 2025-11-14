# LiveTestingPanel Debugging Guide

## Current Issue

You're seeing "Waiting for first page to load..." in the LiveTestingPanel, even though the server logs show WebSocket events are being emitted successfully.

## What to Check in Browser Console

### 1. Open Browser Console
- **Safari**: Press `Cmd + Option + C`
- **Chrome**: Press `Cmd + Option + J`

### 2. Look for These Messages

#### ✅ **Expected Messages (Good)**
```
[LiveTestingPanel] ========================================
[LiveTestingPanel] Component function called with estateId: 623e811c-c469-4925-ae01-66ed0e418443
[LiveTestingPanel] ========================================
[LiveTestingPanel] ⚡ useEffect TRIGGERED with estateId: 623e811c-c469-4925-ae01-66ed0e418443
[LiveTestingPanel] ✅ Setting up WebSocket for estate: 623e811c-c469-4925-ae01-66ed0e418443
[LiveTestingPanel] 🔌 WebSocket connecting to: ws://localhost:3000
[LiveTestingPanel] ✅ WebSocket connected!
[LiveTestingPanel] 📤 Subscribing to estate: 623e811c-c469-4925-ae01-66ed0e418443
[LiveTestingPanel] 📨 WebSocket message received: { type: 'scan_start', ... }
[LiveTestingPanel] 📨 WebSocket message received: { type: 'page_discovered', ... }
[LiveTestingPanel] 📨 WebSocket message received: { type: 'page_testing', ... }
[LiveTestingPanel] 📸 Screenshot updated
```

#### ❌ **Problem Messages (Bad)**
```
[LiveTestingPanel] ❌ No estateId, skipping WebSocket setup
[LiveTestingPanel] ❌ WebSocket error: ...
[LiveTestingPanel] 🔌 WebSocket disconnected
[LiveTestingPanel] 🧹 Cleanup: Closing WebSocket
```

### 3. Check for Errors

Look for any **red error messages** in the console, especially:
- WebSocket connection errors
- CORS errors
- Network errors
- React errors

## Common Issues & Solutions

### Issue 1: WebSocket Not Connecting
**Symptoms:**
- No `[LiveTestingPanel] ✅ WebSocket connected!` message
- See `WebSocket error` messages

**Solution:**
- Check that the app is running on `http://localhost:3000`
- Check that WebSocket URL is correct (should be `ws://localhost:3000`)
- Check browser console for CORS or network errors

### Issue 2: WebSocket Connecting But No Messages
**Symptoms:**
- See `[LiveTestingPanel] ✅ WebSocket connected!`
- See `[LiveTestingPanel] 📤 Subscribing to estate: ...`
- But NO `[LiveTestingPanel] 📨 WebSocket message received` messages

**Solution:**
- This is the current issue we're debugging
- The server IS sending messages (we can see in server logs)
- But the client is NOT receiving them
- Possible causes:
  1. WebSocket subscription not working
  2. Estate ID mismatch
  3. WebSocket disconnecting too quickly
  4. React component unmounting before messages arrive

### Issue 3: Component Unmounting Too Quickly
**Symptoms:**
- See `[LiveTestingPanel] 🧹 Cleanup: Closing WebSocket` immediately after connection
- Component mounts and unmounts rapidly

**Solution:**
- This was the issue we were debugging earlier
- The LiveTestingPanel was unmounting when the scan completed
- We added `key={estateIdToUse}` to force remounting
- We added `placeholderData` to prevent messages array from becoming empty

## What to Share

Please share the following from your browser console:

1. **All `[LiveTestingPanel]` messages** - Copy and paste them
2. **Any red error messages** - Full error text
3. **Network tab** - Check if WebSocket connection is established
   - In Safari: Developer → Show Web Inspector → Network tab
   - Look for a WebSocket connection (ws://)
   - Check if it's "Connected" or "Closed"

## Quick Test

1. **Clear the conversation** (delete all messages)
2. **Open browser console** (Cmd + Option + C)
3. **Start a new scan** by typing: "scan https://google.com"
4. **Watch the console** for `[LiveTestingPanel]` messages
5. **Copy all console output** and share it

## Server Logs Show

From the server logs, we can see:
```
[WS] Emit scan_start to estate 623e811c-c469-4925-ae01-66ed0e418443, clients: 1
[WS] Emit page_discovered to estate 623e811c-c469-4925-ae01-66ed0e418443, clients: 1
[WS] Emit page_testing to estate 623e811c-c469-4925-ae01-66ed0e418443, clients: 1
[WS] Emit issue_found to estate 623e811c-c469-4925-ae01-66ed0e418443, clients: 1
[WS] Emit page_complete to estate 623e811c-c469-4925-ae01-66ed0e418443, clients: 1
```

This confirms:
- ✅ WebSocket server is working
- ✅ Client is subscribed (clients: 1)
- ✅ Events are being emitted
- ❓ But client is not receiving them (or not processing them)

## Next Steps

Once you share the browser console output, we can:
1. Identify exactly where the issue is
2. Fix the WebSocket message handling
3. Ensure LiveTestingPanel receives and displays updates in real-time

---

**Please share your browser console output now!** 🙏

