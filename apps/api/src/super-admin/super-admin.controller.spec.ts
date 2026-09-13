import { describe, it, expect, beforeEach } from 'vitest';
import { SuperAdminController } from './super-admin.controller';

describe('SuperAdminController', () => {
  let controller: SuperAdminController;

  beforeEach(() => {
    controller = new SuperAdminController();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMfaTest', () => {
    it('should return success response when accessed', () => {
      const result = controller.getMfaTest();
      expect(result).toEqual({
        success: true,
        message: 'Super Admin MFA verified',
      });
    });
  });
});
