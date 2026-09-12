import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  it('should instantiate without error', () => {
    expect(service).toBeDefined();
  });

  it('should handle onModuleInit gracefully when DB is not reachable', async () => {
    const $connectSpy = vi.spyOn(service, '$connect').mockRejectedValueOnce(new Error('DB unreachable'));
    await expect(service.onModuleInit()).resolves.not.toThrow();
    expect($connectSpy).toHaveBeenCalled();
  });

  it('should call $disconnect on module destroy', async () => {
    const $disconnectSpy = vi.spyOn(service, '$disconnect').mockResolvedValueOnce(undefined);
    await service.onModuleDestroy();
    expect($disconnectSpy).toHaveBeenCalled();
  });
});
