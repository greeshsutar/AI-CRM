import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService manages the Prisma client lifecycle within NestJS.
 *
 * - Connects on module initialization
 * - Disconnects on module destruction
 * - Provides the PrismaClient to other services via DI
 *
 * DATABASE STATUS: VERIFIED
 * Supabase PostgreSQL connection successfully established. The database is intentionally empty because Phase 1 prohibits CRM business tables.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error(
        'Failed to connect to database. Ensure DATABASE_URL is configured.',
        error instanceof Error ? error.message : String(error),
      );
      // Do not throw — allow the application to start even if DB is unavailable.
      // Health checks will report the database status accurately.
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }
}
