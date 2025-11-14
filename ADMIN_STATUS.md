# Admin Panel Status

## 🔴 Currently: DISABLED

The separate admin panel application is **disabled** but fully functional and ready to use.

## 📁 Location

The admin panel code is located in the `admin/` directory.

## 🔓 How to Enable

### Quick Start (Manual)

```bash
cd admin
npm install  # First time only
npm run dev
```

Admin panel will be available at: **http://localhost:3001**

### Enable npm Scripts

Edit `package.json` and remove the underscore (`_`) prefix from these scripts:
- `_dev:admin` → `dev:admin`
- `_dev:all` → `dev:all`
- `_build:admin` → `build:admin`
- `_build:all` → `build:all`

Then run:
```bash
npm run dev:all
```

## 📚 Documentation

- **[admin/DISABLED.md](admin/DISABLED.md)** - How to re-enable
- **[admin/README.md](admin/README.md)** - Admin panel documentation
- **[ADMIN_PANEL_SETUP.md](ADMIN_PANEL_SETUP.md)** - Setup guide
- **[DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)** - Deployment info

## 🔐 Admin Credentials

```
Email: admin@testraai.com
Password: admin123
```

## ✨ Why It's Disabled

The admin panel is disabled by default to:
- Reduce resource usage during development
- Simplify the development workflow
- Allow you to enable it only when needed

## 🚀 Current Setup

**Active:**
- Main application: http://localhost:3000
- Backend API: http://localhost:3000/api

**Disabled:**
- Admin panel: http://localhost:3001 (not running)

---

**To enable the admin panel, see [admin/DISABLED.md](admin/DISABLED.md)**

