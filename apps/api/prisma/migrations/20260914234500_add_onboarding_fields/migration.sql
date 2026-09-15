-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "numberOfUsers" INTEGER;
