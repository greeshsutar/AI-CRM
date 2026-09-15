import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let mockService: {
    onboard: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findAllForUser: ReturnType<typeof vi.fn>;
    findByIdForUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockService = {
      onboard: vi.fn(),
      create: vi.fn(),
      findAllForUser: vi.fn(),
      findByIdForUser: vi.fn(),
    };

    controller = new OrganizationsController(
      mockService as unknown as OrganizationsService,
    );
  });

  it('should call service.onboard on POST /organizations/onboard', async () => {
    const dto = { companyName: 'Acme', numberOfUsers: 10, phone: '+123456' };
    const user = { userId: 'user-1', email: 'user@example.com' };
    const expected = { organization: { id: 'org-1', name: 'Acme' }, membership: { id: 'mem-1', role: 'CUSTOMER_ADMIN' } };
    mockService.onboard.mockResolvedValue(expected);

    const result = await controller.onboard(dto, user);
    expect(result).toEqual(expected);
    expect(mockService.onboard).toHaveBeenCalledWith(dto, user);
  });

  it('should call service.create on POST /organizations', async () => {
    const dto = { name: 'Acme', slug: 'acme' };
    const expected = { id: 'org-1', ...dto };
    mockService.create.mockResolvedValue(expected);

    const result = await controller.create(dto);
    expect(result).toEqual(expected);
    expect(mockService.create).toHaveBeenCalledWith(dto, undefined);
  });

  it('should call service.findAllForUser on GET /organizations', async () => {
    const user = { userId: 'user-1', email: 'user@example.com' };
    const expected = [{ id: 'org-1' }];
    mockService.findAllForUser.mockResolvedValue(expected);

    const result = await controller.findAll(user);
    expect(result).toEqual(expected);
    expect(mockService.findAllForUser).toHaveBeenCalledWith('user-1');
  });

  it('should call service.findByIdForUser on GET /organizations/:id', async () => {
    const user = { userId: 'user-1', email: 'user@example.com' };
    const orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const expected = { id: orgId, name: 'Acme' };
    mockService.findByIdForUser.mockResolvedValue(expected);

    const result = await controller.findOne(orgId, user);
    expect(result).toEqual(expected);
    expect(mockService.findByIdForUser).toHaveBeenCalledWith(orgId, 'user-1');
  });
});
