# 📤 How to Upload MCP Server to New Repl

## Quick Steps:

### **Step 1: Download the Package**

From **this Repl**, download:
```
mcp-server/mcp-server-standalone.tar.gz
```

**How to download:**
1. Click on the file in the file tree
2. Click the **three dots (⋮)** in the top right
3. Select **"Download"**

The file will download to your computer (12KB).

---

### **Step 2: Create New Repl**

1. Go to https://replit.com
2. Click **"+ Create Repl"**
3. Choose template: **"Node.js"**
4. Name your Repl: `accessibility-mcp-server`
5. Click **"Create Repl"**

---

### **Step 3: Upload to New Repl**

**Option A: Drag & Drop (Easiest)**

1. In your new Repl, look at the left sidebar (file tree)
2. **Drag** `mcp-server-standalone.tar.gz` from your computer
3. **Drop** it into the file tree

**Option B: Upload Button**

1. In the file tree, click the **three dots (⋮)** menu
2. Click **"Upload file"**
3. Select `mcp-server-standalone.tar.gz`
4. Click **"Open"**

---

### **Step 4: Extract the Files**

In your new Repl's **Shell** (bottom panel), run:

```bash
tar -xzf mcp-server-standalone.tar.gz
```

This creates a folder `mcp-server-standalone/`.

Move files to root:
```bash
mv mcp-server-standalone/* .
rm -rf mcp-server-standalone mcp-server-standalone.tar.gz
```

---

### **Step 5: Verify Files**

Check that you have these files in the root:

```bash
ls -la
```

You should see:
- ✅ `index.js`
- ✅ `exportUtils.js`
- ✅ `fileServer.js`
- ✅ `package.json`
- ✅ `start.sh`
- ✅ `start.bat`
- ✅ `README.md`

---

### **Step 6: Install Dependencies**

```bash
npm install
```

This will take 1-2 minutes.

---

### **Step 7: Install Playwright Browsers**

```bash
npm run install-browsers
```

This will take 2-3 minutes (one-time setup).

---

### **Step 8: Run the Server**

```bash
node index.js
```

**Expected output:**
```
Accessibility Testing MCP Server running on stdio
[FileServer] 🚀 Running on http://localhost:3456
[FileServer] 📁 Serving files from: /home/runner/mcp-accessibility-reports
```

✅ **Success! Your MCP server is deployed!**

---

## 🎥 Visual Guide:

### **Uploading Files:**

```
Your New Repl
┌─────────────────────────────────────┐
│  📁 Files                   ⋮ Menu │  ← Click three dots
│  ├─ .gitignore                     │
│  ├─ index.js (old)                 │
│  ├─ package.json (old)             │
│  └─ ...                            │
│                                     │
│  [Drag file here]                  │  ← Or drag & drop
│                                     │
└─────────────────────────────────────┘
```

---

## 🔄 Alternative: Copy Files Manually

If you don't want to download/upload, copy files one by one:

### **For each file:**

1. **In this Repl:** Open file → Select All (Ctrl+A) → Copy (Ctrl+C)
2. **In new Repl:** Create file with same name → Paste (Ctrl+V)

**Files to copy:**
1. `mcp-server/mcp-server-standalone/index.js`
2. `mcp-server/mcp-server-standalone/exportUtils.js`
3. `mcp-server/mcp-server-standalone/fileServer.js`
4. `mcp-server/mcp-server-standalone/package.json`
5. `mcp-server/mcp-server-standalone/start.sh`
6. `mcp-server/mcp-server-standalone/start.bat`
7. `mcp-server/mcp-server-standalone/README.md`

---

## 🆘 Troubleshooting:

### **"Can't find upload button"**
- Look for the **⋮** (three dots) menu in the file tree
- Make sure you're in the file tree (left sidebar), not the code editor

### **"Drag & drop not working"**
- Make sure you're dragging into the **file tree area** (left sidebar)
- Try the upload button method instead

### **"File upload failed"**
- Check your internet connection
- Try uploading a smaller file first to test
- Use the manual copy-paste method

### **"Files extracted but can't find them"**
- Run `ls -la` to list all files
- Make sure you ran the `mv` command to move them to root
- Check you're in the right directory: `pwd`

---

## ✅ Quick Checklist:

- [ ] Downloaded `mcp-server-standalone.tar.gz` from this Repl
- [ ] Created new Repl named `accessibility-mcp-server`
- [ ] Uploaded archive to new Repl
- [ ] Extracted files: `tar -xzf mcp-server-standalone.tar.gz`
- [ ] Moved to root: `mv mcp-server-standalone/* .`
- [ ] Verified files exist: `ls -la`
- [ ] Installed dependencies: `npm install`
- [ ] Installed browsers: `npm run install-browsers`
- [ ] Started server: `node index.js`
- [ ] Saw success message!

---

**You're ready to go! Follow these steps and your MCP server will be deployed! 🚀**
