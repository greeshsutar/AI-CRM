import { PrismaClient, Role, MembershipStatus } from '@prisma/client';

export interface BootstrapResult {
  success: boolean;
  message: string;
  membershipId?: string;
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Super Admin Bootstrap Mechanism.
 *
 * Administrative server-side function to provision the initial SUPER_ADMIN role
 * for a target application user identified by SUPER_ADMIN_EMAIL environment variable.
 *
 * Idempotent: Can be run multiple times safely without creating duplicate memberships.
 * Zero HTTP exposure: Server-side operation only.
 */
export async function bootstrapSuperAdmin(
  prisma: PrismaClient,
  targetEmail?: string,
): Promise<BootstrapResult> {
  const email = (targetEmail || process.env.SUPER_ADMIN_EMAIL || '').trim();

  if (!email) {
    throw new Error(
      'SUPER_ADMIN_EMAIL environment variable is missing or empty. Please specify a valid email address.',
    );
  }

  if (!isValidEmail(email)) {
    throw new Error(
      `Invalid email address provided for SUPER_ADMIN_EMAIL: '${email}'. Please specify a valid email address.`,
    );
  }

  // 1. Find user in application database
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: true,
    },
  });

  if (!user) {
    throw new Error(
      `User with email '${email}' not found in application database. The target user must complete sign-up and initial profile creation before being promoted to SUPER_ADMIN.`,
    );
  }

  // 2. Check if user already holds an active SUPER_ADMIN membership
  const existingSuperAdminMembership = user.memberships.find(
    (m) => m.role === Role.SUPER_ADMIN && m.status === MembershipStatus.ACTIVE,
  );

  if (existingSuperAdminMembership) {
    return {
      success: true,
      message: `User '${email}' already has an active SUPER_ADMIN membership. No changes were made.`,
      membershipId: existingSuperAdminMembership.id,
    };
  }

  // 3. Promote existing membership if available
  const existingActiveMembership = user.memberships.find(
    (m) => m.status === MembershipStatus.ACTIVE,
  );

  if (existingActiveMembership) {
    const updatedMembership = await prisma.membership.update({
      where: { id: existingActiveMembership.id },
      data: { role: Role.SUPER_ADMIN },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        organizationId: existingActiveMembership.organizationId,
        action: 'super_admin.bootstrap',
        targetResource: `membership:${updatedMembership.id}`,
        metadata: {
          email: user.email,
          previousRole: existingActiveMembership.role,
          newRole: Role.SUPER_ADMIN,
        },
      },
    });

    return {
      success: true,
      message: `Promoted existing membership in organization '${existingActiveMembership.organizationId}' to SUPER_ADMIN for user '${email}'.`,
      membershipId: updatedMembership.id,
    };
  }

  // 4. User has 0 memberships: Check if an organization exists or create initial admin organization
  let organization = await prisma.organization.findFirst({
    where: { status: 'ACTIVE' },
  });

  if (!organization) {
    const orgName = process.env.SUPER_ADMIN_ORG_NAME || 'System Administration';
    const orgSlug = process.env.SUPER_ADMIN_ORG_SLUG || 'system-administration';

    organization = await prisma.organization.create({
      data: {
        name: orgName,
        slug: orgSlug,
        status: 'ACTIVE',
      },
    });
  }

  // 5. Create new SUPER_ADMIN membership
  const newMembership = await prisma.membership.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      role: Role.SUPER_ADMIN,
      status: MembershipStatus.ACTIVE,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      organizationId: organization.id,
      action: 'super_admin.bootstrap',
      targetResource: `membership:${newMembership.id}`,
      metadata: {
        email: user.email,
        role: Role.SUPER_ADMIN,
      },
    },
  });

  return {
    success: true,
    message: `Assigned SUPER_ADMIN membership to user '${email}' in organization '${organization.name}'.`,
    membershipId: newMembership.id,
  };
}
