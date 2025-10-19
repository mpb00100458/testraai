# ⚡ Quick Deploy - MCP Server for OpenAI Testing

Deploy your accessibility scanner as a separate instance in **5 minutes**!

---

## 🚀 Deploy to New Replit Instance

### **Step 1: Create Deployment Package**

In your current Repl (this one):

```bash
cd mcp-server
./deploy-package.sh
```

This creates `mcp-server-standalone/` with everything you need!

### **Step 2: Create New Repl**

1. Go to https://replit.com
2. Click **"+ Create Repl"**
3. Choose **"Node.js"**
4. Name: `accessibility-mcp-server`
5. Click **"Create"**

### **Step 3: Upload Deployment Package**

In your new Repl:

1. Delete the default `index.js`
2. Upload the entire `mcp-server-standalone/` folder
3. Move all files to root:
   ```bash
   mv mcp-server-standalone/* .
   rm -rf mcp-server-standalone
   ```

### **Step 4: Install & Run**

```bash
npm install
npm run install-browsers
node index.js
```

**Expected output:**
```
Accessibility Testing MCP Server running on stdio
[FileServer] 🚀 Running on http://localhost:3456
[FileServer] 📁 Serving files from: /home/runner/mcp-accessibility-reports
```

✅ **Your MCP server is now deployed!**

---

## 🤖 Connect from OpenAI Agents SDK

### **Method 1: Same Machine (Easiest)**

If you're running OpenAI code on the **same Replit instance**:

```python
from agents import Agent, Runner
from agents.mcp import MCPServerStdio
import asyncio

async def test():
    async with MCPServerStdio(
        name="accessibility",
        command="node",
        args=["index.js"]  # Or full path: /home/runner/accessibility-mcp-server/index.js
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

asyncio.run(test())
```

### **Method 2: From Local Machine**

If your MCP server is on Replit but you're running OpenAI code **locally**:

**Option A: Clone and run locally**
```bash
# On your local machine
git clone <your-mcp-server-repl>
cd accessibility-mcp-server
npm install
npm run install-browsers

# Then use Method 1 code above
```

**Option B: Use SSH (if Replit supports it)**
```python
async with MCPServerStdio(
    command="ssh",
    args=[
        "your-username@accessibility-mcp-server.repl.co",
        "node",
        "/home/runner/accessibility-mcp-server/index.js"
    ]
) as server:
    # ... same as above
```

---

## 📦 What's Included in Deployment Package

```
mcp-server-standalone/
├── index.js              # Main MCP server
├── exportUtils.js        # Excel/JSON/Markdown exports
├── fileServer.js         # HTTP download server
├── package.json          # Dependencies
├── start.sh              # Linux/Mac launcher
├── start.bat             # Windows launcher
├── README.md             # Usage guide
└── .gitignore
```

**Size:** ~40KB (before node_modules)

---

## 🧪 Test Your Deployment

### **Test 1: Server Starts**

```bash
node index.js
```

Should output:
```
Accessibility Testing MCP Server running on stdio
[FileServer] 🚀 Running on http://localhost:3456
```

Press Ctrl+C to stop.

### **Test 2: OpenAI Connection**

Save as `test.py`:

```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio
import os

os.environ['OPENAI_API_KEY'] = 'your-key-here'

async def main():
    async with MCPServerStdio(
        name="accessibility",
        command="node",
        args=["index.js"]
    ) as server:
        agent = Agent(model="gpt-4o-mini", mcp_servers=[server])
        result = await Runner.run(agent, "List your tools")
        print(result)

asyncio.run(main())
```

Run:
```bash
python test.py
```

### **Test 3: Full Scan**

```python
result = await Runner.run(
    agent,
    "Scan https://example.com and record a video"
)
```

Should return accessibility report + video download link!

---

## 💰 Deployment Costs

| Platform | Cost | Resources |
|----------|------|-----------|
| **Replit (Free)** | $0 | Shared, restarts |
| **Replit Reserved VM** | $7/mo | 1 vCPU, 1GB RAM, always-on |
| **AWS EC2 t3.micro** | ~$8.50/mo | 2 vCPU, 1GB RAM |
| **DigitalOcean** | $6/mo | 1 vCPU, 1GB RAM |

**Recommendation for testing:** Free Replit or $7 Reserved VM

---

## ✅ Success Checklist

After deployment, verify:

- [ ] `npm install` completes without errors
- [ ] `npm run install-browsers` installs Playwright browsers
- [ ] `node index.js` starts server successfully
- [ ] Server logs show "running on stdio"
- [ ] HTTP server starts on port 3456
- [ ] OpenAI agent can connect
- [ ] Scans complete and return results
- [ ] Download links work (http://localhost:3456/)

---

## 🔄 Update Deployment

When you make changes to the MCP server:

1. **Rebuild:**
   ```bash
   cd mcp-server
   npm run build
   ```

2. **Create new package:**
   ```bash
   ./deploy-package.sh
   ```

3. **Upload to deployment:**
   - Copy new files from `mcp-server-standalone/`
   - Or redeploy entire package

---

## 🆘 Troubleshooting

### **"Cannot find module '@modelcontextprotocol/sdk'"**

```bash
npm install
```

### **"Playwright browsers not found"**

```bash
npm run install-browsers
# Or:
npx playwright install
npx playwright install-deps
```

### **"Permission denied: index.js"**

```bash
chmod +x index.js
```

### **"Port 3456 already in use"**

Another process is using that port. HTTP downloads won't work but MCP server will still function.

### **OpenAI can't connect**

- Make sure server is running (`node index.js`)
- Use correct path to index.js
- Check OpenAI API key is set
- Try running test script first

---

## 📚 Full Documentation

- **Complete Deployment Guide:** `DEPLOYMENT_GUIDE.md`
- **OpenAI Testing:** `OPENAI_TESTING.md`
- **Feature Docs:** `README.md`, `VISUAL_FEEDBACK.md`, `EXPORT_FEATURES.md`
- **Download Links:** `DOWNLOAD_LINKS.md`

---

## 🎯 Next Steps

**After deploying:**

1. ✅ Test with OpenAI (see `OPENAI_TESTING.md`)
2. ✅ Test video recording
3. ✅ Test Excel exports
4. ✅ Try full accessibility scan
5. ✅ Check download links work

---

**Your MCP server is ready to deploy! Just run `./deploy-package.sh` and upload to a new Repl! 🚀**
