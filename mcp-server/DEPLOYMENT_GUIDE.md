# 🚀 Deploying MCP Server for OpenAI Testing

This guide shows you how to deploy your accessibility MCP server as a **separate instance** for testing with OpenAI's agent platform.

---

## 🎯 Deployment Options

### **Option 1: Replit Reserved VM** (Recommended)
Deploy as a persistent Replit instance with dedicated resources.

### **Option 2: Replit Autoscale Deployment**
Deploy as a scalable service with automatic scaling.

### **Option 3: External VPS**
Deploy to any server (AWS, DigitalOcean, etc.)

---

## 🚀 Option 1: Replit Reserved VM Deployment

### **Step 1: Create New Repl**

1. Go to https://replit.com
2. Click **"+ Create Repl"**
3. Choose **"Node.js"** template
4. Name it: `accessibility-mcp-server`
5. Click **"Create Repl"**

### **Step 2: Copy MCP Server Files**

In your new Repl, create these files:

**`package.json`:**
```json
{
  "name": "accessibility-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc && chmod +x dist/index.js",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "@axe-core/playwright": "*",
    "playwright": "*",
    "exceljs": "*"
  },
  "devDependencies": {
    "typescript": "*",
    "@types/node": "*"
  }
}
```

**Copy these files from your current Repl:**
- `mcp-server/index.ts` → `index.ts`
- `mcp-server/exportUtils.ts` → `exportUtils.ts`
- `mcp-server/fileServer.ts` → `fileServer.ts`
- `mcp-server/tsconfig.json` → `tsconfig.json`

### **Step 3: Build**

```bash
npm install
npm run build
```

### **Step 4: Test Locally**

```bash
node dist/index.js
```

Should output:
```
Accessibility Testing MCP Server running on stdio
[FileServer] 🚀 Running on http://localhost:3456
```

### **Step 5: Deploy to Reserved VM**

1. Click **"Deploy"** button in Replit
2. Choose **"Reserved VM"**
3. Configure:
   - **VM Size:** Starter (1 vCPU, 1GB RAM)
   - **Run Command:** `node dist/index.js`
   - **Always On:** Yes

4. Click **"Deploy"**

### **Step 6: Get Deployment URL**

Your deployment will be at:
```
https://accessibility-mcp-server.your-username.repl.co
```

---

## 🤖 Connecting from OpenAI Agents SDK

### **Method 1: SSH Access (Most Reliable)**

If your deployment has SSH access, connect like this:

```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio

async def test_remote_scanner():
    # Connect via SSH to remote Replit instance
    async with MCPServerStdio(
        name="accessibility-remote",
        command="ssh",
        args=[
            "your-username@accessibility-mcp-server.repl.co",
            "node",
            "/home/runner/accessibility-mcp-server/dist/index.js"
        ]
    ) as server:
        agent = Agent(
            name="Accessibility Expert",
            model="gpt-4o-mini",
            mcp_servers=[server]
        )
        
        result = await Runner.run(
            agent,
            "Scan https://example.com for accessibility issues"
        )
        print(result)

asyncio.run(test_remote_scanner())
```

### **Method 2: Local Deployment (Simpler)**

For local testing, deploy on your own machine:

```python
async with MCPServerStdio(
    name="accessibility",
    command="node",
    args=["/path/to/mcp-server/dist/index.js"]
) as server:
    # Same as before
    ...
```

---

## 🎯 Option 2: Standalone Deployment Package

Create a **portable deployment package**:

### **Step 1: Create Deployment Directory**

```bash
mkdir mcp-server-deploy
cd mcp-server-deploy
```

### **Step 2: Copy Files**

Copy from your current project:
```bash
cp mcp-server/dist/* .
cp mcp-server/package.json .
cp -r mcp-server/node_modules .  # Or run npm install
```

### **Step 3: Create Start Script**

**`start.sh`:**
```bash
#!/bin/bash
echo "🚀 Starting Accessibility MCP Server..."
node index.js
```

**`start.bat`** (Windows):
```batch
@echo off
echo Starting Accessibility MCP Server...
node index.js
```

### **Step 4: Deploy Anywhere**

**Upload to any server:**
```bash
# Example: AWS EC2
scp -r mcp-server-deploy ubuntu@your-server.com:/home/ubuntu/

# SSH and run
ssh ubuntu@your-server.com
cd mcp-server-deploy
chmod +x start.sh
./start.sh
```

---

## 🌐 Option 3: HTTP/SSE Wrapper (For Remote HTTP Access)

For remote HTTP access without SSH, create a wrapper server:

### **Create `http-wrapper.js`:**

```javascript
import http from 'http';
import { spawn } from 'child_process';

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'mcp-server' }));
    return;
  }

  if (req.url === '/scan' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const { url, maxPages } = JSON.parse(body);
      
      // Spawn MCP server for each request
      const mcp = spawn('node', ['dist/index.js']);
      
      let output = '';
      mcp.stdout.on('data', data => (output += data));
      mcp.on('close', () => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(output);
      });
      
      // Send scan request to MCP server via stdin
      mcp.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'scan_website_accessibility',
          arguments: { url, maxPages }
        }
      }));
      mcp.stdin.end();
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`HTTP wrapper running on port ${PORT}`);
});
```

**Deploy this wrapper:**
```bash
node http-wrapper.js
```

**Call from anywhere:**
```bash
curl -X POST http://your-server.com:8080/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "maxPages": 5}'
```

---

## 🧪 Testing Your Deployment

### **Test 1: Health Check**

```bash
# For HTTP deployment
curl http://your-deployment-url/health

# For stdio deployment
echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | node dist/index.js
```

### **Test 2: OpenAI Agent Connection**

```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio

async def test_deployment():
    async with MCPServerStdio(
        name="accessibility",
        command="node",
        args=["dist/index.js"]  # Or remote path
    ) as server:
        agent = Agent(
            name="Test Agent",
            model="gpt-4o-mini",
            mcp_servers=[server]
        )
        
        # Quick test
        result = await Runner.run(agent, "List your available tools")
        print(result)

asyncio.run(test_deployment())
```

---

## 📦 Complete Deployment Checklist

- [ ] MCP server built (`npm run build`)
- [ ] All dependencies installed
- [ ] Playwright browsers installed
- [ ] File permissions correct (`chmod +x dist/index.js`)
- [ ] Port 3456 available (for download server)
- [ ] Environment variables set (if needed)
- [ ] Firewall configured (if applicable)
- [ ] Health check passes
- [ ] OpenAI agent can connect
- [ ] Scans complete successfully

---

## 🔒 Security Considerations

### **For Production Deployments:**

1. **Authentication:** Add API key authentication
2. **Rate Limiting:** Limit requests per IP/key
3. **CORS:** Configure allowed origins
4. **HTTPS:** Use TLS/SSL encryption
5. **Input Validation:** Sanitize all URLs
6. **Resource Limits:** Set max pages, timeouts
7. **Monitoring:** Add logging and alerts

---

## 💰 Cost Estimates

### **Replit Reserved VM:**
- **Starter:** $7/month (1 vCPU, 1GB RAM)
- **Standard:** $20/month (2 vCPU, 2GB RAM)
- **Pro:** $40/month (4 vCPU, 4GB RAM)

### **AWS EC2:**
- **t3.micro:** ~$8.50/month (2 vCPU, 1GB RAM)
- **t3.small:** ~$17/month (2 vCPU, 2GB RAM)

### **DigitalOcean Droplet:**
- **Basic:** $6/month (1 vCPU, 1GB RAM)
- **Regular:** $12/month (1 vCPU, 2GB RAM)

---

## 🎯 Recommended Setup

**For Testing:**
- ✅ Local deployment (free)
- ✅ Replit dev environment (free)

**For Production:**
- ✅ Replit Reserved VM ($7-20/month)
- ✅ AWS/DO with autoscaling ($10-50/month)

---

## 🆘 Troubleshooting

### **"Cannot connect to MCP server"**
- Check server is running: `ps aux | grep node`
- Verify port not blocked: `netstat -tulpn | grep 3456`
- Test manually: `echo '{}' | node dist/index.js`

### **"Playwright browsers not found"**
```bash
npx playwright install
npx playwright install-deps
```

### **"Permission denied"**
```bash
chmod +x dist/index.js
chmod +x start.sh
```

### **"Out of memory"**
Increase VM size or reduce `maxPages` parameter.

---

## 📚 Resources

- **MCP Specification:** https://modelcontextprotocol.io
- **OpenAI Agents SDK:** https://openai.github.io/openai-agents-python/
- **Replit Deployments:** https://docs.replit.com/hosting/deployments
- **Your MCP Docs:** See `README.md`, `TEST_GUIDE.md`, `OPENAI_TESTING.md`

---

**Ready to deploy your accessibility scanner! 🚀**

Choose your deployment method and follow the steps above!
