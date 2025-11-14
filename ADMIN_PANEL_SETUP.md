# Separate Admin Panel Setup

> ⚠️ **Note**: The admin panel is currently **DISABLED**. See [admin/DISABLED.md](admin/DISABLED.md) for instructions on how to re-enable it.

The TestraAI admin panel is now a **completely separate application** that runs independently from the main app.

## 🏗️ Architecture

```
TestraAI/
├── client/          # Main application (port 3000)
├── admin/           # Admin panel (port 3001)
├── server/          # Shared backend API
└── shared/          # Shared types and schemas
```

### Key Features

- ✅ **Separate codebase** - Admin panel has its own dependencies and build process
- ✅ **Different port** - Main app on 3000, Admin on 3001
- ✅ **Shared backend** - Both apps use the same API server
- ✅ **Independent deployment** - Can be deployed separately
- ✅ **Role-based access** - Only admin users can access

## 🚀 Running the Applications

### Option 1: Run Both Apps Together (Recommended for Development)

```bash
npm run dev:all
```

This will start:
- Main app on **http://localhost:3000**
- Admin panel on **http://localhost:3001**

### Option 2: Run Apps Separately

**Terminal 1 - Backend + Main App:**
```bash
npm run dev
```

**Terminal 2 - Admin Panel:**
```bash
npm run dev:admin
```

### Option 3: Run Only Admin Panel

```bash
cd admin
npm install
npm run dev
```

**Note**: Make sure the backend is running on port 3000 first!

## 🔐 Access URLs

### Main Application
- **URL**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Users**: Regular users and admins

### Admin Panel
- **URL**: http://localhost:3001
- **Login**: Automatic (uses same session as main app)
- **Users**: Only admin roles (SUPER_ADMIN, BILLING_ADMIN, SUPPORT_ADMIN)

## 👥 Admin Credentials

### Super Admin (Full Access)
```
Email: admin@testraai.com
Password: admin123
```

### Billing Admin
```
Email: billing@testraai.com
Password: billing123
```

### Support Admin
```
Email: support@testraai.com
Password: support123
```

## 📦 Building for Production

### Build Both Apps

```bash
npm run build:all
```

This creates:
- `client/dist/` - Main app build
- `admin/dist/` - Admin panel build
- `dist/` - Backend build

### Build Separately

**Main app:**
```bash
npm run build
```

**Admin panel:**
```bash
npm run build:admin
```

## 🚢 Deployment

### Option 1: Deploy Together (Same Server)

1. Build both apps: `npm run build:all`
2. Serve both static builds from the same backend
3. Configure routes:
   - `/` → Main app
   - `/admin` → Admin panel

### Option 2: Deploy Separately (Different Servers)

**Main App:**
1. Build: `npm run build`
2. Deploy `client/dist/` to hosting service
3. Point to backend API

**Admin Panel:**
1. Build: `cd admin && npm run build`
2. Deploy `admin/dist/` to hosting service
3. Point to backend API (can be same or different)

### Environment Variables

Both apps need to know the backend API URL:

**Development** (automatic via Vite proxy):
- Main app proxies `/api` to `http://localhost:3000`
- Admin panel proxies `/api` to `http://localhost:3000`

**Production**:
Set `VITE_API_URL` environment variable or configure your hosting service to proxy `/api` requests to your backend.

## 🔧 Development

### Admin Panel Structure

```
admin/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── admin-sidebar.tsx
│   │   └── ThemeToggle.tsx
│   ├── pages/
│   │   ├── Admin.tsx        # Dashboard
│   │   ├── AdminLogin.tsx   # Login page
│   │   └── AdminMCPServers.tsx
│   ├── layouts/
│   │   └── AdminLayout.tsx
│   ├── lib/
│   │   └── utils.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

### Adding New Admin Features

1. **Create page component** in `admin/src/pages/`
2. **Add route** in `admin/src/App.tsx`
3. **Add menu item** in `admin/src/components/admin-sidebar.tsx`
4. **Add backend API** in `server/routes.ts` with admin middleware
5. **Test** with admin credentials

### Shared Components

The admin panel uses its own copy of UI components. If you need to share components between main app and admin panel:

1. Move shared components to `shared/components/`
2. Import from `@shared/components` in both apps
3. Update `tsconfig.json` paths in both apps

## 🔒 Security

### Authentication Flow

1. User logs in via main app or admin panel
2. Session cookie is set (shared between both apps on localhost)
3. Both apps check `/api/user` to verify authentication
4. Admin panel additionally checks for admin role

### Role-Based Access Control

- **SUPER_ADMIN**: Full access to all admin features
- **BILLING_ADMIN**: Access to billing and dashboard
- **SUPPORT_ADMIN**: Access to user management and dashboard

### API Security

All admin API routes use middleware:
- `isAuthenticated` - Checks if user is logged in
- `requireSuperAdmin` - Checks for SUPER_ADMIN role
- `requireBillingAdmin` - Checks for BILLING_ADMIN or SUPER_ADMIN
- `requireSupportAdmin` - Checks for SUPPORT_ADMIN or SUPER_ADMIN

## 🐛 Troubleshooting

### Admin panel shows "Loading..." forever

- Make sure the backend is running on port 3000
- Check browser console for API errors
- Verify you're logged in with an admin account

### "Failed to fetch" errors

- Ensure backend is running: `npm run dev`
- Check Vite proxy configuration in `admin/vite.config.ts`
- Verify API routes are correct

### Can't access admin panel

- Make sure you're using an admin account (not regular user)
- Check user role in database:
  ```sql
  SELECT email, system_role FROM users WHERE email = 'admin@testraai.com';
  ```

### Changes not reflecting

- Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
- Clear browser cache
- Restart dev server

## 📚 Related Documentation

- [Main App README](replit.md)
- [Admin Panel README](admin/README.md)
- [Sample Users](SAMPLE_USERS.md)
- [API Documentation](docs/API.md)

## 🎯 Next Steps

1. **Start both apps**: `npm run dev:all`
2. **Access main app**: http://localhost:3000
3. **Access admin panel**: http://localhost:3001
4. **Login with admin credentials**
5. **Explore admin features**

---

**Questions?** Check the troubleshooting section or create an issue on GitHub.

