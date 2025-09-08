// K6 Load Testing Script for Credit Card Processor
// Run with: k6 run tests/load/load-testing.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const apiResponseTime = new Trend('api_response_time');
export const requestCount = new Counter('total_requests');

// Test configuration
export let options = {
  stages: [
    // Warm-up
    { duration: '30s', target: 5 },
    // Ramp up
    { duration: '1m', target: 10 },
    // Sustained load
    { duration: '2m', target: 15 },
    // Peak load
    { duration: '30s', target: 25 },
    // Ramp down
    { duration: '30s', target: 0 },
  ],
  
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'], // Error rate under 10%
    errors: ['rate<0.1'],
    api_response_time: ['p(95)<1500'],
  },
  
  // Additional options for different test scenarios
  scenarios: {
    // Standard user load
    standard_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 10 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'standard_load' },
    },
    
    // Stress test
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'stress_test' },
    },
    
    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '10s', target: 100 }, // Sudden spike
        { duration: '30s', target: 100 },
        { duration: '10s', target: 5 },
      ],
      tags: { test_type: 'spike_test' },
    },
  },
};

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:8001';
const DEV_USER = __ENV.DEV_USER || 'rcox';

// Helper function to create authenticated headers
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-dev-user': DEV_USER,
    'User-Agent': 'k6-load-test/1.0',
  };
}

// Test data
const testSessions = [
  { name: 'Load Test Session 1', description: 'Automated load test session' },
  { name: 'Load Test Session 2', description: 'Performance testing session' },
  { name: 'Load Test Session 3', description: 'Stress testing session' },
];

export default function () {
  const testStart = Date.now();
  
  // Test 1: Frontend page loading
  group('Frontend Load Tests', function () {
    const pages = ['/', '/dashboard', '/upload', '/results'];
    
    for (const page of pages) {
      const response = http.get(`${BASE_URL}${page}`, {
        headers: { 'User-Agent': 'k6-load-test/1.0' },
        timeout: '10s',
      });
      
      const success = check(response, {
        [`${page} status is 200`]: (r) => r.status === 200,
        [`${page} load time < 3s`]: (r) => r.timings.duration < 3000,
        [`${page} has content`]: (r) => r.body.length > 100,
      });
      
      if (!success) {
        errorRate.add(1);
        console.error(`Frontend page ${page} failed: ${response.status}`);
      } else {
        errorRate.add(0);
      }
      
      requestCount.add(1);
      sleep(0.5); // Brief pause between page requests
    }
  });
  
  // Test 2: Authentication API
  group('Authentication API Tests', function () {
    const authResponse = http.get(`${API_URL}/api/auth/current-user`, {
      headers: getAuthHeaders(),
      timeout: '5s',
    });
    
    const authSuccess = check(authResponse, {
      'auth status is 200': (r) => r.status === 200,
      'auth response time < 1s': (r) => r.timings.duration < 1000,
      'auth returns user data': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.username && data.is_authenticated;
        } catch {
          return false;
        }
      },
    });
    
    apiResponseTime.add(authResponse.timings.duration);
    requestCount.add(1);
    
    if (!authSuccess) {
      errorRate.add(1);
      console.error(`Auth API failed: ${authResponse.status}`);
    } else {
      errorRate.add(0);
    }
  });
  
  // Test 3: Session Management API
  group('Session Management Tests', function () {
    // List existing sessions
    const listResponse = http.get(`${API_URL}/api/sessions`, {
      headers: getAuthHeaders(),
      timeout: '5s',
    });
    
    const listSuccess = check(listResponse, {
      'sessions list status is 200': (r) => r.status === 200,
      'sessions list response time < 2s': (r) => r.timings.duration < 2000,
      'sessions list has data': (r) => r.body.length > 10,
    });
    
    apiResponseTime.add(listResponse.timings.duration);
    requestCount.add(1);
    
    if (!listSuccess) {
      errorRate.add(1);
      console.error(`Sessions list failed: ${listResponse.status}`);
    } else {
      errorRate.add(0);
    }
    
    // Create new session (occasionally)
    if (Math.random() < 0.3) { // 30% chance to create session
      const sessionData = testSessions[Math.floor(Math.random() * testSessions.length)];
      
      const createResponse = http.post(
        `${API_URL}/api/sessions`,
        JSON.stringify({
          ...sessionData,
          name: `${sessionData.name} ${Date.now()}`,
        }),
        {
          headers: getAuthHeaders(),
          timeout: '10s',
        }
      );
      
      const createSuccess = check(createResponse, {
        'session create status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'session create response time < 3s': (r) => r.timings.duration < 3000,
      });
      
      apiResponseTime.add(createResponse.timings.duration);
      requestCount.add(1);
      
      if (!createSuccess) {
        errorRate.add(1);
        console.error(`Session create failed: ${createResponse.status} - ${createResponse.body}`);
      } else {
        errorRate.add(0);
      }
    }
  });
  
  // Test 4: Health and Monitoring Endpoints
  group('Monitoring API Tests', function () {
    const healthEndpoints = [
      '/api/health',
      '/api/monitoring/system',
      '/api/monitoring/application',
    ];
    
    for (const endpoint of healthEndpoints) {
      const response = http.get(`${API_URL}${endpoint}`, {
        headers: getAuthHeaders(),
        timeout: '5s',
      });
      
      const success = check(response, {
        [`${endpoint} is accessible`]: (r) => r.status < 500,
        [`${endpoint} response time < 2s`]: (r) => r.timings.duration < 2000,
      });
      
      apiResponseTime.add(response.timings.duration);
      requestCount.add(1);
      
      if (!success) {
        errorRate.add(1);
      } else {
        errorRate.add(0);
      }
    }
  });
  
  // Test 5: Concurrent API Operations
  group('Concurrent Operations Test', function () {
    // Simulate concurrent requests that might happen in real usage
    const concurrentRequests = [
      () => http.get(`${API_URL}/api/auth/current-user`, { headers: getAuthHeaders() }),
      () => http.get(`${API_URL}/api/sessions`, { headers: getAuthHeaders() }),
      () => http.get(`${API_URL}/api/health`, { headers: getAuthHeaders() }),
    ];
    
    // Execute requests concurrently
    const responses = http.batch(
      concurrentRequests.map(req => ['GET', req])
    );
    
    let successCount = 0;
    responses.forEach((response, index) => {
      const success = check(response, {
        [`concurrent request ${index + 1} succeeds`]: (r) => r.status < 400,
        [`concurrent request ${index + 1} fast`]: (r) => r.timings.duration < 3000,
      });
      
      if (success) successCount++;
      apiResponseTime.add(response.timings.duration);
      requestCount.add(1);
    });
    
    // At least 2 out of 3 concurrent requests should succeed
    check(null, {
      'concurrent requests mostly successful': () => successCount >= 2,
    });
    
    errorRate.add(successCount < 2 ? 1 : 0);
  });
  
  // Realistic user think time
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

// Setup function (runs once at start)
export function setup() {
  console.log('Starting load test...');
  console.log(`Target frontend: ${BASE_URL}`);
  console.log(`Target API: ${API_URL}`);
  console.log(`Test user: ${DEV_USER}`);
  
  // Verify services are accessible
  const frontendCheck = http.get(BASE_URL, { timeout: '10s' });
  const apiCheck = http.get(`${API_URL}/api/health`, { 
    headers: getAuthHeaders(),
    timeout: '10s' 
  });
  
  if (frontendCheck.status !== 200) {
    console.error(`Frontend not accessible: ${frontendCheck.status}`);
  }
  
  if (apiCheck.status !== 200) {
    console.error(`API not accessible: ${apiCheck.status}`);
  }
  
  return {
    frontendStatus: frontendCheck.status,
    apiStatus: apiCheck.status,
  };
}

// Teardown function (runs once at end)
export function teardown(data) {
  console.log('Load test completed.');
  console.log(`Frontend was accessible: ${data.frontendStatus === 200}`);
  console.log(`API was accessible: ${data.apiStatus === 200}`);
}

// Helper function for grouping tests
function group(name, fn) {
  console.log(`\n--- ${name} ---`);
  fn();
}