import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database';
import { UsersModule } from './users';
import { AuthModule } from './auth';
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
  ],
})
export class AppModule {}
