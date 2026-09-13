import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { DatabaseModule } from '../database';
import { AuthModule } from '../auth';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SuperAdminController],
})
export class SuperAdminModule {}
