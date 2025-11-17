import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create admin user
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash: adminPassword,
      isAdmin: true,
      canModifySystemPrompt: true,
      canCreateUsers: true,
    },
  });

  console.log("Created admin user:", admin.email);

  // Create test user
  const userPassword = await hash("user123", 12);
  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      name: "Test User",
      passwordHash: userPassword,
      isAdmin: false,
    },
  });

  console.log("Created test user:", user.email);

  // Create system settings
  const settings = await prisma.systemSettings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      updatedBy: admin.id,
      settings: {
        appName: "Writeoff Main Portal",
        version: "1.0.0",
      },
    },
  });

  console.log("Created system settings:", settings.id);

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

