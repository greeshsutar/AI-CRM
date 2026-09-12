import { describe, it, expect, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    it('should return user if authentication succeeds', () => {
      const user = { userId: '123', email: 'test@example.com' };
      const result = guard.handleRequest(null, user, null);
      expect(result).toEqual(user);
    });

    it('should throw error if error is passed', () => {
      const customError = new Error('Custom error');
      expect(() => guard.handleRequest(customError, null, null)).toThrow(customError);
    });

    it('should throw UnauthorizedException if user is null', () => {
      expect(() => guard.handleRequest(null, null, { message: 'Token expired' })).toThrow(
        UnauthorizedException,
      );
    });
  });
});
