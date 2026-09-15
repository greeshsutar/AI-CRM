import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database';
import { AuditLog, Prisma } from '@prisma/client';

export interface LogAuditParams {
  actorId?: string | null;
  organizationId?: string | null;
  action: string;
  targetResource?: string | null;
  metadata?: Record<string, any> | null;
}

export interface FindAuditLogsOptions {
  page?: number;
  limit?: number;
  action?: string;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwords',
  'token',
  'rawtoken',
  'raw_token',
  'tokenhash',
  'token_hash',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'secret',
  'totpsecret',
  'totp_secret',
  'otpsecret',
  'otp_secret',
  'authorization',
  'cookie',
  'session',
  'sessionsecret',
  'credentials',
]);

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deeply sanitize metadata to strip passwords, tokens, secrets, credentials.
   * Does NOT mutate the input object.
   */
  sanitizeMetadata(metadata: any): any {
    if (!metadata || typeof metadata !== 'object') {
      return metadata;
    }

    if (Array.isArray(metadata)) {
      return metadata.map((item) => this.sanitizeMetadata(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Append-only event logging.
   */
  async log(params: LogAuditParams): Promise<AuditLog> {
    const sanitizedMeta = params.metadata
      ? this.sanitizeMetadata(params.metadata)
      : undefined;

    return this.prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        organizationId: params.organizationId ?? null,
        action: params.action,
        targetResource: params.targetResource ?? null,
        metadata: sanitizedMeta ? (sanitizedMeta as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  /**
   * Retrieve audit logs scoped to a specific organization with pagination.
   */
  async findLogsForOrganization(
    organizationId: string,
    options: FindAuditLogsOptions = {},
  ): Promise<PaginatedAuditLogs> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(options.action ? { action: options.action } : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
