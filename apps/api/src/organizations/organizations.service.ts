import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { Organization } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new Organization (V8: POST /organizations, permission: organizations.manage)
   */
  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Organization with slug '${dto.slug}' already exists`);
    }

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        domain: dto.domain ?? null,
      },
    });
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
