import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(mockConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate and return authenticated user payload', async () => {
      const payload = {
        sub: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'user@example.com',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'user@example.com',
      });
    });

    it('should throw UnauthorizedException if sub claim is missing', async () => {
      const payload = {
        sub: '',
        email: 'user@example.com',
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
