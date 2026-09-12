import { describe, it, expect, beforeEach } from 'vitest';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService();
  });

  it('should return valid health status object', () => {
    const result = service.getHealth();
    expect(result).toBeDefined();
    expect(result.status).toBe('ok');
    expect(typeof result.timestamp).toBe('string');
    expect(typeof result.uptime).toBe('number');
    expect(typeof result.environment).toBe('string');
  });
});
