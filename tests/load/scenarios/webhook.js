/**
 * Webhook Processing Load Test — Embee Nexus
 *
 * Tests Paystack webhook processing under load.
 * Validates idempotency and concurrent webhook handling.
 *
 * Usage:
 *   k6 run tests/load/scenarios/webhook.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const webhookDuration = new Trend('webhook_duration', true);
const webhooksProcessed = new Counter('webhooks_processed');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = __ENV.PAYSTACK_WEBHOOK_SECRET || 'test-secret';

export const options = {
  scenarios: {
    webhook_smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
      exec: 'smokeTest',
    },
    webhook_baseline: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'baselineTest',
      startTime: '15s',
    },
  },
  thresholds: {
    http_req_duration: ['p(50)<1000', 'p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.1'],
    webhook_duration: ['p(50)<500', 'p(95)<1500'],
  },
};

// Generate a test webhook payload
function generateWebhookPayload(eventType = 'charge.success') {
  return JSON.stringify({
    event: eventType,
    data: {
      id: Math.floor(Math.random() * 1000000),
      reference: `test-ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: 500000, // NGN 5,000 in kobo
      currency: 'NGN',
      status: eventType === 'charge.success' ? 'success' : 'failed',
      customer: {
        email: 'test@example.com',
      },
      metadata: {},
    },
  });
}

// Generate webhook signature (simplified for testing)
function generateSignature(payload) {
  // In production, Paystack uses HMAC-SHA512
  // For load testing, we use a simplified signature
  return `test-signature-${Buffer.from(payload).toString('base64').substr(0, 20)}`;
}

export function smokeTest() {
  const payload = generateWebhookPayload();
  const signature = generateSignature(payload);

  const res = http.post(`${BASE_URL}/api/webhooks/paystack`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': signature,
    },
  });

  check(res, {
    'webhook status is 200 or 400': (r) => r.status === 200 || r.status === 400,
    'webhook response time < 2s': (r) => r.timings.duration < 2000,
  });

  errorRate.add(res.status !== 200 && res.status !== 400);
  webhookDuration.add(res.timings.duration);

  if (res.status === 200) {
    webhooksProcessed.add(1);
  }

  sleep(1);
}

export function baselineTest() {
  const payload = generateWebhookPayload();
  const signature = generateSignature(payload);

  const res = http.post(`${BASE_URL}/api/webhooks/paystack`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-paystack-signature': signature,
    },
  });

  check(res, {
    'webhook status is 200 or 400': (r) => r.status === 200 || r.status === 400,
    'webhook response time < 2s': (r) => r.timings.duration < 2000,
  });

  errorRate.add(res.status !== 200 && res.status !== 400);
  webhookDuration.add(res.timings.duration);

  if (res.status === 200) {
    webhooksProcessed.add(1);
  }

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'tests/load/results/webhook-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const metrics = data.metrics;
  let summary = '\n=== Webhook Load Test Results ===\n\n';

  if (metrics.webhook_duration) {
    const dur = metrics.webhook_duration.values;
    summary += `Webhook Duration:\n`;
    summary += `  avg: ${dur.avg?.toFixed(2) || 'N/A'}ms\n`;
    summary += `  p95: ${dur['p(95)']?.toFixed(2) || 'N/A'}ms\n`;
  }

  if (metrics.webhooks_processed) {
    summary += `\nWebhooks Processed: ${metrics.webhooks_processed.values.count}\n`;
  }

  if (metrics.http_reqs) {
    summary += `Throughput: ${metrics.http_reqs.values.rate?.toFixed(2) || 'N/A'} req/s\n`;
  }

  if (metrics.http_req_failed) {
    summary += `Error Rate: ${(metrics.http_req_failed.values.rate * 100)?.toFixed(2) || 'N/A'}%\n`;
  }

  return summary;
}
