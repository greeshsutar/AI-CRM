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

