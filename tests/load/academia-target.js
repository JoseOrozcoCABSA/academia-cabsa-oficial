import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const baseUrl = __ENV.TARGET_URL || 'http://127.0.0.1:6080';
const token = __ENV.AUTH_TOKEN || '';
const errors = new Rate('application_errors');
const latency = new Trend('application_latency', true);

export const options = {
  scenarios: {
    lectura_publica: {
      executor: 'ramping-arrival-rate',
      startRate: 20,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1200,
      stages: [
        { target: 100, duration: '2m' },
        { target: 300, duration: '5m' },
        { target: 600, duration: '5m' },
        { target: 0, duration: '1m' },
      ],
      exec: 'publicRead',
    },
    lectura_autenticada: {
      executor: 'constant-arrival-rate',
      rate: token ? 100 : 0,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 400,
      exec: 'authenticatedRead',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    application_errors: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1200'],
  },
};

function verify(response) {
  latency.add(response.timings.duration);
  const valid = check(response, {
    'estado esperado': (result) => result.status >= 200 && result.status < 400,
  });
  errors.add(!valid);
}

export function publicRead() {
  verify(http.get(`${baseUrl}/api/academia/courses`, {
    tags: { endpoint: 'courses_public' },
  }));
  sleep(Math.random() * 0.25);
}

export function authenticatedRead() {
  if (!token) return;
  verify(http.get(`${baseUrl}/api/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { endpoint: 'profile' },
  }));
}
