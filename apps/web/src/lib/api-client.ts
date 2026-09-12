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
