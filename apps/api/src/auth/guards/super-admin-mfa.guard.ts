import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database';
import { Role, MembershipStatus } from '@prisma/client';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

@Injectable()
export class SuperAdminMfaGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const superAdminMembership = await this.prisma.membership.findFirst({
      where: {
        userId: user.userId,
        role: Role.SUPER_ADMIN,
        status: MembershipStatus.ACTIVE,
      },
    });

    // Non-Super Admins (CUSTOMER_ADMIN, MANAGER, AGENT) are not subject to Super Admin MFA requirement
    if (!superAdminMembership) {
      return true;
    }

    // Super Admin must have verified aal2 authentication level in JWT
    if (user.aal !== 'aal2') {
      throw new ForbiddenException('Multi-factor authentication required');
    }

    return true;
  }
}
