/**
 * Resend Email Provider — Embee Nexus
 *
 * Implements the EmailProvider interface using the Resend API.
 * This is the initial email provider for M8. Can be swapped for SendGrid/SES later
 * by changing configuration only — no domain logic changes required.
 *
 * Resend free tier: 3,000 emails/month, 100/day, up to 3 domains.
 */

import type { EmailProvider, EmailMessage, EmailSendResult } from './email-provider';
import { logger } from '@/lib/logger';

interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';

  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor(config?: ResendConfig) {
    this.apiKey = config?.apiKey || process.env.RESEND_API_KEY || '';
    this.fromEmail = config?.fromEmail || process.env.RESEND_FROM_EMAIL || '';
    this.fromName = config?.fromName || process.env.RESEND_FROM_NAME || 'Embee Nexus';
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.apiKey) {
      logger.error('resend.missing_api_key');
      return { success: false, error: 'Resend API key not configured', retryable: false };
    }

    if (!this.fromEmail) {
      logger.error('resend.missing_from_email');
      return { success: false, error: 'Resend from-email not configured', retryable: false };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo,
          tags: message.tags,
        }),
      });

      const data = await response.json() as { id?: string; error?: { message?: string; type?: string } };

      if (!response.ok) {
        const errorMsg = data?.error?.message || 'Unknown Resend error';
        const errorType = data?.error?.type || 'unknown';

        // Determine if retryable (rate limits, server errors)
        const retryable = response.status === 429 || response.status >= 500;

        logger.warn('resend.send_failed', {
          status: response.status,
          error_type: errorType,
          retryable,
        });

        return { success: false, error: errorMsg, retryable };
      }

      logger.info('resend.email_sent', {
        provider_message_id: data.id,
        to: message.to,
      });

      return { success: true, providerMessageId: data.id };
    } catch (error) {
      logger.error('resend.send_exception', {
        to: message.to,
      }, error instanceof Error ? error : undefined);

      return { success: false, error: 'Network error sending email', retryable: true };
    }
  }

  async verify(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch('https://api.resend.com/domains', {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
