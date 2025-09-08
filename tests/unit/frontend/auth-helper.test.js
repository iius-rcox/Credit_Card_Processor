/**
 * Unit tests for the authentication helper utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthHelper, setupAuthForTest, verifyAPIEndpoint } from '../../fixtures/auth-helper.js';

// Mock page object for testing
const createMockPage = () => {
  return {
    setExtraHTTPHeaders: vi.fn(),
    goto: vi.fn(),
    waitForTimeout: vi.fn(),
    route: vi.fn(),
    request: {
      fetch: vi.fn()
    },
    evaluate: vi.fn()
  };
};

// Mock response object
const createMockResponse = (status = 200, data = {}) => {
  return {
    ok: () => status >= 200 && status < 300,
    status: () => status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  };
};

describe('AuthHelper', () => {
  let mockPage;
  let authHelper;

  beforeEach(() => {
    mockPage = createMockPage();
    authHelper = new AuthHelper(mockPage);
  });

  describe('constructor', () => {
    it('should initialize with default dev user', () => {
      expect(authHelper.devUser).toBe('rcox');
      expect(authHelper.page).toBe(mockPage);
    });

    it('should use environment dev user if provided', () => {
      process.env.VITE_DEV_USER = 'testuser';
      const helper = new AuthHelper(mockPage);
      expect(helper.devUser).toBe('testuser');
      
      // Cleanup
      delete process.env.VITE_DEV_USER;
    });
  });

  describe('setupDevAuth', () => {
    it('should set authentication headers', async () => {
      await authHelper.setupDevAuth();
      
      expect(mockPage.setExtraHTTPHeaders).toHaveBeenCalledWith({
        'x-dev-user': 'rcox'
      });
    });
  });

  describe('navigateWithAuth', () => {
    it('should setup auth and navigate to URL', async () => {
      await authHelper.navigateWithAuth('/dashboard');
      
      expect(mockPage.setExtraHTTPHeaders).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('makeAuthenticatedRequest', () => {
    it('should make request with authentication headers', async () => {
      const mockResponse = createMockResponse(200, { username: 'rcox' });
      mockPage.request.fetch.mockResolvedValue(mockResponse);

      const response = await authHelper.makeAuthenticatedRequest('/api/test');

      expect(mockPage.request.fetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'x-dev-user': 'rcox',
          'Content-Type': 'application/json'
        }
      });
    });

    it('should merge custom headers with auth headers', async () => {
      const mockResponse = createMockResponse(200);
      mockPage.request.fetch.mockResolvedValue(mockResponse);

      await authHelper.makeAuthenticatedRequest('/api/test', {
        headers: {
          'Custom-Header': 'value'
        }
      });

      expect(mockPage.request.fetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'x-dev-user': 'rcox',
          'Content-Type': 'application/json',
          'Custom-Header': 'value'
        }
      });
    });
  });

  describe('verifyAuthentication', () => {
    it('should return authentication success', async () => {
      const mockResponse = createMockResponse(200, { 
        username: 'rcox', 
        is_admin: true 
      });
      mockPage.request.fetch.mockResolvedValue(mockResponse);

      const result = await authHelper.verifyAuthentication();

      expect(result).toEqual({
        isAuthenticated: true,
        user: { username: 'rcox', is_admin: true },
        status: 200
      });
    });

    it('should return authentication failure', async () => {
      const mockResponse = createMockResponse(401);
      mockPage.request.fetch.mockResolvedValue(mockResponse);

      const result = await authHelper.verifyAuthentication();

      expect(result).toEqual({
        isAuthenticated: false,
        user: null,
        status: 401
      });
    });
  });

  describe('waitForAuthentication', () => {
    it('should resolve when authentication succeeds', async () => {
      const mockResponse = createMockResponse(200, { username: 'rcox' });
      mockPage.request.fetch.mockResolvedValue(mockResponse);

      const result = await authHelper.waitForAuthentication(1000);

      expect(result.isAuthenticated).toBe(true);
      expect(mockPage.waitForTimeout).toHaveBeenCalled();
    });

    it('should timeout when authentication fails', async () => {
      const mockResponse = createMockResponse(401);
      mockPage.request.fetch.mockResolvedValue(mockResponse);

      await expect(authHelper.waitForAuthentication(100))
        .rejects.toThrow('Authentication failed after 100ms');
    });
  });

  describe('setupPageWithAuth', () => {
    it('should setup page with authentication and route interception', async () => {
      const mockResponse = createMockResponse(200, { username: 'rcox' });
      mockPage.request.fetch.mockResolvedValue(mockResponse);

      await authHelper.setupPageWithAuth('/dashboard');

      expect(mockPage.setExtraHTTPHeaders).toHaveBeenCalled();
      expect(mockPage.route).toHaveBeenCalledWith('/api/**', expect.any(Function));
      expect(mockPage.goto).toHaveBeenCalledWith('/dashboard');
    });

    it('should use default URL if none provided', async () => {
      const mockResponse = createMockResponse(200, { username: 'rcox' });
      mockPage.request.fetch.mockResolvedValue(mockResponse);

      await authHelper.setupPageWithAuth();

      expect(mockPage.goto).toHaveBeenCalledWith('/');
    });
  });
});

describe('setupAuthForTest', () => {
  it('should create AuthHelper and setup authentication', async () => {
    const mockPage = createMockPage();
    const mockResponse = createMockResponse(200, { username: 'rcox' });
    mockPage.request.fetch.mockResolvedValue(mockResponse);

    const authHelper = await setupAuthForTest(mockPage);

    expect(authHelper).toBeInstanceOf(AuthHelper);
    expect(mockPage.setExtraHTTPHeaders).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalled();
  });
});

describe('verifyAPIEndpoint', () => {
  it('should verify API endpoint accessibility', async () => {
    const mockPage = createMockPage();
    const mockResponse = createMockResponse(200, { status: 'ok' });
    mockPage.request.fetch.mockResolvedValue(mockResponse);

    const result = await verifyAPIEndpoint(mockPage, '/api/health');

    expect(result).toEqual({
      success: true,
      status: 200,
      response: { status: 'ok' }
    });
  });

  it('should handle endpoint errors', async () => {
    const mockPage = createMockPage();
    const mockResponse = createMockResponse(404, 'Not found');
    mockPage.request.fetch.mockResolvedValue(mockResponse);

    const result = await verifyAPIEndpoint(mockPage, '/api/nonexistent', 200);

    expect(result).toEqual({
      success: false,
      status: 404,
      response: 'Not found'
    });
  });

  it('should use custom expected status', async () => {
    const mockPage = createMockPage();
    const mockResponse = createMockResponse(404);
    mockPage.request.fetch.mockResolvedValue(mockResponse);

    const result = await verifyAPIEndpoint(mockPage, '/api/endpoint', 404);

    expect(result).toEqual({
      success: true,
      status: 404,
      response: 'null'
    });
  });
});

describe('AuthHelper Integration', () => {
  let mockPage;
  let authHelper;

  beforeEach(() => {
    mockPage = createMockPage();
    authHelper = new AuthHelper(mockPage);
  });

  it('should handle complete authentication flow', async () => {
    // Mock successful authentication
    const mockResponse = createMockResponse(200, { 
      username: 'rcox',
      is_admin: true,
      is_authenticated: true 
    });
    mockPage.request.fetch.mockResolvedValue(mockResponse);

    // Setup authentication
    await authHelper.setupDevAuth();
    
    // Navigate with auth
    await authHelper.navigateWithAuth('/dashboard');
    
    // Verify authentication
    const authResult = await authHelper.verifyAuthentication();
    
    expect(authResult.isAuthenticated).toBe(true);
    expect(authResult.user.username).toBe('rcox');
    expect(authResult.user.is_admin).toBe(true);
  });

  it('should handle authentication failure gracefully', async () => {
    // Mock authentication failure
    const mockResponse = createMockResponse(401);
    mockPage.request.fetch.mockResolvedValue(mockResponse);

    const authResult = await authHelper.verifyAuthentication();

    expect(authResult.isAuthenticated).toBe(false);
    expect(authResult.user).toBeNull();
    expect(authResult.status).toBe(401);
  });
});