import { PrismaClient } from '@prisma/client';
import { bootstrapSuperAdmin } from '../src/super-admin/bootstrap-super-admin';

const prisma = new PrismaClient();

async function main() {
  console.log('--- MINSTOCS CRM: Super Admin Bootstrap Seed ---');
  try {
    const result = await bootstrapSuperAdmin(prisma);
    console.log(`[BOOTSTRAP SUCCESS] ${result.message}`);
  } catch (error) {
    console.error(`[BOOTSTRAP FAILED] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
