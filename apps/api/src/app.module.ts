import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database';
import { UsersModule } from './users';
import { AuthModule } from './auth';
import { OrganizationsModule } from './organizations/organizations.module';
import { MembershipsModule } from './memberships/memberships.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { TeamsModule } from './teams/teams.module';
import { MailModule } from './mail/mail.module';
import { InvitationsModule } from './invitations/invitations.module';
import { appConfig } from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env'],
    }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    MembershipsModule,
    SuperAdminModule,
    AuditLogsModule,
    TeamsModule,
    MailModule,
    InvitationsModule,
  ],
})
export class AppModule {}

