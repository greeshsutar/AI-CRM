import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface OnboardingEmailParams {
  to: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  companyName: string;
  numberOfUsers?: number | string | null;
}

export interface EmployeeInvitationEmailParams {
  to: string;
  firstName?: string | null;
  lastName?: string | null;
  organizationName: string;
  inviterName?: string | null;
  role: string;
  rawToken: string;
  expiresAt: Date;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const portStr = this.configService.get<string>('SMTP_PORT');
    const port = portStr ? parseInt(portStr, 10) : 587;
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
    } else {
      this.logger.warn('SMTP configuration incomplete. Mail delivery will be disabled.');
    }
  }

  /**
   * Send Onboarding Confirmation Email to Organization Owner
   */
  async sendOnboardingEmail(params: OnboardingEmailParams): Promise<boolean> {
    const mailFrom =
      this.configService.get<string>('MAIL_FROM') ||
      'MINSTOCS CRM <noreply@minstocs.com>';

    const firstName = params.firstName || 'Valued Customer';
    const lastName = params.lastName || '';
    const phone = params.phone || 'N/A';
    const email = params.to || params.email || 'N/A';
    const companyName = params.companyName || 'N/A';
    const numberOfUsers = params.numberOfUsers ?? 'N/A';

    const subject = 'Welcome to MINSTOCS CRM — Your onboarding is complete';

    const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }
      .header { text-align: center; padding-bottom: 24px; border-bottom: 1px solid #334155; }
      .logo { font-size: 24px; font-weight: bold; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; }
      .content { padding: 24px 0; line-height: 1.6; color: #cbd5e1; }
      .details-box { background-color: #0f172a; border-radius: 8px; padding: 20px; border: 1px solid #334155; margin: 20px 0; }
      .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; }
      .detail-row:last-child { border-bottom: none; }
      .label { font-weight: 600; color: #94a3b8; }
      .value { color: #f8fafc; }
      .footer { text-align: center; padding-top: 24px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">MINSTOCS CRM</div>
      </div>
      <div class="content">
        <p>Hi ${firstName},</p>
        <p>Thank you for choosing <strong>MINSTOCS CRM</strong>.</p>
        <p>We're excited to have you onboard.</p>
        <p>Here are the details you provided:</p>
        
        <div class="details-box">
          <div class="detail-row"><span class="label">First Name:</span> <span class="value">${firstName}</span></div>
          <div class="detail-row"><span class="label">Last Name:</span> <span class="value">${lastName}</span></div>
          <div class="detail-row"><span class="label">Phone Number:</span> <span class="value">${phone}</span></div>
          <div class="detail-row"><span class="label">Work Email:</span> <span class="value">${email}</span></div>
          <div class="detail-row"><span class="label">Company Name:</span> <span class="value">${companyName}</span></div>
          <div class="detail-row"><span class="label">Number of Users:</span> <span class="value">${numberOfUsers}</span></div>
        </div>

        <p>Our team will review your onboarding details and contact you shortly to understand your requirements and help you get started.</p>
        <p>Regards,<br><strong>Team MINSTOCS CRM</strong></p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} MINSTOCS CRM. All rights reserved.
      </div>
    </div>
  </body>
</html>`;

    const textContent = `Hi ${firstName},

Thank you for choosing MINSTOCS CRM.

We're excited to have you onboard.

Here are the details you provided:

First Name: ${firstName}
Last Name: ${lastName}
Phone Number: ${phone}
Work Email: ${email}
Company Name: ${companyName}
Number of Users: ${numberOfUsers}

Our team will review your onboarding details and contact you shortly to understand your requirements and help you get started.

Regards,
Team MINSTOCS CRM`;

    if (!this.transporter) {
      this.logger.warn(`Skipping email delivery to ${params.to}: Transporter not configured.`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to: params.to,
        subject,
        text: textContent,
        html: htmlContent,
      });

      this.logger.log(`Onboarding confirmation email sent successfully to ${params.to}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown transport error';
      this.logger.error(`Failed to send onboarding email to ${params.to}: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Send Employee Invitation Email
   */
  async sendEmployeeInvitationEmail(params: EmployeeInvitationEmailParams): Promise<boolean> {
    const mailFrom =
      this.configService.get<string>('MAIL_FROM') ||
      'MINSTOCS CRM <noreply@minstocs.com>';

    const webUrl =
      this.configService.get<string>('CORS_ORIGIN') ||
      this.configService.get<string>('NEXT_PUBLIC_APP_URL') ||
      'http://localhost:3000';

    const invitationUrl = `${webUrl}/auth/invite/accept?token=${params.rawToken}`;

    const recipientName = params.firstName
      ? `${params.firstName}${params.lastName ? ' ' + params.lastName : ''}`
      : 'Team Member';

    const inviterName = params.inviterName || 'An Administrator';
    const formattedExpires = params.expiresAt.toUTCString();

    const subject = `You've been invited to join ${params.organizationName} on MINSTOCS CRM`;

    const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }
      .header { text-align: center; padding-bottom: 24px; border-bottom: 1px solid #334155; }
      .logo { font-size: 24px; font-weight: bold; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; }
      .content { padding: 24px 0; line-height: 1.6; color: #cbd5e1; }
      .details-box { background-color: #0f172a; border-radius: 8px; padding: 20px; border: 1px solid #334155; margin: 20px 0; }
      .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; }
      .detail-row:last-child { border-bottom: none; }
      .label { font-weight: 600; color: #94a3b8; }
      .value { color: #f8fafc; }
      .btn { display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
      .footer { text-align: center; padding-top: 24px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">MINSTOCS CRM</div>
      </div>
      <div class="content">
        <p>Hi ${recipientName},</p>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${params.organizationName}</strong> on MINSTOCS CRM as a <strong>${params.role}</strong>.</p>
        
        <div class="details-box">
          <div class="detail-row"><span class="label">Organization:</span> <span class="value">${params.organizationName}</span></div>
          <div class="detail-row"><span class="label">Assigned Role:</span> <span class="value">${params.role}</span></div>
          <div class="detail-row"><span class="label">Expires At:</span> <span class="value">${formattedExpires}</span></div>
        </div>

        <p>Click the button below to accept your invitation and set up your account:</p>
        <p style="text-align: center;">
          <a href="${invitationUrl}" class="btn" target="_blank">Accept Invitation</a>
        </p>

        <p style="font-size: 13px; color: #94a3b8;">If the button above does not work, copy and paste this link into your browser:<br>
          <a href="${invitationUrl}" style="color: #38bdf8; word-break: break-all;">${invitationUrl}</a>
        </p>

        <p>This invitation link will expire on <strong>${formattedExpires}</strong>.</p>
        <p>Regards,<br><strong>Team MINSTOCS CRM</strong></p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} MINSTOCS CRM. All rights reserved.
      </div>
    </div>
  </body>
</html>`;

    const textContent = `Hi ${recipientName},

${inviterName} has invited you to join ${params.organizationName} on MINSTOCS CRM as a ${params.role}.

Organization: ${params.organizationName}
Assigned Role: ${params.role}
Expires At: ${formattedExpires}

To accept your invitation and set up your account, open this link:
${invitationUrl}

This invitation link will expire on ${formattedExpires}.

Regards,
Team MINSTOCS CRM`;

    if (!this.transporter) {
      this.logger.warn(`Skipping employee invitation delivery to ${params.to}: Transporter not configured.`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: mailFrom,
        to: params.to,
        subject,
        text: textContent,
        html: htmlContent,
      });

      this.logger.log(`Employee invitation email sent successfully to ${params.to}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown transport error';
      this.logger.error(`Failed to send employee invitation email to ${params.to}: ${errorMessage}`);
      return false;
    }
  }
}

