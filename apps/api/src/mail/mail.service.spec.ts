import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

// Mock nodemailer
vi.mock('nodemailer', () => {
  const sendMailMock = vi.fn();
  return {
    createTransport: vi.fn(() => ({
      sendMail: sendMailMock,
    })),
    __sendMailMock: sendMailMock,
  };
});

import * as nodemailer from 'nodemailer';

describe('MailService', () => {
  let service: MailService;
  let mockConfigService: { get: ReturnType<typeof vi.fn> };
  let mockSendMail: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      get: vi.fn((key: string) => {
        switch (key) {
          case 'SMTP_HOST':
            return 'smtp.example.com';
          case 'SMTP_PORT':
            return '587';
          case 'SMTP_SECURE':
            return 'false';
          case 'SMTP_USER':
            return 'smtp-user@example.com';
          case 'SMTP_PASSWORD':
            return 'supersecretpassword';
          case 'MAIL_FROM':
            return 'MINSTOCS CRM <noreply@minstocs.com>';
          default:
            return null;
        }
      }),
    };

    const transportInstance = (nodemailer as any).createTransport();
    mockSendMail = transportInstance.sendMail;

    service = new MailService(mockConfigService as unknown as ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize Nodemailer transporter with correct configuration', () => {
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'smtp-user@example.com',
        pass: 'supersecretpassword',
      },
    });
  });

  it('should send onboarding email using correct recipient, sender, subject, and dynamic fields', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'msg-123' });

    const params = {
      to: 'owner@acme.com',
      firstName: 'Alice',
      lastName: 'Smith',
      phone: '+15559876543',
      email: 'owner@acme.com',
      companyName: 'Acme Corp',
      numberOfUsers: 50,
    };

    const result = await service.sendOnboardingEmail(params);

    expect(result).toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'MINSTOCS CRM <noreply@minstocs.com>',
      to: 'owner@acme.com',
      subject: 'Welcome to MINSTOCS CRM — Your onboarding is complete',
      text: expect.stringContaining('First Name: Alice'),
      html: expect.stringContaining('Acme Corp'),
    });

    // Verify dynamic onboarding fields in email content
    const mailArgs = mockSendMail.mock.calls[0][0];
    expect(mailArgs.html).toContain('Alice');
    expect(mailArgs.html).toContain('Smith');
    expect(mailArgs.html).toContain('+15559876543');
    expect(mailArgs.html).toContain('owner@acme.com');
    expect(mailArgs.html).toContain('Acme Corp');
    expect(mailArgs.html).toContain('50');
  });

  it('should handle mail transport failure gracefully without throwing exceptions', async () => {
    mockSendMail.mockRejectedValue(new Error('Connection refused'));

    const params = {
      to: 'owner@acme.com',
      companyName: 'Acme Corp',
    };

    const result = await service.sendOnboardingEmail(params);

    expect(result).toBe(false);
  });

  it('should return false if transporter is not configured', async () => {
    const unconfiguredConfigService = {
      get: vi.fn(() => null),
    };

    const unconfiguredService = new MailService(
      unconfiguredConfigService as unknown as ConfigService,
    );

    const result = await unconfiguredService.sendOnboardingEmail({
      to: 'user@example.com',
      companyName: 'No Config Corp',
    });

    expect(result).toBe(false);
  });
});
