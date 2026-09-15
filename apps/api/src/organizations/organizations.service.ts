import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OnboardOrganizationDto } from './dto/onboard-organization.dto';
import { Organization, Membership, Role } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MailService } from '../mail/mail.service';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Onboard a new Organization owner:
   * Safely creates User profile (if missing), Organization, and CUSTOMER_ADMIN Membership inside an ACID transaction.
   */
  async onboard(
    dto: OnboardOrganizationDto,
    user: AuthenticatedUser,
  ): Promise<{ organization: Organization; membership: Membership }> {
    // 1. Generate base slug from company name if slug is not provided
    const baseSlug =
      dto.slug ||
      dto.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') ||
      'org';

    // 2. Check if user ALREADY has an active CUSTOMER_ADMIN membership for an organization with this name/slug (idempotency check)
    const existingMembership = await this.prisma.membership.findFirst({
      where: {
        userId: user.userId,
        role: Role.CUSTOMER_ADMIN,
        organization: {
          OR: [{ slug: baseSlug }, { name: dto.companyName }],
        },
      },
      include: { organization: true },
    });

    if (existingMembership) {
      return {
        organization: existingMembership.organization,
        membership: existingMembership,
      };
    }

    // 3. Ensure slug uniqueness
    let finalSlug = baseSlug;
    let counter = 1;
    while (await this.prisma.organization.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 4. Perform atomic creation within a database transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // a) Ensure user profile exists and update fields if provided
      const userProfile = await tx.user.upsert({
        where: { id: user.userId },
        update: {
          ...(dto.firstName ? { firstName: dto.firstName } : {}),
          ...(dto.lastName ? { lastName: dto.lastName } : {}),
          ...(dto.phone ? { phone: dto.phone } : {}),
        },
        create: {
          id: user.userId,
          email: user.email,
          firstName: dto.firstName ?? null,
          lastName: dto.lastName ?? null,
          phone: dto.phone ?? null,
          isActive: true,
        },
      });

      // b) Create Organization
      const organization = await tx.organization.create({
        data: {
          name: dto.companyName,
          slug: finalSlug,
          domain: dto.domain ?? null,
          numberOfUsers: dto.numberOfUsers ?? null,
          status: 'ACTIVE',
        },
      });

      // c) Create Membership with CUSTOMER_ADMIN role
      const membership = await tx.membership.create({
        data: {
          userId: userProfile.id,
          organizationId: organization.id,
          role: Role.CUSTOMER_ADMIN,
          status: 'ACTIVE',
        },
      });

      return { organization, membership };
    });

    // 5. Emit Audit Log Events
    await this.auditLogsService.log({
      actorId: user.userId,
      organizationId: result.organization.id,
      action: 'organization.created',
      targetResource: `organization:${result.organization.id}`,
      metadata: {
        name: result.organization.name,
        slug: result.organization.slug,
        numberOfUsers: result.organization.numberOfUsers,
      },
    });

    await this.auditLogsService.log({
      actorId: user.userId,
      organizationId: result.organization.id,
      action: 'membership.created',
      targetResource: `membership:${result.membership.id}`,
      metadata: {
        targetUserId: user.userId,
        role: Role.CUSTOMER_ADMIN,
        status: 'ACTIVE',
      },
    });

    // 6. Send Onboarding Confirmation Email (failure must NOT roll back onboarding result)
    try {
      await this.mailService.sendOnboardingEmail({
        to: user.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: user.email,
        companyName: result.organization.name,
        numberOfUsers: result.organization.numberOfUsers,
      });
    } catch (mailError) {
      const msg = mailError instanceof Error ? mailError.message : 'Unknown mail error';
      this.logger.warn(`Onboarding confirmation email failed gracefully for ${user.email}: ${msg}`);
    }

    return result;
  }

  /**
   * Create a new Organization (V8: POST /organizations, permission: organizations.manage)
   */
  async create(dto: CreateOrganizationDto, actorId?: string): Promise<Organization> {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Organization with slug '${dto.slug}' already exists`);
    }

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        domain: dto.domain ?? null,
      },
    });

    await this.auditLogsService.log({
      actorId: actorId ?? null,
      organizationId: org.id,
      action: 'organization.created',
      targetResource: `organization:${org.id}`,
      metadata: { name: org.name, slug: org.slug, domain: org.domain },
    });

    return org;
  }

  /**
   * List organizations accessible to the authenticated user (V8: GET /organizations, permission: organizations.read)
   * Enforces tenant isolation — only returns orgs where user has an active membership.
   */
  async findAllForUser(userId: string): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      where: {
        memberships: {
          some: {
            userId,
            status: 'ACTIVE',
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get organization by ID for authenticated user (V8: GET /organizations/:id, permission: organizations.read)
   * Enforces tenant isolation — throws NotFoundException if organization doesn't exist or user is not a member.
   */
  async findByIdForUser(id: string, userId: string): Promise<Organization> {
    const org = await this.prisma.organization.findFirst({
      where: {
        id,
        memberships: {
          some: {
            userId,
            status: 'ACTIVE',
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization with ID '${id}' not found`);
    }

    return org;
  }
}
