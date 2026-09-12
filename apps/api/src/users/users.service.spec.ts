import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  const mockUser = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new UsersService(mockPrisma as unknown as PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateFromSupabase', () => {
    it('should return existing user if found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOrCreateFromSupabase({
        id: mockUser.id,
        email: mockUser.email,
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should create and return new user if not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.findOrCreateFromSupabase({
        id: mockUser.id,
        email: mockUser.email,
        firstName: 'Test',
        lastName: 'User',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: 'Test',
          lastName: 'User',
          avatarUrl: null,
          isActive: true,
        },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update and return user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Updated',
      });

      const result = await service.updateProfile(mockUser.id, {
        firstName: 'Updated',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { firstName: 'Updated' },
      });
      expect(result.firstName).toBe('Updated');
    });
  });
});
