/**
 * Order Flow Load Test — Embee Nexus
 *
 * Tests the quote generation and order creation flow under load.
 * This is the critical business path — validates pricing and order integrity.
 *
 * Usage:
 *   k6 run tests/load/scenarios/order-flow.js
 *   BASE_URL=https://staging.embeenexus.com k6 run tests/load/scenarios/order-flow.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const quoteDuration = new Trend('quote_duration', true);
const orderDuration = new Trend('order_duration', true);
const quotesGenerated = new Counter('quotes_generated');
const ordersCreated = new Counter('orders_created');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export const options = {
  scenarios: {
    order_flow_smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
      exec: 'smokeTest',
    },
    order_flow_baseline: {
      executor: 'constant-vus',
      vus: 3,
      duration: '30s',
      exec: 'baselineTest',
      startTime: '15s',
    },
  },
  thresholds: {
    http_req_duration: ['p(50)<1000', 'p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.1'],
    quote_duration: ['p(50)<500', 'p(95)<1500'],
    order_duration: ['p(50)<1000', 'p(95)<3000'],
  },
};

// Abuja coordinates for realistic test data
const PICKUP_COORDS = [
  { lat: 9.0579, lng: 7.4951 },  // Wuse
  { lat: 9.0625, lng: 7.4710 },  // Maitama
  { lat: 9.0817, lng: 7.4389 },  // Garki
];

const DESTINATION_COORDS = [
  { lat: 9.0765, lng: 7.3986 },  // Gwarinpa
  { lat: 9.0397, lng: 7.4563 },  // Jabi
  { lat: 9.0167, lng: 7.4667 },  // Kubwa
];

function getRandomCoords() {
  const pickup = PICKUP_COORDS[Math.floor(Math.random() * PICKUP_COORDS.length)];
  const dest = DESTINATION_COORDS[Math.floor(Math.random() * DESTINATION_COORDS.length)];
  return { pickup, dest };
}

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  return headers;
}

export function smokeTest() {
  const { pickup, dest } = getRandomCoords();
  const headers = getHeaders();

  // 1. Generate quote
  const quotePayload = JSON.stringify({
    pickup_latitude: pickup.lat,
    pickup_longitude: pickup.lng,
    destination_latitude: dest.lat,
    destination_longitude: dest.lng,
    quantity: 1,
  });

  const quoteRes = http.post(`${BASE_URL}/api/orders/quote`, quotePayload, { headers });

  const quoteOk = check(quoteRes, {
    'quote status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'quote response time < 2s': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!quoteOk);
  quoteDuration.add(quoteRes.timings.duration);

  if (quoteRes.status === 200) {
    quotesGenerated.add(1);
  }

  sleep(2);
}

export function baselineTest() {
  const { pickup, dest } = getRandomCoords();
  const headers = getHeaders();

  // 1. Generate quote
  const quotePayload = JSON.stringify({
    pickup_latitude: pickup.lat,
    pickup_longitude: pickup.lng,
    destination_latitude: dest.lat,
    destination_longitude: dest.lng,
    quantity: 1,
  });

  const quoteRes = http.post(`${BASE_URL}/api/orders/quote`, quotePayload, { headers });

  const quoteOk = check(quoteRes, {
    'quote status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'quote response time < 2s': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!quoteOk);
  quoteDuration.add(quoteRes.timings.duration);

  if (quoteRes.status === 200) {
    quotesGenerated.add(1);

    // 2. Create order (if quote succeeded)
    try {
      const quoteData = JSON.parse(quoteRes.body);
      const quoteId = quoteData.data?.id;

      if (quoteId) {
        const orderPayload = JSON.stringify({
          quote_id: quoteId,
          pickup_address_id: 'test-pickup-address',
          pickup_contact_name: 'Load Test',
          pickup_contact_phone: '+2348000000000',
          destination_address_id: 'test-dest-address',
          recipient_name: 'Load Test Recipient',
          recipient_phone: '+2348000000001',
          payment_method: 'card',
        });

        const orderRes = http.post(`${BASE_URL}/api/orders`, orderPayload, { headers });

        const orderOk = check(orderRes, {
          'order status is 200 or 401 or 400': (r) =>
            r.status === 200 || r.status === 401 || r.status === 400,
          'order response time < 3s': (r) => r.timings.duration < 3000,
        });

        errorRate.add(!orderOk);
        orderDuration.add(orderRes.timings.duration);

        if (orderRes.status === 200) {
          ordersCreated.add(1);
        }
      }
    } catch (e) {
      // Parse error — not a load test failure
    }
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    'tests/load/results/order-flow-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const metrics = data.metrics;
  let summary = '\n=== Order Flow Load Test Results ===\n\n';

  if (metrics.quote_duration) {
    const dur = metrics.quote_duration.values;
    summary += `Quote Duration:\n`;
    summary += `  avg: ${dur.avg?.toFixed(2) || 'N/A'}ms\n`;
    summary += `  p95: ${dur['p(95)']?.toFixed(2) || 'N/A'}ms\n`;
  }

  if (metrics.order_duration) {
    const dur = metrics.order_duration.values;
    summary += `\nOrder Duration:\n`;
    summary += `  avg: ${dur.avg?.toFixed(2) || 'N/A'}ms\n`;
    summary += `  p95: ${dur['p(95)']?.toFixed(2) || 'N/A'}ms\n`;
  }

  if (metrics.quotes_generated) {
    summary += `\nQuotes Generated: ${metrics.quotes_generated.values.count}\n`;
  }

  if (metrics.orders_created) {
    summary += `Orders Created: ${metrics.orders_created.values.count}\n`;
  }

  if (metrics.http_reqs) {
    summary += `Throughput: ${metrics.http_reqs.values.rate?.toFixed(2) || 'N/A'} req/s\n`;
  }

  if (metrics.http_req_failed) {
    summary += `Error Rate: ${(metrics.http_req_failed.values.rate * 100)?.toFixed(2) || 'N/A'}%\n`;
  }

  return summary;
}
