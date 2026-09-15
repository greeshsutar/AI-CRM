import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: {
    findOrCreateFromSupabase: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockUsersService = {
      findOrCreateFromSupabase: vi.fn().mockResolvedValue({
        id: 'user-uuid-123',
        email: 'user@example.com',
      }),
    };

    service = new AuthService(mockUsersService as unknown as UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUserPayload', () => {
    it('should validate payload and synchronize user if email is present', async () => {
      const payload = {
        sub: 'user-uuid-123',
        email: 'user@example.com',
      };

      const result = await service.validateUserPayload(payload);

      expect(mockUsersService.findOrCreateFromSupabase).toHaveBeenCalledWith({
        id: 'user-uuid-123',
        email: 'user@example.com',
      });
      expect(result).toEqual({
        userId: 'user-uuid-123',
        email: 'user@example.com',
        aal: 'aal1',
      });
    });

    it('should return aal2 when aal claim is aal2', async () => {
      const payload = {
        sub: 'user-uuid-123',
        email: 'user@example.com',
        aal: 'aal2',
      };

      const result = await service.validateUserPayload(payload);

      expect(result.aal).toBe('aal2');
    });

    it('should throw UnauthorizedException if payload or sub is missing', async () => {
      await expect(service.validateUserPayload({ sub: '', email: 'test@example.com' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
