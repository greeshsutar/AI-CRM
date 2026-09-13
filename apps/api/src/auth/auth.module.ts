import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SuperAdminMfaGuard } from './guards/super-admin-mfa.guard';

@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [JwtStrategy, JwtAuthGuard, SuperAdminMfaGuard],
  exports: [JwtAuthGuard, SuperAdminMfaGuard, PassportModule],
})
export class AuthModule {}
