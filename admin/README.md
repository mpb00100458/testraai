# TestraAI Admin Panel

Separate admin panel application for TestraAI platform administration.

## 🚀 Quick Start

### Development

```bash
cd admin
npm install
npm run dev
```

The admin panel will run on **http://localhost:3001**

### Production Build

```bash
cd admin
npm run build
npm run preview
```

## 🔐 Admin Credentials

### Super Admin
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

## 📋 Features

- **Global MCP Server Management** (Super Admin only)
- **User Management** (Support Admin and above)
- **Billing Management** (Billing Admin and above)
- **Separate authentication** from main app
- **Role-based access control**

## 🏗️ Architecture

- **Port**: 3001 (main app runs on 3000)
- **API**: Proxies to main backend on port 3000
- **Framework**: React + Vite + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query

## 🔧 Configuration

The admin panel proxies all `/api/*` requests to the main backend running on port 3000. Make sure the main backend is running before starting the admin panel.

## 📦 Deployment

The admin panel can be deployed separately from the main application:

1. Build the admin panel: `npm run build`
2. Deploy the `dist/` folder to your hosting service
3. Configure environment variables to point to the backend API

## 🛠️ Development

### File Structure

```
admin/
├── src/
│   ├── components/     # UI components
│   ├── pages/          # Admin pages
│   ├── layouts/        # Layout components
│   ├── lib/            # Utilities
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

### Adding New Admin Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add menu item in `src/components/admin-sidebar.tsx`
4. Add role-based access control

## 🔒 Security

- Only users with admin roles can access the panel
- Role-based access control for different sections
- Separate authentication flow from main app
- Session-based authentication with secure cookies

## 📚 Related Documentation

- [Main App README](../replit.md)
- [Sample Users](../SAMPLE_USERS.md)

