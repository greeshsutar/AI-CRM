import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { Role } from '@prisma/client';

describe('MembershipsController', () => {
  let controller: MembershipsController;
  let mockService: {
    create: ReturnType<typeof vi.fn>;
    findAllForUser: ReturnType<typeof vi.fn>;
    findByIdForUser: ReturnType<typeof vi.fn>;
  };

  const user = { userId: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', email: 'req@example.com' };

  beforeEach(() => {
    mockService = {
      create: vi.fn(),
      findAllForUser: vi.fn(),
      findByIdForUser: vi.fn(),
    };

    controller = new MembershipsController(
      mockService as unknown as MembershipsService,
    );
  });

  it('should call service.create on POST /memberships', async () => {
    const dto = {
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      organizationId: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      role: Role.AGENT,
    };
    const expected = { id: 'mem-1', ...dto };
    mockService.create.mockResolvedValue(expected);

    const result = await controller.create(dto, user);
    expect(result).toEqual(expected);
    expect(mockService.create).toHaveBeenCalledWith(dto, user.userId);
  });

  it('should call service.findAllForUser on GET /memberships', async () => {
    const expected = [{ id: 'mem-1' }];
    mockService.findAllForUser.mockResolvedValue(expected);

    const result = await controller.findAll(user);
    expect(result).toEqual(expected);
    expect(mockService.findAllForUser).toHaveBeenCalledWith(user.userId);
  });

  it('should call service.findByIdForUser on GET /memberships/:id', async () => {
    const memId = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
    const expected = { id: memId };
    mockService.findByIdForUser.mockResolvedValue(expected);

    const result = await controller.findOne(memId, user);
    expect(result).toEqual(expected);
    expect(mockService.findByIdForUser).toHaveBeenCalledWith(memId, user.userId);
  });
});
