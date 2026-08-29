/**
 * Email Templates — Embee Nexus
 *
 * Transactional email templates for notification events.
 * Templates produce content (HTML/text). The provider adapter delivers it.
 * Templates are provider-neutral — no Resend/SendGrid references.
 */

export interface TemplateData {
  [key: string]: string | number | undefined;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function interpolate(template: string, data: TemplateData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key];
    return value !== undefined ? String(value) : '';
  });
}

const BASE_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; }
  .header { background: #1a1a2e; color: #fff; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
  .content { padding: 24px; }
  .footer { padding: 16px 24px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  .btn { display: inline-block; padding: 12px 24px; background: #f59e0b; color: #000; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .status-paid { background: #d1fae5; color: #065f46; }
  .status-transit { background: #dbeafe; color: #1e40af; }
  .status-delivered { background: #d1fae5; color: #065f46; }
  .status-cancelled { background: #fee2e2; color: #991b1b; }
`;

function wrapInBaseLayout(title: string, content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><style>${BASE_STYLES}</style></head><body><div class="container"><div class="header"><h1>Embee Nexus</h1></div><div class="content">${content}</div><div class="footer">Embee Nexus — On-demand delivery platform</div></div></body></html>`;
}

// =============================================
// ORDER TEMPLATES
// =============================================

export function orderCreatedTemplate(data: TemplateData): EmailTemplate {
  const subject = `Order Confirmed — ${data.order_number}`;
  const content = `
    <h2>Order Confirmed</h2>
    <p>Hi ${data.customer_name || 'there'},</p>
    <p>Your order <strong>${data.order_number}</strong> has been confirmed and is awaiting payment.</p>
    <p><strong>Amount:</strong> ₦${data.amount}</p>
    <p><strong>Pickup:</strong> ${data.pickup_address}</p>
    <p><strong>Destination:</strong> ${data.destination_address}</p>
    <p>We'll notify you once a rider is assigned.</p>
  `;
  return { subject, html: wrapInBaseLayout(subject, content), text: content.replace(/<[^>]+>/g, '') };
}

export function paymentSuccessTemplate(data: TemplateData): EmailTemplate {
  const subject = `Payment Received — ${data.order_number}`;
  const content = `
    <h2>Payment Successful</h2>
    <p>Hi ${data.customer_name || 'there'},</p>
    <p>Your payment for order <strong>${data.order_number}</strong> has been received.</p>
    <p><strong>Amount:</strong> ₦${data.amount}</p>
    <p>We're now searching for a rider to deliver your package.</p>
  `;
  return { subject, html: wrapInBaseLayout(subject, content), text: content.replace(/<[^>]+>/g, '') };
}

export function paymentFailedTemplate(data: TemplateData): EmailTemplate {
  const subject = `Payment Failed — ${data.order_number}`;
  const content = `
    <h2>Payment Failed</h2>
    <p>Hi ${data.customer_name || 'there'},</p>
    <p>Unfortunately, your payment for order <strong>${data.order_number}</strong> could not be processed.</p>
    <p><strong>Amount:</strong> ₦${data.amount}</p>
    <p>Please try again or use a different payment method.</p>
  `;
  return { subject, html: wrapInBaseLayout(subject, content), text: content.replace(/<[^>]+>/g, '') };
}

export function riderAssignedTemplate(data: TemplateData): EmailTemplate {
  const subject = `Rider Assigned — ${data.order_number}`;
  const content = `
    <h2>Rider Assigned</h2>
    <p>Hi ${data.customer_name || 'there'},</p>
    <p>A rider has been assigned to your order <strong>${data.order_number}</strong>.</p>
    <p><strong>Rider:</strong> ${data.rider_name}</p>
    <p><strong>Estimated arrival:</strong> ${data.eta || 'Calculating...'}</p>
    <p>You can track your delivery in real-time from your orders page.</p>
  `;
  return { subject, html: wrapInBaseLayout(subject, content), text: content.replace(/<[^>]+>/g, '') };
}

export function deliveryCompleteTemplate(data: TemplateData): EmailTemplate {
  const subject = `Delivery Complete — ${data.order_number}`;
  const content = `
    <h2>Delivery Complete</h2>
    <p>Hi ${data.customer_name || 'there'},</p>
    <p>Your order <strong>${data.order_number}</strong> has been delivered successfully!</p>
    <p>We hope you had a great experience. You can rate your delivery from your orders page.</p>
  `;
  return { subject, html: wrapInBaseLayout(subject, content), text: content.replace(/<[^>]+>/g, '') };
}

export function orderCancelledTemplate(data: TemplateData): EmailTemplate {
  const subject = `Order Cancelled — ${data.order_number}`;
  const content = `
    <h2>Order Cancelled</h2>
    <p>Hi ${data.customer_name || 'there'},</p>
    <p>Your order <strong>${data.order_number}</strong> has been cancelled.</p>
    ${data.refund_info ? `<p><strong>Refund:</strong> ${data.refund_info}</p>` : ''}
    <p>If you have any questions, please contact support.</p>
  `;
  return { subject, html: wrapInBaseLayout(subject, content), text: content.replace(/<[^>]+>/g, '') };
}

// =============================================
// TEMPLATE REGISTRY
// =============================================

export type TemplateKey =
  | 'order_created'
  | 'payment_success'
  | 'payment_failed'
  | 'rider_assigned'
  | 'rider_heading_to_pickup'
  | 'rider_arrived_at_pickup'
  | 'package_picked_up'
  | 'package_in_transit'
  | 'rider_at_destination'
  | 'delivery_complete'
  | 'order_cancelled'
  | 'refund_initiated'
  | 'no_riders_available'
  | 'security_alert';

const TEMPLATE_REGISTRY: Record<TemplateKey, (data: TemplateData) => EmailTemplate> = {
  order_created: orderCreatedTemplate,
  payment_success: paymentSuccessTemplate,
  payment_failed: paymentFailedTemplate,
  rider_assigned: riderAssignedTemplate,
  rider_heading_to_pickup: riderAssignedTemplate, // reuse
  rider_arrived_at_pickup: riderAssignedTemplate, // reuse
  package_picked_up: riderAssignedTemplate, // reuse
  package_in_transit: riderAssignedTemplate, // reuse
  rider_at_destination: riderAssignedTemplate, // reuse
  delivery_complete: deliveryCompleteTemplate,
  order_cancelled: orderCancelledTemplate,
  refund_initiated: orderCancelledTemplate, // reuse with refund context
  no_riders_available: orderCreatedTemplate, // placeholder
  security_alert: orderCreatedTemplate, // placeholder
};

/**
 * Resolve an email template for a notification type.
 * Returns null if no email template exists for the type (in-app only).
 */
export function resolveEmailTemplate(
  type: string,
  data: TemplateData
): EmailTemplate | null {
  const templateFn = TEMPLATE_REGISTRY[type as TemplateKey];
  if (!templateFn) return null;
  return templateFn(data);
}
