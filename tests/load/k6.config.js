/**
 * k6 Load Testing Configuration — Embee Nexus
 *
 * Global configuration for all load test scenarios.
 * Run against a non-production/test environment only.
 *
 * Usage:
 *   k6 run tests/load/scenarios/health.js
 *   k6 run tests/load/scenarios/quote.js
 */

// Base URL — override via environment variable
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Thresholds — pass/fail criteria
export const DEFAULT_THRESHURES = {
  http_req_duration: [
    'p(50)<500',   // p50 under 500ms
    'p(95)<1000',  // p95 under 1s
    'p(99)<2000',  // p99 under 2s
  ],
  http_req_failed: ['rate<0.05'],  // Error rate under 5%
  http_reqs: ['rate>10'],          // Throughput over 10 req/s
};

// Scenarios
export const SCENARIOS = {
  // Smoke test — verify setup works
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '10s',
  },

  // Baseline — establish normal performance
  baseline: {
    executor: 'constant-vus',
    vus: 5,
    duration: '30s',
  },

  // Average load — typical production traffic
  averageLoad: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 10 },
      { duration: '60s', target: 10 },
      { duration: '10s', target: 0 },
    ],
  },

  // Stress test — find breaking point
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 20 },
      { duration: '60s', target: 20 },
      { duration: '30s', target: 50 },
      { duration: '30s', target: 0 },
    ],
  },
};

// Test data
export const TEST_DATA = {
  // Use environment variables for test-specific data
  testQuotePayload: {
    pickup_latitude: 9.0579,
    pickup_longitude: 7.4951,
    destination_latitude: 9.0765,
    destination_longitude: 7.3986,
    category_id: __ENV.TEST_CATEGORY_ID || 'default',
    quantity: 1,
  },
};
