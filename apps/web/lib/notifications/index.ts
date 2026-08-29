/**
 * Notification Module — Embee Nexus
 *
 * Central export for the notification subsystem.
 * Provider-agnostic. Domain logic imports from here, never from Resend directly.
 */

// Provider abstraction
export type { EmailProvider, EmailMessage, EmailSendResult } from './providers/email-provider';
export { createEmailProvider, getEmailProvider, resetEmailProvider } from './providers';
export { ResendEmailProvider } from './providers/resend-email-provider';

// Core service
export {
  NotificationService,
  getNotificationService,
  resetNotificationService,
} from './notification-service';
export type { CreateNotificationInput, NotificationResult, NotificationType, NotificationChannel } from './notification-service';

// Event hooks
export {
  onOrderCreated,
  onPaymentSuccess,
  onPaymentFailed,
  onRiderAssigned,
  onRiderHeadingToPickup,
  onDeliveryCompleted,
  onOrderCancelled,
  onRefundInitiated,
  onNewRiderOffer,
} from './event-hooks';
export type { NotificationHookContext } from './event-hooks';

// Templates
export { resolveEmailTemplate } from './templates';
export type { TemplateData, EmailTemplate, TemplateKey } from './templates';
