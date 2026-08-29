/**
 * Email Provider Interface — Embee Nexus
 *
 * Provider-agnostic interface for sending transactional emails.
 * All email adapters (Resend, SendGrid, SES, etc.) must implement this interface.
 *
 * Domain logic depends ONLY on this interface.
 * The specific provider is selected at configuration time.
 */

export interface EmailMessage {
  /** Recipient email address */
  to: string;
  /** Sender email address (must be from verified domain) */
  from: string;
  /** Email subject line */
  subject: string;
  /** HTML body content */
  html: string;
  /** Plain text fallback */
  text?: string;
  /** Optional reply-to address */
  replyTo?: string;
  /** Optional tags for categorization */
  tags?: Array<{ name: string; value: string }>;
}

export interface EmailSendResult {
  /** Whether the send was accepted by the provider */
  success: boolean;
  /** Provider-specific message ID for tracking */
  providerMessageId?: string;
  /** Error message if send failed */
  error?: string;
  /** Whether the failure is retryable */
  retryable?: boolean;
}

export interface EmailProvider {
  /** Provider name for logging (e.g., 'resend', 'sendgrid') */
  readonly name: string;

  /** Send an email via the provider */
  send(message: EmailMessage): Promise<EmailSendResult>;

  /** Verify the provider is configured and accessible */
  verify(): Promise<boolean>;
}
