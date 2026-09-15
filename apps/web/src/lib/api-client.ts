/**
 * Centralized API Client for MINSTOCS CRM Next.js Frontend.
 *
 * Communicates ONLY with the NestJS backend API.
 * Direct browser-to-Supabase calls for application backend operations are STRICTLY PROHIBITED.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfilePayload {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchHealth(): Promise<HealthCheckResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      response.status,
      `API Health Check failed: ${response.statusText}`,
      errorText,
    );
  }

  return response.json();
}

export async function fetchUserProfile(accessToken: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      response.status,
      `Failed to fetch user profile: ${response.statusText}`,
      errorText,
    );
  }

  return response.json();
}

export async function updateUserProfile(
  accessToken: string,
  data: UpdateUserProfilePayload,
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      response.status,
      `Failed to update user profile: ${response.statusText}`,
      errorText,
    );
  }

  return response.json();
}

export interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogActor {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  organizationId: string | null;
  action: string;
  targetResource: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  actor?: AuditLogActor | null;
}

export interface AuditLogsResponse {
  data: AuditLogItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function fetchUserOrganizations(
  accessToken: string,
): Promise<OrganizationItem[]> {
  const response = await fetch(`${API_BASE_URL}/organizations`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      response.status,
      `Failed to fetch user organizations: ${response.statusText}`,
      errorText,
    );
  }

  return response.json();
}

export async function fetchAuditLogs(
  accessToken: string,
  organizationId: string,
  page: number = 1,
  limit: number = 20,
  action?: string,
): Promise<AuditLogsResponse> {
  const query = new URLSearchParams({
    organizationId,
    page: page.toString(),
    limit: limit.toString(),
  });
  if (action) {
    query.append('action', action);
  }

  const response = await fetch(`${API_BASE_URL}/audit-logs?${query.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      response.status,
      `Failed to fetch audit logs: ${response.statusText}`,
      errorText,
    );
  }

  return response.json();
}

export interface OnboardOrganizationPayload {
  companyName: string;
  slug?: string;
  domain?: string;
  numberOfUsers?: number;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

export interface OnboardOrganizationResponse {
  organization: OrganizationItem;
  membership: {
    id: string;
    userId: string;
    organizationId: string;
    role: string;
    status: string;
    createdAt: string;
  };
}

export async function onboardOrganization(
  accessToken: string,
  data: OnboardOrganizationPayload,
): Promise<OnboardOrganizationResponse> {
  const response = await fetch(`${API_BASE_URL}/organizations/onboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      response.status,
      `Failed to onboard organization: ${response.statusText}`,
      errorText,
    );
  }

  return response.json();
}

export async function ensureOnboarding(
  accessToken: string,
  user: { user_metadata?: Record<string, unknown> },
): Promise<{ onboarded: boolean; organization?: OrganizationItem | null }> {
  try {
    // 1. Check if user already has an active organization membership
    const userOrgs = await fetchUserOrganizations(accessToken);
    if (userOrgs && userOrgs.length > 0) {
      return { onboarded: true, organization: userOrgs[0] };
    }

    // 2. If user has 0 organizations, retrieve signup metadata from Supabase user_metadata
    const metadata = user?.user_metadata || {};
    const companyName = metadata.companyName;

    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return { onboarded: false, organization: null };
    }

    const rawUsers = metadata.numberOfUsers;
    const numberOfUsers = rawUsers
      ? typeof rawUsers === 'number'
        ? rawUsers
        : parseInt(String(rawUsers), 10)
      : undefined;

    // 3. Call NestJS backend API POST /api/v1/organizations/onboard
    const result = await onboardOrganization(accessToken, {
      companyName: companyName.trim(),
      numberOfUsers: isNaN(numberOfUsers as number) ? undefined : numberOfUsers,
      phone: typeof metadata.phone === 'string' ? metadata.phone : undefined,
      firstName: typeof metadata.firstName === 'string' ? metadata.firstName : undefined,
      lastName: typeof metadata.lastName === 'string' ? metadata.lastName : undefined,
    });

    return { onboarded: true, organization: result.organization };
  } catch (error) {
    console.warn('Post-confirmation onboarding check warning:', error);
    return { onboarded: false, organization: null };
  }
}

export interface InviterUser {
  id?: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface InvitationItem {
  id: string;
  organizationId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'AGENT' | 'MANAGER' | string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  inviter?: InviterUser;
}

export interface CreateInvitationPayload {
  organizationId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: 'AGENT' | 'MANAGER';
}

export interface InvitationValidationResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'AGENT' | 'MANAGER' | string;
  organizationName: string;
  inviterName?: string;
  expiresAt: string;
  status: string;
}

export interface AcceptInvitationPayload {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AcceptInvitationResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  membership: {
    id: string;
    organizationId: string;
    role: string;
    status: string;
  };
  organization: {
    id: string;
    name: string;
  };
}

export async function fetchOrganizationInvitations(
  accessToken: string,
  organizationId: string,
): Promise<InvitationItem[]> {
  const response = await fetch(`${API_BASE_URL}/invitations/organization/${organizationId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      response.status,
      `Failed to fetch organization invitations: ${response.statusText}`,
      errorText,
    );
  }

  return response.json();
}

export async function createInvitation(
  accessToken: string,
  data: CreateInvitationPayload,
): Promise<InvitationItem> {
  const response = await fetch(`${API_BASE_URL}/invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedMessage = response.statusText;
    try {
      const json = JSON.parse(errorText);
      if (json.message) {
        parsedMessage = Array.isArray(json.message) ? json.message.join(', ') : json.message;
      }
    } catch {
      // fallback
    }
    throw new ApiError(
      response.status,
      `Failed to create invitation: ${parsedMessage}`,
      errorText,
    );
  }

  return response.json();
}

export async function revokeInvitation(
  accessToken: string,
  invitationId: string,
): Promise<InvitationItem> {
  const response = await fetch(`${API_BASE_URL}/invitations/${invitationId}/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      response.status,
      `Failed to revoke invitation: ${response.statusText}`,
      errorText,
    );
  }

  return response.json();
}

export async function validateInvitationToken(
  token: string,
): Promise<InvitationValidationResponse> {
  const response = await fetch(
    `${API_BASE_URL}/invitations/validate/${encodeURIComponent(token)}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    let parsedMessage = response.statusText;
    try {
      const json = JSON.parse(errorText);
      if (json.message) {
        parsedMessage = Array.isArray(json.message) ? json.message.join(', ') : json.message;
      }
    } catch {
      // fallback
    }
    throw new ApiError(
      response.status,
      `Invitation validation failed: ${parsedMessage}`,
      errorText,
    );
  }

  return response.json();
}

export async function acceptInvitation(
  data: AcceptInvitationPayload,
): Promise<AcceptInvitationResponse> {
  const response = await fetch(`${API_BASE_URL}/invitations/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedMessage = response.statusText;
    try {
      const json = JSON.parse(errorText);
      if (json.message) {
        parsedMessage = Array.isArray(json.message) ? json.message.join(', ') : json.message;
      }
    } catch {
      // fallback
    }
    throw new ApiError(
      response.status,
      `Failed to accept invitation: ${parsedMessage}`,
      errorText,
    );
  }

  return response.json();
}



