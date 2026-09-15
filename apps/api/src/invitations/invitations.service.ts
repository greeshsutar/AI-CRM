import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database';
import { MailService } from '../mail/mail.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { Invitation, InvitationStatus, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  private supabaseAdmin: SupabaseClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly auditLogsService: AuditLogsService,
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl =
      this.configService.get<string>('SUPABASE_URL') ||
      this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL');
    const serviceKey =
      this.configService.get<string>('SUPABASE_SECRET_KEY') ||
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && serviceKey) {
      this.supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }

  /**
   * Helper: Generate a cryptographically secure random token and its SHA-256 hash.
   */
  private generateToken(): { rawToken: string; tokenHash: string } {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, tokenHash };
  }

  /**
   * Helper: Compute SHA-256 hash of a raw token.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create an Employee Invitation (CUSTOMER_ADMIN only)
   */
  async createInvitation(
    dto: CreateInvitationDto,
    requester: AuthenticatedUser,
  ): Promise<Omit<Invitation, 'tokenHash'>> {
    const assignedRole = dto.role ?? Role.AGENT;

    // 1. Prohibit role escalation (CUSTOMER_ADMIN or SUPER_ADMIN cannot be assigned)
    if (assignedRole === Role.CUSTOMER_ADMIN || assignedRole === Role.SUPER_ADMIN) {
      throw new BadRequestException(
        'Role escalation prohibited: Employee invitations can only assign AGENT or MANAGER roles.',
      );
    }
    if (assignedRole !== Role.AGENT && assignedRole !== Role.MANAGER) {
      throw new BadRequestException('Invalid employee role specified.');
    }

    // 2. Tenant isolation & CUSTOMER_ADMIN authorization check
    const requesterMembership = await this.prisma.membership.findFirst({
      where: {
        userId: requester.userId,
        organizationId: dto.organizationId,
        status: 'ACTIVE',
      },
    });

    if (!requesterMembership) {
      throw new ForbiddenException(
        'Access denied: You are not an active member of this organization',
      );
    }

    if (requesterMembership.role !== Role.CUSTOMER_ADMIN) {
      throw new ForbiddenException(
        'Access denied: Only CUSTOMER_ADMIN can invite employees',
      );
    }

    // 3. Verify target organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });
    if (!organization) {
      throw new NotFoundException(
        `Organization with ID '${dto.organizationId}' not found`,
      );
    }

    const email = dto.email.toLowerCase().trim();

    // 4. Check for existing ACTIVE membership in this organization
    const existingActiveMember = await this.prisma.membership.findFirst({
      where: {
        organizationId: dto.organizationId,
        user: { email },
        status: 'ACTIVE',
      },
    });
    if (existingActiveMember) {
      throw new ConflictException(
        'User is already an active member of this organization',
      );
    }

    // 5. Check for existing PENDING invitation for this email & organization
    const existingPending = await this.prisma.invitation.findFirst({
      where: {
        organizationId: dto.organizationId,
        email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingPending) {
      throw new ConflictException(
        'An active invitation already exists for this email in this organization',
      );
    }

    // 6. Generate cryptographically secure token & hash
    const { rawToken, tokenHash } = this.generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 7. Store invitation in DB (storing tokenHash ONLY)
    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId: dto.organizationId,
        email,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        role: assignedRole,
        inviterId: requester.userId,
        tokenHash,
        status: InvitationStatus.PENDING,
        expiresAt,
      },
      include: {
        organization: true,
        inviter: true,
      },
    });

    // 8. Emit audit event (never putting raw token or tokenHash in metadata)
    await this.auditLogsService.log({
      actorId: requester.userId,
      organizationId: dto.organizationId,
      action: 'invitation.created',
      targetResource: `invitation:${invitation.id}`,
      metadata: {
        invitationId: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organizationId: invitation.organizationId,
      },
    });

    // 9. Send invitation email
    const inviterName = invitation.inviter
      ? `${invitation.inviter.firstName || ''} ${invitation.inviter.lastName || ''}`.trim() || invitation.inviter.email
      : undefined;

    try {
      await this.mailService.sendEmployeeInvitationEmail({
        to: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        organizationName: invitation.organization.name,
        inviterName,
        role: invitation.role,
        rawToken,
        expiresAt: invitation.expiresAt,
      });
    } catch (mailErr) {
      const msg = mailErr instanceof Error ? mailErr.message : 'Unknown mail error';
      this.logger.warn(
        `Employee invitation created but email delivery failed for ${invitation.email}: ${msg}`,
      );
    }

    // 10. Return safe payload without tokenHash
    const { tokenHash: _, ...safeInvitation } = invitation;
    return safeInvitation;
  }

  /**
   * Validate an Invitation Token (Public endpoint)
   */
  async validateInvitationToken(rawToken: string): Promise<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: Role;
    organizationName: string;
    inviterName?: string;
    expiresAt: Date;
    status: InvitationStatus;
  }> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new BadRequestException('Invitation token is required');
    }

    const tokenHash = this.hashToken(rawToken);

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        organization: true,
        inviter: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or non-existent invitation token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Invitation is no longer valid (status: ${invitation.status})`,
      );
    }

    if (invitation.expiresAt <= new Date()) {
      // Mark as EXPIRED
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    const inviterName = invitation.inviter
      ? `${invitation.inviter.firstName || ''} ${invitation.inviter.lastName || ''}`.trim() || invitation.inviter.email
      : undefined;

    return {
      id: invitation.id,
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role,
      organizationName: invitation.organization.name,
      inviterName,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
    };
  }

  /**
   * Accept an Invitation (Public endpoint)
   */
  async acceptInvitation(dto: AcceptInvitationDto): Promise<{
    user: { id: string; email: string; firstName: string | null; lastName: string | null };
    membership: { id: string; organizationId: string; role: Role; status: string };
    organization: { id: string; name: string };
  }> {
    if (!dto.token) {
      throw new BadRequestException('Invitation token is required');
    }

    const tokenHash = this.hashToken(dto.token);

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: { organization: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Invitation has already been accepted');
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      throw new BadRequestException('Invitation has been revoked');
    }

    if (invitation.status === InvitationStatus.EXPIRED || invitation.expiresAt <= new Date()) {
      if (invitation.status === InvitationStatus.PENDING) {
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED },
        });
      }
      throw new BadRequestException('Invitation has expired');
    }

    // 1. Create or synchronize Supabase Auth identity
    let supabaseUserId: string | null = null;
    if (this.supabaseAdmin) {
      try {
        const { data: adminData, error: adminErr } =
          await this.supabaseAdmin.auth.admin.createUser({
            email: invitation.email,
            password: dto.password,
            email_confirm: true,
            user_metadata: {
              firstName: dto.firstName || invitation.firstName,
              lastName: dto.lastName || invitation.lastName,
            },
          });

        if (adminErr) {
          // Check if user already exists in Supabase
          const { data: listData } = await this.supabaseAdmin.auth.admin.listUsers();
          const existingUser = listData?.users?.find(
            (u) => u.email?.toLowerCase() === invitation.email.toLowerCase(),
          );
          if (existingUser) {
            supabaseUserId = existingUser.id;
          } else {
            this.logger.warn(`Supabase Auth admin createUser error: ${adminErr.message}`);
          }
        } else if (adminData?.user) {
          supabaseUserId = adminData.user.id;
        }
      } catch (authErr) {
        const msg = authErr instanceof Error ? authErr.message : 'Unknown auth error';
        this.logger.warn(`Supabase Auth synchronization notice: ${msg}`);
      }
    }

    // Fallback ID if Supabase Admin client was not available / mock environment
    if (!supabaseUserId) {
      const existingUserInDb = await this.prisma.user.findUnique({
        where: { email: invitation.email },
      });
      supabaseUserId = existingUserInDb ? existingUserInDb.id : crypto.randomUUID();
    }

    // 2. Perform transaction-safe database acceptance
    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert User
      const user = await tx.user.upsert({
        where: { email: invitation.email },
        update: {
          firstName: dto.firstName || invitation.firstName || undefined,
          lastName: dto.lastName || invitation.lastName || undefined,
          isActive: true,
        },
        create: {
          id: supabaseUserId,
          email: invitation.email,
          firstName: dto.firstName || invitation.firstName || null,
          lastName: dto.lastName || invitation.lastName || null,
          isActive: true,
        },
      });

      // Upsert Membership
      const existingMembership = await tx.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: invitation.organizationId,
          },
        },
      });

      let membership;
      if (existingMembership) {
        if (existingMembership.status !== 'ACTIVE') {
          membership = await tx.membership.update({
            where: { id: existingMembership.id },
            data: { status: 'ACTIVE', role: invitation.role },
          });
        } else {
          membership = existingMembership;
        }
      } else {
        membership = await tx.membership.create({
          data: {
            userId: user.id,
            organizationId: invitation.organizationId,
            role: invitation.role,
            status: 'ACTIVE',
          },
        });
      }

      // Mark invitation ACCEPTED
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          acceptedUserId: user.id,
        },
      });

      return { user, membership, organization: invitation.organization };
    });

    // 3. Emit Audit Log Event
    await this.auditLogsService.log({
      actorId: result.user.id,
      organizationId: invitation.organizationId,
      action: 'invitation.accepted',
      targetResource: `invitation:${invitation.id}`,
      metadata: {
        invitationId: invitation.id,
        userId: result.user.id,
        role: invitation.role,
        organizationId: invitation.organizationId,
      },
    });

    return result;
  }

  /**
   * List Invitations for Organization (CUSTOMER_ADMIN only)
   */
  async findAllForOrganization(
    organizationId: string,
    requester: AuthenticatedUser,
  ): Promise<Omit<Invitation, 'tokenHash'>[]> {
    // Tenant isolation check
    const requesterMembership = await this.prisma.membership.findFirst({
      where: {
        userId: requester.userId,
        organizationId,
        status: 'ACTIVE',
      },
    });

    if (!requesterMembership || requesterMembership.role !== Role.CUSTOMER_ADMIN) {
      throw new ForbiddenException(
        'Access denied: Only CUSTOMER_ADMIN of this organization can list invitations',
      );
    }

    const invitations = await this.prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        inviter: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return invitations.map(({ tokenHash: _, ...safe }) => safe);
  }

  /**
   * Revoke a Pending Invitation (CUSTOMER_ADMIN only)
   */
  async revokeInvitation(
    id: string,
    requester: AuthenticatedUser,
  ): Promise<Omit<Invitation, 'tokenHash'>> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      throw new NotFoundException(`Invitation with ID '${id}' not found`);
    }

    // Tenant isolation check
    const requesterMembership = await this.prisma.membership.findFirst({
      where: {
        userId: requester.userId,
        organizationId: invitation.organizationId,
        status: 'ACTIVE',
      },
    });

    if (!requesterMembership || requesterMembership.role !== Role.CUSTOMER_ADMIN) {
      throw new ForbiddenException(
        'Access denied: Only CUSTOMER_ADMIN of this organization can revoke invitations',
      );
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Only PENDING invitations can be revoked (current status: ${invitation.status})`,
      );
    }

    const updated = await this.prisma.invitation.update({
      where: { id },
      data: { status: InvitationStatus.REVOKED },
    });

    await this.auditLogsService.log({
      actorId: requester.userId,
      organizationId: invitation.organizationId,
      action: 'invitation.revoked',
      targetResource: `invitation:${id}`,
      metadata: {
        invitationId: id,
        email: invitation.email,
        organizationId: invitation.organizationId,
      },
    });

    const { tokenHash: _, ...safe } = updated;
    return safe;
  }
}
