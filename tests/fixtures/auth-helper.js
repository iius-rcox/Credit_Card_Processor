/**
 * Authentication Helper for Playwright Tests
 * Handles development authentication using x-dev-user header
 */

export class AuthHelper {
  constructor(page) {
    this.page = page;
    this.devUser = process.env.VITE_DEV_USER || 'rcox';
  }

  /**
   * Set development authentication headers for API requests
   */
  async setupDevAuth() {
    await this.page.setExtraHTTPHeaders({
      'x-dev-user': this.devUser
    });
  }

  /**
   * Navigate to a page with authentication headers
   */
  async navigateWithAuth(url) {
    await this.setupDevAuth();
    await this.page.goto(url);
  }

  /**
   * Make an authenticated API request
   */
  async makeAuthenticatedRequest(endpoint, options = {}) {
    const defaultOptions = {
      headers: {
        'x-dev-user': this.devUser,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const response = await this.page.request.fetch(endpoint, {
      ...options,
      headers: defaultOptions.headers
    });

    return response;
  }

  /**
   * Verify authentication is working
   */
  async verifyAuthentication() {
    const response = await this.makeAuthenticatedRequest('/api/auth/current-user');
    const isAuthenticated = response.ok();
    const responseData = isAuthenticated ? await response.json() : null;

    return {
      isAuthenticated,
      user: responseData,
      status: response.status()
    };
  }

  /**
   * Wait for authentication to be established
   */
  async waitForAuthentication(timeout = 5000) {
    let attempts = 0;
    const maxAttempts = Math.floor(timeout / 500);

    while (attempts < maxAttempts) {
      const authResult = await this.verifyAuthentication();
      if (authResult.isAuthenticated) {
        return authResult;
      }
      
      await this.page.waitForTimeout(500);
      attempts++;
    }

    throw new Error(`Authentication failed after ${timeout}ms`);
  }

  /**
   * Setup page with authentication and navigate
   */
  async setupPageWithAuth(url = '/') {
    await this.setupDevAuth();
    
    // Intercept API requests to ensure headers are preserved
    await this.page.route('/api/**', async (route) => {
      const request = route.request();
      const headers = {
        ...request.headers(),
        'x-dev-user': this.devUser
      };

      await route.continue({
        headers
      });
    });

    await this.page.goto(url);
    await this.waitForAuthentication();
  }
}

/**
 * Global authentication setup for tests
 */
export async function setupAuthForTest(page) {
  const authHelper = new AuthHelper(page);
  await authHelper.setupPageWithAuth();
  return authHelper;
}

/**
 * Verify API endpoint is accessible with authentication
 */
export async function verifyAPIEndpoint(page, endpoint, expectedStatus = 200) {
  const authHelper = new AuthHelper(page);
  const response = await authHelper.makeAuthenticatedRequest(endpoint);
  
  return {
    success: response.status() === expectedStatus,
    status: response.status(),
    response: response.ok() ? await response.json() : await response.text()
  };
}