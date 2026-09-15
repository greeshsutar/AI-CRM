import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { Membership, Role } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Create a new Membership (V8: POST /memberships, permission: memberships.manage)
   * Enforces target existence, duplicate checks, and cross-tenant authorization checks.
   */
  async create(dto: CreateMembershipDto, requesterUserId: string): Promise<Membership> {
    // 1. Verify target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!targetUser) {
      throw new NotFoundException(`User with ID '${dto.userId}' not found`);
    }

    // 2. Verify target organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });
    if (!organization) {
      throw new NotFoundException(`Organization with ID '${dto.organizationId}' not found`);
    }

    // 3. Authorization check:
    // Requester must be a CUSTOMER_ADMIN or SUPER_ADMIN in the target organization,
    // OR the organization must currently have 0 memberships (initial bootstrap).
    const existingCount = await this.prisma.membership.count({
      where: { organizationId: dto.organizationId },
    });

    if (existingCount > 0) {
      const requesterMembership = await this.prisma.membership.findFirst({
        where: {
          userId: requesterUserId,
          organizationId: dto.organizationId,
          status: 'ACTIVE',
        },
      });

      if (!requesterMembership) {
        throw new ForbiddenException('Access denied: You are not a member of this organization');
      }

      if (
        requesterMembership.role !== Role.CUSTOMER_ADMIN &&
        requesterMembership.role !== Role.SUPER_ADMIN
      ) {
        throw new ForbiddenException('Access denied: Insufficient permissions to create memberships');
      }
    }

    // 4. Check for duplicate membership
    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: dto.userId,
          organizationId: dto.organizationId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this organization');
    }

    // 5. Create membership
    const createdMembership = await this.prisma.membership.create({
      data: {
        userId: dto.userId,
        organizationId: dto.organizationId,
        role: dto.role ?? Role.AGENT,
        status: 'ACTIVE',
      },
      include: {
        organization: true,
        user: true,
      },
    });

    await this.auditLogsService.log({
      actorId: requesterUserId,
      organizationId: createdMembership.organizationId,
      action: 'membership.created',
      targetResource: `membership:${createdMembership.id}`,
      metadata: {
        targetUserId: createdMembership.userId,
        role: createdMembership.role,
        status: createdMembership.status,
      },
    });

    return createdMembership;
  }

  /**
   * List memberships accessible to the user (V8: GET /memberships, permission: memberships.read)
   * Returns memberships belonging to organizations where the user is an active member.
   */
  async findAllForUser(userId: string): Promise<Membership[]> {
    return this.prisma.membership.findMany({
      where: {
        organization: {
          memberships: {
            some: {
              userId,
              status: 'ACTIVE',
            },
          },
        },
      },
      include: {
        organization: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get membership details by ID for authenticated user (V8: GET /memberships/:id, permission: memberships.read)
   * Enforces tenant isolation — throws NotFoundException if membership doesn't exist or user lacks access.
   */
  async findByIdForUser(id: string, userId: string): Promise<Membership> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        id,
        organization: {
          memberships: {
            some: {
              userId,
              status: 'ACTIVE',
            },
          },
        },
      },
      include: {
        organization: true,
        user: true,
      },
    });

    if (!membership) {
      throw new NotFoundException(`Membership with ID '${id}' not found`);
    }

    return membership;
  }
}
