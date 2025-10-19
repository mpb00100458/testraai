# 🚀 Deploy Your MCP Server NOW

## Quick Deployment Steps:

### **Step 1: Download the Package**

Download this file from your current Repl:
```
mcp-server/mcp-server-standalone.tar.gz  (12KB)
```

Or download individual files from:
```
mcp-server/mcp-server-standalone/
```

### **Step 2: Create New Replit**

1. Open https://replit.com in a new tab
2. Click **"+ Create Repl"**
3. Choose **"Node.js"**
4. Name: `accessibility-mcp-server`
5. Click **"Create Repl"**

### **Step 3: Upload Files**

**Method A: Upload Archive**
1. In your new Repl, upload `mcp-server-standalone.tar.gz`
2. Open Shell and run:
   ```bash
   tar -xzf mcp-server-standalone.tar.gz
   mv mcp-server-standalone/* .
   rm -rf mcp-server-standalone mcp-server-standalone.tar.gz
   ```

**Method B: Upload Individual Files**
1. Delete the default `index.js` in new Repl
2. Upload all files from `mcp-server/mcp-server-standalone/`:
   - index.js
   - exportUtils.js
   - fileServer.js
   - package.json
   - start.sh
   - start.bat
   - README.md

### **Step 4: Install Dependencies**

In your new Repl's Shell:
```bash
npm install
```

This will take 1-2 minutes.

### **Step 5: Install Playwright Browsers**

```bash
npm run install-browsers
```

This will take 2-3 minutes (one-time setup).

### **Step 6: Run the Server**

```bash
node index.js
```

**You should see:**
```
Accessibility Testing MCP Server running on stdio
[FileServer] 🚀 Running on http://localhost:3456
[FileServer] 📁 Serving files from: /home/runner/mcp-accessibility-reports
```

✅ **Your MCP server is now deployed!**

---

## 🤖 **Test with OpenAI (in the same Repl)**

### **1. Install OpenAI SDK:**

In your deployed Repl:
```bash
pip install openai-agents
```

### **2. Add OPENAI_API_KEY Secret:**

1. Click the lock icon 🔒 in left sidebar
2. Add secret:
   - Key: `OPENAI_API_KEY`
   - Value: `your-api-key-here`

### **3. Create Test Script:**

Create `test-openai.py` in your deployed Repl:

```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio
import os

async def main():
    print("🤖 Testing MCP Server with OpenAI...")
    
    async with MCPServerStdio(
        name="accessibility",
        command="node",
        args=["index.js"]
    ) as server:
        agent = Agent(
            name="Accessibility Expert",
            model="gpt-4o-mini",
            mcp_servers=[server]
        )
        
        # Test 1: List available tools
        print("\n📋 Test 1: List tools...")
        result = await Runner.run(
            agent,
            "What tools do you have available?"
        )
        print(result)
        
        # Test 2: Scan a website
        print("\n🔍 Test 2: Scan website...")
        result = await Runner.run(
            agent,
            "Scan https://example.com for accessibility issues and record a video"
        )
        print(result)

if __name__ == "__main__":
    asyncio.run(main())
```

### **4. Run Test:**

```bash
python test-openai.py
```

You should see the agent use your MCP server to scan websites! 🎉

---

## 💰 **Deployment Cost:**

- **Free Tier:** Works but may restart
- **Reserved VM ($7/mo):** Always-on, dedicated resources
- **Autoscale Deployment ($):** Scales automatically

For testing, **free tier is fine**!

---

## 🎯 **Alternative: Test Locally First**

If you want to test on your local machine before deploying:

### **1. Copy Deployment Folder:**

Copy `mcp-server/mcp-server-standalone/` to your local machine.

### **2. Install & Run:**

```bash
cd mcp-server-standalone
npm install
npm run install-browsers
node index.js
```

### **3. Test with OpenAI:**

Same Python script as above!

---

## ✅ **Success Checklist:**

After deployment:

- [ ] `npm install` completed successfully
- [ ] `npm run install-browsers` installed Playwright
- [ ] `node index.js` starts without errors
- [ ] Logs show "running on stdio"
- [ ] HTTP server starts on port 3456
- [ ] OpenAI test script runs successfully
- [ ] Scans complete and return results

---

## 🆘 **Need Help?**

If you run into issues:

1. **Server won't start:** Check Node.js version (need 18+)
2. **Browsers not found:** Run `npx playwright install`
3. **OpenAI won't connect:** Verify API key is set
4. **Port 3456 in use:** That's OK, MCP still works

---

**You're ready to deploy! Follow the steps above and let me know if you need help! 🚀**
