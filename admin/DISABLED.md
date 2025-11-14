# Admin Panel - Currently Disabled

The separate admin panel is currently **disabled** but ready to use whenever needed.

## 🔓 How to Re-Enable

### Option 1: Run Admin Panel Manually

```bash
cd admin
npm install  # First time only
npm run dev
```

The admin panel will start on **http://localhost:3001**

**Note**: Make sure the main backend is running on port 3000 first!

### Option 2: Enable npm Scripts

Edit `package.json` in the root directory and remove the underscore prefix from admin scripts:

**Change from:**
```json
"_dev:admin": "cd admin && npm run dev",
"_dev:all": "concurrently \"npm run dev\" \"npm run dev:admin\"",
"_build:admin": "cd admin && npm run build",
"_build:all": "npm run build && npm run build:admin",
```

**To:**
```json
"dev:admin": "cd admin && npm run dev",
"dev:all": "concurrently \"npm run dev\" \"npm run dev:admin\"",
"build:admin": "cd admin && npm run build",
"build:all": "npm run build && npm run build:admin",
```

Then run:
```bash
npm run dev:all
```

## 📚 Documentation

- [Admin Panel README](README.md)
- [Admin Panel Setup Guide](../ADMIN_PANEL_SETUP.md)
- [Deployment Summary](../DEPLOYMENT_SUMMARY.md)

## 🔐 Admin Credentials

When you re-enable the admin panel, use these credentials:

```
Email: admin@testraai.com
Password: admin123
```

## ✨ Features Available

- Global MCP Server Management
- User Management (coming soon)
- Billing Management (coming soon)
- Role-based access control
- Separate authentication

## 🗑️ To Remove Completely

If you want to remove the admin panel entirely:

```bash
# Remove admin directory
rm -rf admin

# Remove admin scripts from package.json
# (already disabled with underscore prefix)

# Remove concurrently dependency (optional)
npm uninstall concurrently
```

---

**The admin panel is ready to use whenever you need it!**

