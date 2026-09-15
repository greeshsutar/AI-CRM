import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SuperAdminMfaGuard } from './guards/super-admin-mfa.guard';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, SuperAdminMfaGuard],
  exports: [AuthService, JwtAuthGuard, SuperAdminMfaGuard, PassportModule],
})
export class AuthModule {}
