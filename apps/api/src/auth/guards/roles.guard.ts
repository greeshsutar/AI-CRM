import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../database';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Determine target organizationId from query, params, or header
    const organizationId =
      request.query?.organizationId ||
      request.params?.organizationId ||
      (request.params?.id && typeof request.params.id === 'string' && request.params.id.length > 20 ? request.params.id : undefined) ||
      request.headers?.['x-organization-id'];

    // Retrieve active memberships for user
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId: user.userId,
        status: 'ACTIVE',
      },
    });

    // 1. Global SUPER_ADMIN bypass
    const isGlobalSuperAdmin = memberships.some((m) => m.role === Role.SUPER_ADMIN);
    if (isGlobalSuperAdmin) {
      return true;
    }

    // 2. Organization-scoped role check
    if (!organizationId) {
      throw new ForbiddenException('Organization context (organizationId) is required for RBAC verification');
    }

    const targetMembership = memberships.find((m) => m.organizationId === organizationId);
    if (!targetMembership) {
      throw new ForbiddenException('Access denied: You are not an active member of this organization');
    }

    const hasRole = requiredRoles.includes(targetMembership.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: Required role (${requiredRoles.join(', ')}) not held in this organization`,
      );
    }

    return true;
  }
}
