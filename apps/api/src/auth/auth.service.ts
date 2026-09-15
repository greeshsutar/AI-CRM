import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtPayload, AuthenticatedUser } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Validates JWT payload and synchronizes application user profile.
   */
  async validateUserPayload(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload: missing sub claim');
    }

    if (payload.email) {
      await this.usersService.findOrCreateFromSupabase({
        id: payload.sub,
        email: payload.email,
      });
    }

    return {
      userId: payload.sub,
      email: payload.email,
      aal: payload.aal === 'aal2' ? 'aal2' : 'aal1',
    };
  }
}
