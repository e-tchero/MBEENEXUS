/**
 * Notification Providers — Embee Nexus
 *
 * Provider abstraction layer. The application depends on EmailProvider,
 * not on Resend or any specific provider. Switching providers requires
 * only configuration + adapter changes, not domain logic changes.
 */

export type { EmailProvider, EmailMessage, EmailSendResult } from './email-provider';
export { ResendEmailProvider } from './resend-email-provider';
import type { EmailProvider } from './email-provider';
import { ResendEmailProvider } from './resend-email-provider';

/**
 * Create an email provider based on current environment configuration.
 * The EMAIL_PROVIDER env var selects the adapter (default: 'resend').
 *
 * To switch providers in the future:
 *   1. Add a new adapter implementing EmailProvider
 *   2. Add provider selection logic here
 *   3. Set EMAIL_PROVIDER env var
 *   4. No domain logic changes required
 */
export function createEmailProvider(): EmailProvider {
  const providerName = process.env.EMAIL_PROVIDER || 'resend';

  switch (providerName) {
    case 'resend':
      return new ResendEmailProvider();
    // Future providers:
    // case 'sendgrid':
    //   return new SendGridEmailProvider();
    // case 'ses':
    //   return new AmazonSesEmailProvider();
    default:
      // Fallback to Resend for unknown providers
      return new ResendEmailProvider();
  }
}

/** Singleton email provider instance */
let _emailProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!_emailProvider) {
    _emailProvider = createEmailProvider();
  }
  return _emailProvider;
}

/** Reset provider instance (for testing) */
export function resetEmailProvider(): void {
  _emailProvider = null;
}
