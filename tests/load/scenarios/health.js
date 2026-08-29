/**
 * Health Endpoint Load Test — Embee Nexus
 *
 * Tests the /api/health endpoint under load.
 * This is the simplest endpoint — validates k6 setup and baseline performance.
 *
 * Usage:
 *   k6 run tests/load/scenarios/health.js
 *   k6 run --out json=results/health.json tests/load/scenarios/health.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const healthDuration = new Trend('health_duration', true);

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    health_smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
      exec: 'smokeTest',
    },
    health_baseline: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'baselineTest',
      startTime: '15s',
    },
    health_average: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '60s', target: 10 },
        { duration: '10s', target: 0 },
      ],
      exec: 'averageTest',
      startTime: '50s',
    },
  },
  thresholds: {
    http_req_duration: ['p(50)<500', 'p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
    health_duration: ['p(50)<200', 'p(95)<500'],
  },
};

export function smokeTest() {
  const res = http.get(`${BASE_URL}/api/health`);

  check(res, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 500ms': (r) => r.timings.duration < 500,
    'health body has status field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(res.status !== 200);
  healthDuration.add(res.timings.duration);

  sleep(1);
}

export function baselineTest() {
  const res = http.get(`${BASE_URL}/api/health`);

  check(res, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(res.status !== 200);
  healthDuration.add(res.timings.duration);

  sleep(1);
}

export function averageTest() {
  const res = http.get(`${BASE_URL}/api/health`);

  check(res, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(res.status !== 200);
  healthDuration.add(res.timings.duration);

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'tests/load/results/health-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  // Simple text summary
  const metrics = data.metrics;
  let summary = '\n=== Health Endpoint Load Test Results ===\n\n';

  if (metrics.http_req_duration) {
    const dur = metrics.http_req_duration.values;
    summary += `Request Duration:\n`;
    summary += `  p50: ${dur.avg?.toFixed(2) || 'N/A'}ms\n`;
    summary += `  p95: ${dur['p(95)']?.toFixed(2) || 'N/A'}ms\n`;
    summary += `  p99: ${dur['p(99)']?.toFixed(2) || 'N/A'}ms\n`;
  }

  if (metrics.http_reqs) {
    summary += `\nThroughput: ${metrics.http_reqs.values.rate?.toFixed(2) || 'N/A'} req/s\n`;
  }

  if (metrics.http_req_failed) {
    summary += `Error Rate: ${(metrics.http_req_failed.values.rate * 100)?.toFixed(2) || 'N/A'}%\n`;
  }

  return summary;
}
