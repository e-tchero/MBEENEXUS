/**
 * Notification Service — Embee Nexus
 *
 * Central notification orchestrator. Handles:
 * - Notification creation (durable write)
 * - Channel selection
 * - Provider selection
 * - Delivery state management
 * - Idempotency
 * - Retry scheduling
 *
 * Architecture: Domain Event → NotificationService → Provider Interface → Provider Adapter
 * Domain logic never imports Resend/SendGrid directly.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { NOTIFICATION_TYPES } from '@repo/shared/constants';
import type { EmailProvider } from './providers/email-provider';
import { resolveEmailTemplate, type TemplateData } from './templates';

// =============================================
// TYPES
// =============================================

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export interface CreateNotificationInput {
  /** User who receives the notification */
  userId: string;
  /** Notification type (from NOTIFICATION_TYPES) */
  type: string;
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Channels to deliver on (default: ['in_app']) */
  channels?: NotificationChannel[];
  /** Business event reference (for idempotency) */
  referenceType?: string;
  /** Reference entity ID (for idempotency) */
  referenceId?: string;
  /** Additional data for templates/logging */
  metadata?: Record<string, unknown>;
  /** Template data for email rendering */
  templateData?: TemplateData;
}

export interface NotificationResult {
  notificationId: string;
  created: boolean;
  deliveryResults: Record<string, { success: boolean; error?: string }>;
}

// =============================================
// NOTIFICATION SERVICE
// =============================================

export class NotificationService {
  private emailProvider: EmailProvider | null;

  constructor(emailProvider?: EmailProvider) {
    this.emailProvider = emailProvider || null;
  }

  setEmailProvider(provider: EmailProvider): void {
    this.emailProvider = provider;
  }

  /**
   * Create and deliver a notification.
   * In-app: synchronous durable write (same transaction as business operation).
   * Email/SMS/Push: async via background job infrastructure.
   */
  async notify(input: CreateNotificationInput): Promise<NotificationResult> {
    const serviceRole = await createServiceRoleClient();
    const channels = input.channels || ['in_app'];

    // 1. Idempotency check: skip if same user+type+reference already exists
    if (input.referenceType && input.referenceId) {
      const { data: existing } = await serviceRole
        .from('notifications')
        .select('id')
        .eq('user_id', input.userId)
        .eq('type', input.type)
        .eq('reference_type', input.referenceType)
        .eq('reference_id', input.referenceId)
        .limit(1);

      if (existing && existing.length > 0) {
        logger.info('notification.duplicate_skipped', {
          notification_id: existing[0].id,
          type: input.type,
          user_id: input.userId,
        });
        return {
          notificationId: existing[0].id,
          created: false,
          deliveryResults: {},
        };
      }
    }

    // 2. Create durable notification record (atomic)
    const notificationId = crypto.randomUUID();
    const { error: insertError } = await serviceRole
      .from('notifications')
      .insert({
        id: notificationId,
        user_id: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        in_app: channels.includes('in_app'),
        email: channels.includes('email'),
        sms: channels.includes('sms'),
        push: channels.includes('push'),
        channel: channels[0] || 'in_app',
        reference_type: input.referenceType || null,
        reference_id: input.referenceId || null,
        metadata: input.metadata || null,
        delivery_status: 'pending',
      });

    if (insertError) {
      // Unique constraint violation = duplicate → idempotent success
      if (insertError.code === '23505') {
        logger.info('notification.idempotent_skip', {
          type: input.type,
          user_id: input.userId,
        });
        return { notificationId: '', created: false, deliveryResults: {} };
      }

      logger.error('notification.create_failed', {
        type: input.type,
        user_id: input.userId,
      }, insertError instanceof Error ? insertError : undefined);
      throw new Error('Failed to create notification');
    }

    logger.info('notification.created', {
      notification_id: notificationId,
      type: input.type,
      channels,
    });

    // 3. Dispatch to channels
    const deliveryResults: Record<string, { success: boolean; error?: string }> = {};

    // In-app: already durable, mark as delivered
    if (channels.includes('in_app')) {
      await serviceRole
        .from('notifications')
        .update({ delivery_status: 'delivered', sent_at: new Date().toISOString() })
        .eq('id', notificationId);
      deliveryResults.in_app = { success: true };
    }

    // Email: create delivery record for async processing
    if (channels.includes('email') && input.templateData) {
      const deliveryResult = await this.createDeliveryRecord(
        serviceRole, notificationId, 'email', input, input.templateData
      );
      deliveryResults.email = deliveryResult;

      // If email provider is available, attempt immediate delivery
      if (deliveryResult.success && this.emailProvider) {
        const emailResult = await this.sendEmail(serviceRole, notificationId, input, input.templateData);
        deliveryResults.email = emailResult;
      }
    }

    return { notificationId, created: true, deliveryResults };
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const serviceRole = await createServiceRoleClient();
    const { error } = await serviceRole
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      logger.error('notification.mark_read_failed', { notification_id: notificationId });
      return false;
    }
    return true;
  }

  /**
   * Mark all unread notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<number> {
    const serviceRole = await createServiceRoleClient();
    const { data, error } = await serviceRole
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
      .select('id');

    if (error) {
      logger.error('notification.mark_all_read_failed', { user_id: userId });
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Get unread notification count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const serviceRole = await createServiceRoleClient();
    const { count, error } = await serviceRole
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) return 0;
    return count || 0;
  }

  /**
   * List notifications for a user with pagination.
   */
  async listNotifications(
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ): Promise<{ notifications: Record<string, unknown>[]; total: number }> {
    const serviceRole = await createServiceRoleClient();
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const offset = (page - 1) * limit;

    let query = serviceRole
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('notification.list_failed', { user_id: userId });
      return { notifications: [], total: 0 };
    }

    return { notifications: data || [], total: count || 0 };
  }

  // =============================================
  // PRIVATE HELPERS
  // =============================================

  private async createDeliveryRecord(
    serviceRole: Awaited<ReturnType<typeof createServiceRoleClient>>,
    notificationId: string,
    channel: string,
    input: CreateNotificationInput,
    _templateData: TemplateData
  ): Promise<{ success: boolean; error?: string }> {
    const providerName = process.env.EMAIL_PROVIDER || 'resend';

    const { error } = await serviceRole
      .from('notification_deliveries')
      .insert({
        notification_id: notificationId,
        channel,
        provider: providerName,
        delivery_status: 'pending',
      });

    if (error) {
      logger.error('notification.delivery_record_failed', {
        notification_id: notificationId,
        channel,
      });
      return { success: false, error: 'Failed to create delivery record' };
    }

    return { success: true };
  }

  private async sendEmail(
    serviceRole: Awaited<ReturnType<typeof createServiceRoleClient>>,
    notificationId: string,
    input: CreateNotificationInput,
    templateData: TemplateData
  ): Promise<{ success: boolean; error?: string; providerMessageId?: string }> {
    if (!this.emailProvider) {
      return { success: false, error: 'No email provider configured' };
    }

    // Resolve email template
    const template = resolveEmailTemplate(input.type, templateData);
    if (!template) {
      logger.warn('notification.no_email_template', { type: input.type });
      return { success: false, error: 'No email template for this notification type' };
    }

    // Get recipient email
    const { data: profile } = await serviceRole
      .from('profiles')
      .select('full_name')
      .eq('id', input.userId)
      .single();

    // We need the user's email from auth — use the user_id to look up
    // For now, we'll need to get it from the auth context
    // The caller should provide the email in templateData or we look it up
    const recipientEmail = templateData.email as string;
    if (!recipientEmail) {
      logger.warn('notification.missing_email', { user_id: input.userId });
      return { success: false, error: 'Recipient email not available' };
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@embeenexus.com';

    const result = await this.emailProvider.send({
      to: recipientEmail,
      from: fromEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [{ name: 'notification_type', value: input.type }],
    });

    // Update delivery record
    if (result.success) {
      await serviceRole
        .from('notification_deliveries')
        .update({
          delivery_status: 'sent',
          provider_message_id: result.providerMessageId,
        })
        .eq('notification_id', notificationId)
        .eq('channel', 'email');

      await serviceRole
        .from('notifications')
        .update({
          delivery_status: 'sent',
          provider: this.emailProvider.name,
          provider_message_id: result.providerMessageId,
          sent_at: new Date().toISOString(),
        })
        .eq('id', notificationId);
    } else {
      await serviceRole
        .from('notification_deliveries')
        .update({
          delivery_status: result.retryable ? 'failed' : 'permanent_failure',
          last_error: result.error,
          retry_count: 1,
        })
        .eq('notification_id', notificationId)
        .eq('channel', 'email');

      await serviceRole
        .from('notifications')
        .update({
          delivery_status: 'failed',
          last_error: result.error,
          retry_count: 1,
        })
        .eq('id', notificationId);
    }

    return { success: result.success, error: result.error, providerMessageId: result.providerMessageId };
  }
}

// Singleton instance
let _notificationService: NotificationService | null = null;

export function getNotificationService(emailProvider?: EmailProvider): NotificationService {
  if (!_notificationService) {
    _notificationService = new NotificationService(emailProvider);
  }
  return _notificationService;
}

/** Reset singleton (for testing) */
export function resetNotificationService(): void {
  _notificationService = null;
}
