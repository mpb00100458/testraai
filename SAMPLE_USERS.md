# Sample User Credentials

This document contains the credentials for sample users created in the Agentium application.

## 🌐 Application URLs

- **Main Application**: http://localhost:3000
- **Regular User Login**: http://localhost:3000/login
- **Admin Panel Login**: http://localhost:3000/admin/login

---

## 👤 Regular User Account

Use this account to test the regular user experience (workspaces, projects, accessibility scans).

**Login URL**: http://localhost:3000/login

```
Email: demo@agentium.com
Password: password123
```

**Access Level**: Regular user
- Create and manage workspaces
- Create and manage projects
- Run accessibility scans
- View scan reports
- Use AI Agent for testing
- Access Live Testing Panel

---

## 🔐 Admin Panel Accounts

### Super Admin (Full Access)

**Login URL**: http://localhost:3000/admin/login

```
Email: admin@agentium.com
Password: admin123
```

**Access Level**: SUPER_ADMIN
- Full access to admin panel
- Manage MCP servers
- Manage all users
- View and manage billing
- System-wide settings
- All admin features

---

### Billing Admin

**Login URL**: http://localhost:3000/admin/login

```
Email: billing@agentium.com
Password: billing123
```

**Access Level**: BILLING_ADMIN
- Manage subscriptions
- View billing information
- Manage payment methods
- View usage statistics
- Limited user management (billing-related)

---

### Support Admin

**Login URL**: http://localhost:3000/admin/login

```
Email: support@agentium.com
Password: support123
```

**Access Level**: SUPPORT_ADMIN
- Manage user accounts
- View user activity
- Suspend/activate users
- Reset passwords
- View support tickets
- Limited system access

---

## 🔄 Recreating Sample Users

If you need to recreate the sample users (e.g., after resetting the database):

```bash
npx tsx --env-file=.env scripts/create-sample-users.ts
```

**Note**: If users already exist, you'll see an error. You can either:
1. Use the existing credentials above
2. Delete the users from the database first
3. Modify the script to use different email addresses

---

## 🧪 Testing Scenarios

### Regular User Flow
1. Login at http://localhost:3000/login with `demo@agentium.com`
2. Create a new workspace
3. Create a project within the workspace
4. Navigate to AI Agent
5. Ask the AI to scan a website (e.g., "Scan https://example.com for accessibility issues")
6. Watch the Live Testing Panel for real-time updates
7. View the generated report

### Admin Panel Flow
1. Login at http://localhost:3000/admin/login with `admin@agentium.com`
2. Navigate to Users section
3. View all registered users
4. Navigate to MCP Servers section
5. Manage MCP server configurations
6. Navigate to Billing section
7. View subscription and usage data

---

## 🔒 Security Notes

⚠️ **IMPORTANT**: These are sample credentials for development/testing only!

- **DO NOT** use these credentials in production
- **DO NOT** commit these credentials to version control (this file is for local reference only)
- **ALWAYS** change default passwords in production environments
- **ALWAYS** use strong, unique passwords for production accounts

---

## 📝 Password Requirements

The application requires:
- Minimum 6 characters
- Passwords are hashed using scrypt with random salt
- Session-based authentication with secure cookies

---

## 🛠️ Troubleshooting

### Can't login?
1. Make sure the dev server is running: `npm run dev`
2. Check that the database is accessible
3. Verify the user exists in the database:
   ```bash
   psql testraai -c "SELECT email, \"systemRole\", status FROM users;"
   ```

### Forgot to create users?
Run the creation script:
```bash
npx tsx --env-file=.env scripts/create-sample-users.ts
```

### Need to reset a password?
You can manually update the password in the database or modify the creation script to update existing users.

---

## 📚 Related Documentation

- [Live Testing Implementation](docs/LIVE_TESTING_IMPLEMENTATION.md)
- [Live Testing Quick Reference](docs/LIVE_TESTING_QUICK_REFERENCE.md)
- [Main README](replit.md)

---

**Last Updated**: 2025-10-28
**Application Version**: 1.0.0

