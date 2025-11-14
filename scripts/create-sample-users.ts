import { db } from "../server/db";
import { users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createSampleUsers() {
  console.log("🔧 Creating sample users...\n");

  try {
    // 1. Regular User
    console.log("Creating regular user...");
    const regularUserPassword = await hashPassword("password123");
    const regularUser = await db.insert(users).values({
      email: "demo@testraai.com",
      password: regularUserPassword,
      firstName: "Demo",
      lastName: "User",
      status: "active",
    }).returning();
    console.log("✓ Regular User Created:");
    console.log("  Email: demo@testraai.com");
    console.log("  Password: password123");
    console.log("  Access: Regular user dashboard\n");

    // 2. Super Admin
    console.log("Creating super admin...");
    const superAdminPassword = await hashPassword("admin123");
    const superAdmin = await db.insert(users).values({
      email: "admin@testraai.com",
      password: superAdminPassword,
      firstName: "Super",
      lastName: "Admin",
      systemRole: "SUPER_ADMIN",
      status: "active",
    }).returning();
    console.log("✓ Super Admin Created:");
    console.log("  Email: admin@testraai.com");
    console.log("  Password: admin123");
    console.log("  Access: Full admin panel (MCP servers, users, billing)\n");

    // 3. Billing Admin
    console.log("Creating billing admin...");
    const billingAdminPassword = await hashPassword("billing123");
    const billingAdmin = await db.insert(users).values({
      email: "billing@testraai.com",
      password: billingAdminPassword,
      firstName: "Billing",
      lastName: "Admin",
      systemRole: "BILLING_ADMIN",
      status: "active",
    }).returning();
    console.log("✓ Billing Admin Created:");
    console.log("  Email: billing@testraai.com");
    console.log("  Password: billing123");
    console.log("  Access: Billing and subscription management\n");

    // 4. Support Admin
    console.log("Creating support admin...");
    const supportAdminPassword = await hashPassword("support123");
    const supportAdmin = await db.insert(users).values({
      email: "support@testraai.com",
      password: supportAdminPassword,
      firstName: "Support",
      lastName: "Admin",
      systemRole: "SUPPORT_ADMIN",
      status: "active",
    }).returning();
    console.log("✓ Support Admin Created:");
    console.log("  Email: support@testraai.com");
    console.log("  Password: support123");
    console.log("  Access: User account management\n");

    console.log("==========================================");
    console.log("✅ All sample users created successfully!");
    console.log("==========================================\n");

    console.log("📋 SUMMARY:\n");
    console.log("Regular User Login (http://localhost:3000/login):");
    console.log("  Email: demo@testraai.com");
    console.log("  Password: password123\n");

    console.log("Admin Panel Login (http://localhost:3000/admin/login):");
    console.log("  Super Admin:");
    console.log("    Email: admin@testraai.com");
    console.log("    Password: admin123");
    console.log("    Access: Full admin panel\n");
    
    console.log("  Billing Admin:");
    console.log("    Email: billing@testraai.com");
    console.log("    Password: billing123");
    console.log("    Access: Billing & subscriptions\n");
    
    console.log("  Support Admin:");
    console.log("    Email: support@testraai.com");
    console.log("    Password: support123");
    console.log("    Access: User management\n");

    console.log("🚀 You can now login with any of these accounts!");
    console.log("   Regular users: http://localhost:3000/login");
    console.log("   Admin panel: http://localhost:3000/admin/login\n");

  } catch (error: any) {
    if (error.code === '23505') {
      console.error("\n❌ Error: Users already exist!");
      console.error("   The sample users have already been created.");
      console.error("   Use the credentials above to login.\n");
      
      console.log("📋 EXISTING USER CREDENTIALS:\n");
      console.log("Regular User (http://localhost:3000/login):");
      console.log("  Email: demo@testraai.com");
      console.log("  Password: password123\n");

      console.log("Admin Panel (http://localhost:3000/admin/login):");
      console.log("  Super Admin:");
      console.log("    Email: admin@testraai.com");
      console.log("    Password: admin123\n");
      
      console.log("  Billing Admin:");
      console.log("    Email: billing@testraai.com");
      console.log("    Password: billing123\n");
      
      console.log("  Support Admin:");
      console.log("    Email: support@testraai.com");
      console.log("    Password: support123\n");
    } else {
      console.error("❌ Error creating users:", error);
    }
  }

  process.exit(0);
}

createSampleUsers();

