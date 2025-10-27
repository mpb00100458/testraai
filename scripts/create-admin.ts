import { db } from "../server/db";
import { users } from "../shared/schema";
import { hashPassword } from "../server/auth";

async function createAdmin() {
  const email = "admin@testraai.com";
  const password = "Admin123!";
  const hashedPassword = await hashPassword(password);

  try {
    const result = await db.insert(users).values({
      email,
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      systemRole: "SUPER_ADMIN",
      status: "active",
    }).returning();

    console.log("✅ Admin account created successfully!");
    console.log("\n📧 Login Details:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role:     SUPER_ADMIN`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`\n🔗 Admin Portal: /admin/login`);
    
    process.exit(0);
  } catch (error: any) {
    if (error.code === '23505') {
      console.error("❌ Error: User with this email already exists");
    } else {
      console.error("❌ Error creating admin:", error.message);
    }
    process.exit(1);
  }
}

createAdmin();
