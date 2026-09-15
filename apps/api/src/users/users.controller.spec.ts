import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: {
    findOrCreateFromSupabase: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
  };

  const mockUserPayload: AuthenticatedUser = {
    userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'test@example.com',
  };

  const mockUserProfile = {
    id: mockUserPayload.userId,
    email: mockUserPayload.email,
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUsersService = {
      findOrCreateFromSupabase: vi.fn(),
      updateProfile: vi.fn(),
    };

    controller = new UsersController(
      mockUsersService as unknown as UsersService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /users/me', () => {
    it('1. should return authenticated user profile for valid JWT user context', async () => {
      mockUsersService.findOrCreateFromSupabase.mockResolvedValue(mockUserProfile);

      const result = await controller.getProfile(mockUserPayload);

      expect(mockUsersService.findOrCreateFromSupabase).toHaveBeenCalledWith({
        id: mockUserPayload.userId,
        email: mockUserPayload.email,
      });
      expect(result).toEqual(mockUserProfile);
    });

    it('2. should handle user not found error if service fails', async () => {
      mockUsersService.findOrCreateFromSupabase.mockRejectedValue(
        new NotFoundException('User profile not found'),
      );

      await expect(controller.getProfile(mockUserPayload)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /users/me', () => {
    it('3. should update authenticated user profile with valid DTO', async () => {
      const dto: UpdateUserProfileDto = { firstName: 'Updated' };
      const updatedProfile = { ...mockUserProfile, firstName: 'Updated' };
      mockUsersService.updateProfile.mockResolvedValue(updatedProfile);

      const result = await controller.updateProfile(mockUserPayload, dto);

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        mockUserPayload.userId,
        dto,
      );
      expect(result).toEqual(updatedProfile);
    });

    it('4. should fail DTO validation for invalid avatarUrl or oversized strings', async () => {
      const dto = new UpdateUserProfileDto();
      dto.avatarUrl = 'not-a-valid-url';
      dto.firstName = 'A'.repeat(51);

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const propertyNames = errors.map((e) => e.property);
      expect(propertyNames).toContain('avatarUrl');
      expect(propertyNames).toContain('firstName');
    });

    it('5. should enforce that only authenticated JWT userId is passed to service (preventing changing another user identity)', async () => {
      const dto: UpdateUserProfileDto = { firstName: 'AttackerAttempt' };
      mockUsersService.updateProfile.mockResolvedValue({
        ...mockUserProfile,
        firstName: 'AttackerAttempt',
      });

      // Even if attacker attempts to inject a different user payload object, controller strictly uses context user
      await controller.updateProfile(mockUserPayload, dto);

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        dto,
      );
      expect(mockUsersService.updateProfile).not.toHaveBeenCalledWith(
        'other-user-id',
        dto,
      );
    });

    it('6. should throw NotFoundException if user to update does not exist', async () => {
      const dto: UpdateUserProfileDto = { firstName: 'Updated' };
      mockUsersService.updateProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.updateProfile(mockUserPayload, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
