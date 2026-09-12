import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

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

  describe('getProfile', () => {
    it('should return user profile from UsersService', async () => {
      mockUsersService.findOrCreateFromSupabase.mockResolvedValue(
        mockUserProfile,
      );

      const result = await controller.getProfile(mockUserPayload);

      expect(mockUsersService.findOrCreateFromSupabase).toHaveBeenCalledWith({
        id: mockUserPayload.userId,
        email: mockUserPayload.email,
      });
      expect(result).toEqual(mockUserProfile);
    });
  });

  describe('updateProfile', () => {
    it('should update and return user profile', async () => {
      const dto = { firstName: 'Updated' };
      const updatedProfile = { ...mockUserProfile, firstName: 'Updated' };
      mockUsersService.updateProfile.mockResolvedValue(updatedProfile);

      const result = await controller.updateProfile(mockUserPayload, dto);

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        mockUserPayload.userId,
        dto,
      );
      expect(result).toEqual(updatedProfile);
    });
  });
});
