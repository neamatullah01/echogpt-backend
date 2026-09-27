import { PrismaClient } from '../src/generated/prisma/client.js';
import { RoleName, UserStatus } from '../src/generated/prisma/enums.js';
import * as bcrypt from 'bcrypt';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: {},
    create: { name: RoleName.ADMIN },
  });

  const userRole = await prisma.role.upsert({
    where: { name: RoleName.USER },
    update: {},
    create: { name: RoleName.USER },
  });

  console.log('Seeding subscription plans...');
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Free' },
    update: {},
    create: {
      name: 'Free',
      monthlyChatLimit: 100,
      monthlySearchLimit: 50,
      maxPromptLength: 4000,
      supportsStreaming: false,
      isActive: true,
    },
  });

  const premiumPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Premium' },
    update: {},
    create: {
      name: 'Premium',
      monthlyChatLimit: 1000,
      monthlySearchLimit: 500,
      maxPromptLength: 8000,
      supportsStreaming: true,
      isActive: true,
    },
  });

  console.log('Seeding admin user...');
  const adminEmail = 'admin@echogpt.com';
  const adminPassword = 'admin1234';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: passwordHash },
    create: {
      name: 'Super Admin',
      email: adminEmail,
      passwordHash: passwordHash,
      emailVerified: true,
      status: UserStatus.ACTIVE,
      roleId: adminRole.id,
    },
  });

  console.log('Admin user created/verified:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
