import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string, defaultValue: string) => {
        if (key === 'app.supabaseUrl') return 'https://test-supabase.supabase.co';
        return defaultValue;
      }),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(mockConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate and return authenticated user payload with default aal1 when aal claim is missing', async () => {
      const payload = {
        sub: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'user@example.com',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'user@example.com',
        aal: 'aal1',
      });
    });

    it('should return aal2 when aal claim is aal2', async () => {
      const payload = {
        sub: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'user@example.com',
        aal: 'aal2',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'user@example.com',
        aal: 'aal2',
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
