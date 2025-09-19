# AKS Implementation Plan - Azure AD Authentication

## Overview
This document outlines the detailed implementation plan for deploying the Credit Card Processor application to Azure Kubernetes Service (AKS) with Azure AD (Microsoft Entra ID) authentication.

## Phase 1: Azure AD Setup & Configuration

### 1.1 App Registration
```javascript
// Azure Portal Configuration
{
  "displayName": "Credit Card Processor",
  "signInAudience": "AzureADMyOrg",
  "redirectUris": [
    "http://localhost:3000/auth/callback",
    "https://your-aks-domain.com/auth/callback"
  ],
  "requiredResourceAccess": [
    {
      "resourceAppId": "00000003-0000-0000-c000-000000000000", // Microsoft Graph
      "resourceAccess": [
        {
          "id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d", // User.Read
          "type": "Scope"
        },
        {
          "id": "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0", // email
          "type": "Scope"
        },
        {
          "id": "37f7f235-527c-4136-accd-4a02d197296e", // openid
          "type": "Scope"
        },
        {
          "id": "7427e0e9-2fba-42fe-b0c0-848c9e6a8182", // profile
          "type": "Scope"
        }
      ]
    }
  ]
}
```

### 1.2 Secrets & Certificates
```bash
# Generate client secret
az ad app credential reset --id <app-id> --years 2

# Store in AKS secrets
kubectl create secret generic azuread-auth \
  --from-literal=client-id=<client-id> \
  --from-literal=client-secret=<client-secret> \
  --from-literal=tenant-id=<tenant-id>
```

## Phase 2: Frontend Integration

### 2.1 Install MSAL Library
```bash
npm install @azure/msal-browser @azure/msal-react
```

### 2.2 Authentication Service Implementation
```javascript
// frontend/src/services/AuthenticationService.js
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';

class AuthenticationService {
  constructor() {
    this.msalConfig = {
      auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
        redirectUri: window.location.origin + '/auth/callback',
        postLogoutRedirectUri: window.location.origin
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: true
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (!containsPii) {
              console.log(`[MSAL] ${message}`);
            }
          }
        }
      }
    };

    this.msalInstance = new PublicClientApplication(this.msalConfig);
    this.tokenRequest = {
      scopes: ["User.Read", "email", "openid", "profile"],
      forceRefresh: false
    };
  }

  async initialize() {
    await this.msalInstance.initialize();
    await this.msalInstance.handleRedirectPromise();
  }

  async login() {
    try {
      const loginResponse = await this.msalInstance.loginPopup(this.tokenRequest);
      return this.processAuthResponse(loginResponse);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async getToken() {
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      throw new Error('No authenticated account found');
    }

    const request = {
      ...this.tokenRequest,
      account: accounts[0]
    };

    try {
      const response = await this.msalInstance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        return this.msalInstance.acquireTokenPopup(request)
          .then(response => response.accessToken);
      }
      throw error;
    }
  }

  processAuthResponse(response) {
    return {
      account: response.account,
      accessToken: response.accessToken,
      idToken: response.idToken,
      expiresOn: response.expiresOn,
      username: response.account.username,
      name: response.account.name,
      email: response.account.username
    };
  }

  async logout() {
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      await this.msalInstance.logoutPopup({
        account: accounts[0]
      });
    }
  }

  isAuthenticated() {
    return this.msalInstance.getAllAccounts().length > 0;
  }

  getCurrentUser() {
    const accounts = this.msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }
}

export default new AuthenticationService();
```

### 2.3 API Integration Hook
```javascript
// frontend/src/composables/useAzureAuth.js
import { ref, computed, onMounted } from 'vue';
import AuthenticationService from '@/services/AuthenticationService';

export function useAzureAuth() {
  const isAuthenticated = ref(false);
  const user = ref(null);
  const loading = ref(true);
  const error = ref(null);

  const initAuth = async () => {
    try {
      loading.value = true;
      await AuthenticationService.initialize();
      isAuthenticated.value = AuthenticationService.isAuthenticated();

      if (isAuthenticated.value) {
        user.value = AuthenticationService.getCurrentUser();
      }
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const login = async () => {
    try {
      loading.value = true;
      const response = await AuthenticationService.login();
      isAuthenticated.value = true;
      user.value = response.account;
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    try {
      await AuthenticationService.logout();
      isAuthenticated.value = false;
      user.value = null;
    } catch (err) {
      error.value = err.message;
    }
  };

  const getAuthHeaders = async () => {
    try {
      const token = await AuthenticationService.getToken();
      return {
        'Authorization': `Bearer ${token}`
      };
    } catch (err) {
      console.error('Failed to get auth token:', err);
      return {};
    }
  };

  onMounted(() => {
    initAuth();
  });

  return {
    isAuthenticated: computed(() => isAuthenticated.value),
    user: computed(() => user.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    login,
    logout,
    getAuthHeaders,
    initAuth
  };
}
```

### 2.4 Updated API Composable
```javascript
// frontend/src/composables/useApi.js
import { useAzureAuth } from './useAzureAuth';

const createApiClient = () => {
  const { getAuthHeaders } = useAzureAuth();

  const makeRequest = async (url, options = {}) => {
    const authHeaders = await getAuthHeaders();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers
      }
    };

    const response = await fetch(url, config);

    if (response.status === 401) {
      // Token expired, trigger re-authentication
      await AuthenticationService.login();
      // Retry request with new token
      const newAuthHeaders = await getAuthHeaders();
      config.headers = { ...config.headers, ...newAuthHeaders };
      return fetch(url, config);
    }

    return response;
  };

  return {
    get: (url) => makeRequest(url, { method: 'GET' }),
    post: (url, data) => makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    put: (url, data) => makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (url) => makeRequest(url, { method: 'DELETE' })
  };
};
```

## Phase 3: Backend Integration

### 3.1 Azure AD Token Validation
```python
# backend/app/auth/azure_ad.py
import jwt
import requests
from typing import Optional, Dict, Any
from functools import lru_cache
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class TokenValidator:
    def __init__(self, tenant_id: str, client_id: str):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.issuer = f"https://login.microsoftonline.com/{tenant_id}/v2.0"
        self.jwks_uri = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
        self._keys_cache = None
        self._keys_cache_time = None
        self.cache_duration = timedelta(hours=24)

    @lru_cache(maxsize=32)
    def get_signing_keys(self) -> Dict[str, Any]:
        """Fetch and cache Azure AD signing keys"""
        now = datetime.utcnow()

        if self._keys_cache and self._keys_cache_time:
            if now - self._keys_cache_time < self.cache_duration:
                return self._keys_cache

        try:
            response = requests.get(self.jwks_uri, timeout=10)
            response.raise_for_status()
            keys = response.json()

            self._keys_cache = keys
            self._keys_cache_time = now

            return keys
        except Exception as e:
            logger.error(f"Failed to fetch signing keys: {e}")
            if self._keys_cache:
                return self._keys_cache
            raise

    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate Azure AD JWT token

        Args:
            token: JWT token string

        Returns:
            Decoded token claims if valid, None otherwise
        """
        try:
            # Get token header to find key ID
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get('kid')

            if not kid:
                logger.error("Token missing key ID")
                return None

            # Get signing keys
            keys = self.get_signing_keys()
            signing_key = None

            for key in keys.get('keys', []):
                if key['kid'] == kid:
                    signing_key = key
                    break

            if not signing_key:
                logger.error(f"Key {kid} not found in Azure AD keys")
                return None

            # Construct public key
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(
                json.dumps(signing_key)
            )

            # Validate token
            decoded = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                audience=self.client_id,
                issuer=self.issuer,
                options={
                    'verify_signature': True,
                    'verify_aud': True,
                    'verify_iss': True,
                    'verify_exp': True,
                    'require': ['exp', 'iat', 'nbf', 'iss', 'aud']
                }
            )

            # Additional validation
            if 'preferred_username' not in decoded and 'upn' not in decoded:
                logger.error("Token missing username claim")
                return None

            return decoded

        except jwt.ExpiredSignatureError:
            logger.error("Token has expired")
        except jwt.InvalidAudienceError:
            logger.error("Invalid token audience")
        except jwt.InvalidIssuerError:
            logger.error("Invalid token issuer")
        except Exception as e:
            logger.error(f"Token validation failed: {e}")

        return None

    def extract_user_info(self, claims: Dict[str, Any]) -> Dict[str, Any]:
        """Extract user information from token claims"""
        return {
            'username': claims.get('preferred_username') or claims.get('upn'),
            'email': claims.get('email') or claims.get('preferred_username'),
            'name': claims.get('name'),
            'given_name': claims.get('given_name'),
            'family_name': claims.get('family_name'),
            'object_id': claims.get('oid'),
            'tenant_id': claims.get('tid'),
            'roles': claims.get('roles', []),
            'groups': claims.get('groups', [])
        }
```

### 3.2 FastAPI Middleware Integration
```python
# backend/app/middleware/azure_auth.py
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.azure_ad import TokenValidator
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class AzureADAuth(HTTPBearer):
    def __init__(self):
        super().__init__(auto_error=False)
        self.validator = TokenValidator(
            tenant_id=settings.azure_tenant_id,
            client_id=settings.azure_client_id
        )

    async def __call__(self, request: Request) -> Optional[Dict[str, Any]]:
        # Try to get credentials
        credentials = await super().__call__(request)

        if not credentials:
            # Check for development mode bypass
            if settings.enable_dev_auth:
                dev_user = request.headers.get('x-dev-user')
                if dev_user:
                    logger.info(f"Dev auth bypass for user: {dev_user}")
                    return {
                        'username': dev_user,
                        'email': f"{dev_user}@dev.local",
                        'name': dev_user,
                        'roles': ['admin'] if settings.is_admin_user(dev_user) else []
                    }

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )

        # Validate Azure AD token
        token = credentials.credentials
        claims = self.validator.validate_token(token)

        if not claims:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )

        # Extract and return user info
        user_info = self.validator.extract_user_info(claims)

        # Check admin status
        if settings.is_admin_user(user_info['username']):
            user_info['roles'].append('admin')

        return user_info

# Dependency for protected routes
azure_auth = AzureADAuth()

async def get_current_user(
    user_info: Dict[str, Any] = Depends(azure_auth)
) -> Dict[str, Any]:
    """Get current authenticated user"""
    return user_info

async def require_admin(
    user_info: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Require admin role"""
    if 'admin' not in user_info.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user_info
```

### 3.3 Updated API Routes
```python
# backend/app/routes/auth.py
from fastapi import APIRouter, Depends
from app.middleware.azure_auth import get_current_user, require_admin

router = APIRouter()

@router.get("/api/auth/me")
async def get_me(user: Dict = Depends(get_current_user)):
    """Get current user information"""
    return {
        "username": user['username'],
        "email": user['email'],
        "name": user['name'],
        "roles": user.get('roles', []),
        "is_admin": 'admin' in user.get('roles', [])
    }

@router.get("/api/auth/validate")
async def validate_session(user: Dict = Depends(get_current_user)):
    """Validate current session"""
    return {"valid": True, "username": user['username']}

@router.get("/api/admin/users")
async def get_admin_users(user: Dict = Depends(require_admin)):
    """Get list of admin users (admin only)"""
    return {"admins": settings.admin_users}
```

## Phase 4: Configuration & Environment

### 4.1 Backend Configuration Updates
```python
# backend/app/config.py additions
class Settings(BaseSettings):
    # ... existing settings ...

    # Azure AD Configuration
    azure_tenant_id: Optional[str] = Field(
        default=None,
        alias="AZURE_TENANT_ID",
        description="Azure AD Tenant ID"
    )
    azure_client_id: Optional[str] = Field(
        default=None,
        alias="AZURE_CLIENT_ID",
        description="Azure AD App Client ID"
    )
    azure_client_secret: Optional[str] = Field(
        default=None,
        alias="AZURE_CLIENT_SECRET",
        description="Azure AD App Client Secret"
    )

    # Feature flags for migration
    enable_azure_ad_auth: bool = Field(
        default=False,
        alias="ENABLE_AZURE_AD_AUTH",
        description="Enable Azure AD authentication"
    )
    enable_dev_auth: bool = Field(
        default=False,
        alias="ENABLE_DEV_AUTH",
        description="Enable development authentication bypass"
    )
    enable_legacy_auth: bool = Field(
        default=True,
        alias="ENABLE_LEGACY_AUTH",
        description="Enable legacy Windows authentication"
    )

    @property
    def is_azure_ad_configured(self) -> bool:
        """Check if Azure AD is properly configured"""
        return all([
            self.enable_azure_ad_auth,
            self.azure_tenant_id,
            self.azure_client_id
        ])
```

### 4.2 Environment Files
```bash
# .env.aks
# Azure AD Configuration
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
ENABLE_AZURE_AD_AUTH=true
ENABLE_DEV_AUTH=false
ENABLE_LEGACY_AUTH=false

# Frontend Azure AD Config
VITE_AZURE_TENANT_ID=your-tenant-id
VITE_AZURE_CLIENT_ID=your-client-id
VITE_AUTH_ENABLED=true

# Admin users (Azure AD UPNs)
ADMIN_USERS=user1@company.com,user2@company.com

# Other production settings
ENVIRONMENT=production
LOG_LEVEL=INFO
SESSION_SECRET_KEY=${SESSION_SECRET_KEY}
```

## Phase 5: AKS Deployment Configuration

### 5.1 Kubernetes Namespace & Secrets
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: credit-card-processor

---
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: credit-card-processor
type: Opaque
stringData:
  AZURE_TENANT_ID: "your-tenant-id"
  AZURE_CLIENT_ID: "your-client-id"
  AZURE_CLIENT_SECRET: "your-client-secret"
  SESSION_SECRET_KEY: "generated-secret-key"
  DATABASE_URL: "postgresql://user:pass@postgres:5432/creditcard"
```

### 5.2 Backend Deployment
```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: credit-card-processor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: credit-card-processor-sa
      containers:
      - name: backend
        image: creditcardprocessor.azurecr.io/backend:latest
        ports:
        - containerPort: 8001
        env:
        - name: ENVIRONMENT
          value: "production"
        - name: ENABLE_AZURE_AD_AUTH
          value: "true"
        - name: ENABLE_DEV_AUTH
          value: "false"
        - name: ENABLE_LEGACY_AUTH
          value: "false"
        envFrom:
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 5
          periodSeconds: 10
        volumeMounts:
        - name: data
          mountPath: /app/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: data-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: credit-card-processor
spec:
  selector:
    app: backend
  ports:
    - protocol: TCP
      port: 8001
      targetPort: 8001
  type: ClusterIP
```

### 5.3 Frontend Deployment
```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: credit-card-processor
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: creditcardprocessor.azurecr.io/frontend:latest
        ports:
        - containerPort: 80
        env:
        - name: VITE_AZURE_TENANT_ID
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: AZURE_TENANT_ID
        - name: VITE_AZURE_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: AZURE_CLIENT_ID
        - name: VITE_AUTH_ENABLED
          value: "true"
        - name: VITE_API_BASE_URL
          value: "http://backend-service:8001"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: credit-card-processor
spec:
  selector:
    app: frontend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP
```

### 5.4 Ingress Configuration
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: credit-card-ingress
  namespace: credit-card-processor
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/client-max-body-size: "300m"
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - creditcard.yourdomain.com
    secretName: credit-card-tls
  rules:
  - host: creditcard.yourdomain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 8001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

### 5.5 Workload Identity Configuration
```yaml
# k8s/workload-identity.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: credit-card-processor-sa
  namespace: credit-card-processor
  annotations:
    azure.workload.identity/client-id: "your-managed-identity-client-id"

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: workload-identity-config
  namespace: credit-card-processor
data:
  AZURE_CLIENT_ID: "your-managed-identity-client-id"
  AZURE_TENANT_ID: "your-tenant-id"
  AZURE_FEDERATED_TOKEN_FILE: "/var/run/secrets/azure/tokens/azure-identity-token"
  AZURE_AUTHORITY_HOST: "https://login.microsoftonline.com/"
```

## Phase 6: Testing & Validation

### 6.1 Token Validation Tests
```python
# backend/tests/test_azure_auth.py
import pytest
from unittest.mock import Mock, patch
from app.auth.azure_ad import TokenValidator
import jwt
from datetime import datetime, timedelta

class TestTokenValidator:
    @pytest.fixture
    def validator(self):
        return TokenValidator(
            tenant_id="test-tenant",
            client_id="test-client"
        )

    def test_validate_valid_token(self, validator):
        """Test validation of valid Azure AD token"""
        # Create mock token
        mock_claims = {
            "aud": "test-client",
            "iss": "https://login.microsoftonline.com/test-tenant/v2.0",
            "exp": (datetime.utcnow() + timedelta(hours=1)).timestamp(),
            "iat": datetime.utcnow().timestamp(),
            "nbf": datetime.utcnow().timestamp(),
            "preferred_username": "test@company.com",
            "name": "Test User",
            "oid": "user-object-id",
            "tid": "test-tenant"
        }

        with patch.object(validator, 'get_signing_keys'):
            with patch.object(jwt, 'decode', return_value=mock_claims):
                result = validator.validate_token("mock-token")
                assert result is not None
                assert result['preferred_username'] == 'test@company.com'

    def test_extract_user_info(self, validator):
        """Test user info extraction from claims"""
        claims = {
            "preferred_username": "test@company.com",
            "name": "Test User",
            "given_name": "Test",
            "family_name": "User",
            "oid": "object-id",
            "tid": "tenant-id",
            "roles": ["user", "admin"]
        }

        user_info = validator.extract_user_info(claims)
        assert user_info['username'] == 'test@company.com'
        assert user_info['name'] == 'Test User'
        assert 'admin' in user_info['roles']
```

### 6.2 Integration Tests
```javascript
// frontend/tests/auth.integration.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { useAzureAuth } from '@/composables/useAzureAuth';
import AuthenticationService from '@/services/AuthenticationService';

describe('Azure AD Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize authentication on mount', async () => {
    const initSpy = vi.spyOn(AuthenticationService, 'initialize');

    const wrapper = mount({
      template: '<div></div>',
      setup() {
        return useAzureAuth();
      }
    });

    await wrapper.vm.$nextTick();
    expect(initSpy).toHaveBeenCalled();
  });

  it('should handle login flow', async () => {
    const mockResponse = {
      account: { username: 'test@company.com' },
      accessToken: 'mock-token',
      idToken: 'mock-id-token'
    };

    vi.spyOn(AuthenticationService, 'login').mockResolvedValue(mockResponse);

    const { login } = useAzureAuth();
    const result = await login();

    expect(result.account.username).toBe('test@company.com');
  });

  it('should provide auth headers with token', async () => {
    vi.spyOn(AuthenticationService, 'getToken').mockResolvedValue('mock-token');

    const { getAuthHeaders } = useAzureAuth();
    const headers = await getAuthHeaders();

    expect(headers.Authorization).toBe('Bearer mock-token');
  });
});
```

### 6.3 End-to-End Tests
```javascript
// playwright-tests/azure-auth.spec.js
import { test, expect } from '@playwright/test';

test.describe('Azure AD Authentication Flow', () => {
  test('should redirect to Azure AD login', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Should show login prompt
    await expect(page.locator('text=Sign in with Microsoft')).toBeVisible();

    // Click login button
    await page.click('button:has-text("Sign in with Microsoft")');

    // Should redirect to Microsoft login
    await page.waitForURL(/login\.microsoftonline\.com/);
    expect(page.url()).toContain('login.microsoftonline.com');
  });

  test('should handle token refresh', async ({ page }) => {
    // Mock expired token scenario
    await page.route('**/api/sessions', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Token expired' })
      });
    });

    await page.goto('http://localhost:3000');

    // Should automatically attempt token refresh
    await page.waitForRequest(req =>
      req.url().includes('login.microsoftonline.com') &&
      req.url().includes('token')
    );
  });
});
```

## Phase 7: Migration & Rollback Strategy

### 7.1 Feature Flag Configuration
```python
# backend/app/auth/auth_manager.py
from app.auth.azure_ad import TokenValidator
from app.auth.windows import WindowsAuthExtractor
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class AuthManager:
    """Manages authentication strategy based on configuration"""

    def __init__(self):
        self.azure_validator = None
        self.windows_extractor = None

        if settings.enable_azure_ad_auth and settings.is_azure_ad_configured:
            self.azure_validator = TokenValidator(
                tenant_id=settings.azure_tenant_id,
                client_id=settings.azure_client_id
            )
            logger.info("Azure AD authentication enabled")

        if settings.enable_legacy_auth:
            self.windows_extractor = WindowsAuthExtractor()
            logger.info("Windows authentication enabled")

    async def authenticate(self, request) -> Optional[Dict[str, Any]]:
        """Authenticate request using configured strategies"""

        # Try Azure AD first if enabled
        if self.azure_validator:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                claims = self.azure_validator.validate_token(token)
                if claims:
                    return self.azure_validator.extract_user_info(claims)

        # Fallback to Windows auth if enabled
        if self.windows_extractor:
            user = self.windows_extractor.extract_user(request)
            if user:
                return {
                    'username': user,
                    'email': f"{user}@company.com",
                    'name': user,
                    'auth_method': 'windows'
                }

        # Development mode bypass
        if settings.enable_dev_auth:
            dev_user = request.headers.get('x-dev-user')
            if dev_user:
                logger.warning(f"Using development auth for: {dev_user}")
                return {
                    'username': dev_user,
                    'email': f"{dev_user}@dev.local",
                    'name': dev_user,
                    'auth_method': 'dev'
                }

        return None
```

### 7.2 Rollback Procedure
```bash
#!/bin/bash
# rollback-auth.sh

echo "Rolling back to Windows Authentication..."

# Update ConfigMap to disable Azure AD
kubectl patch configmap app-config -n credit-card-processor --type merge -p '
{
  "data": {
    "ENABLE_AZURE_AD_AUTH": "false",
    "ENABLE_LEGACY_AUTH": "true"
  }
}'

# Restart deployments to pick up changes
kubectl rollout restart deployment/backend -n credit-card-processor
kubectl rollout restart deployment/frontend -n credit-card-processor

# Wait for rollout to complete
kubectl rollout status deployment/backend -n credit-card-processor
kubectl rollout status deployment/frontend -n credit-card-processor

echo "Rollback complete. Windows Authentication re-enabled."
```

### 7.3 Health Check Endpoints
```python
# backend/app/routes/health.py
from fastapi import APIRouter
from app.config import settings
from app.auth.auth_manager import AuthManager

router = APIRouter()

@router.get("/health")
async def health_check():
    """Basic health check"""
    return {"status": "healthy"}

@router.get("/health/auth")
async def auth_health():
    """Authentication subsystem health check"""
    auth_status = {
        "azure_ad_enabled": settings.enable_azure_ad_auth,
        "azure_ad_configured": settings.is_azure_ad_configured,
        "windows_auth_enabled": settings.enable_legacy_auth,
        "dev_auth_enabled": settings.enable_dev_auth,
        "auth_methods": []
    }

    if settings.enable_azure_ad_auth and settings.is_azure_ad_configured:
        auth_status["auth_methods"].append("azure_ad")

    if settings.enable_legacy_auth:
        auth_status["auth_methods"].append("windows")

    if settings.enable_dev_auth:
        auth_status["auth_methods"].append("development")

    return auth_status
```

## Deployment Commands

### Initial Deployment
```bash
# 1. Create namespace and secrets
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml

# 2. Deploy database
kubectl apply -f k8s/postgres-deployment.yaml

# 3. Deploy backend
kubectl apply -f k8s/backend-deployment.yaml

# 4. Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml

# 5. Configure ingress
kubectl apply -f k8s/ingress.yaml

# 6. Setup workload identity
kubectl apply -f k8s/workload-identity.yaml
```

### Monitoring
```bash
# Check deployment status
kubectl get all -n credit-card-processor

# View logs
kubectl logs -n credit-card-processor -l app=backend --tail=100

# Check auth health
curl https://creditcard.yourdomain.com/health/auth
```

### Troubleshooting
```bash
# Debug authentication issues
kubectl exec -it deployment/backend -n credit-card-processor -- /bin/bash

# Check environment variables
kubectl exec deployment/backend -n credit-card-processor -- env | grep AZURE

# Test token validation
curl -H "Authorization: Bearer <token>" https://creditcard.yourdomain.com/api/auth/me
```

## Security Considerations

1. **Token Storage**: Tokens stored in browser localStorage with HttpOnly cookies as backup
2. **Token Refresh**: Automatic token refresh before expiration
3. **CORS Configuration**: Strict CORS policy limiting to specific origins
4. **Network Policies**: Kubernetes NetworkPolicies restricting pod communication
5. **Secret Management**: Using Azure Key Vault for sensitive configuration
6. **Audit Logging**: All authentication events logged for compliance
7. **Rate Limiting**: Protection against brute force attacks
8. **Session Management**: Secure session handling with timeout policies

## Performance Optimizations

1. **Token Caching**: JWT validation results cached for 5 minutes
2. **Key Caching**: Azure AD signing keys cached for 24 hours
3. **Connection Pooling**: Reuse HTTP connections for Azure AD calls
4. **Lazy Loading**: Authentication components loaded on demand
5. **CDN Integration**: Static assets served via Azure CDN
6. **Database Connection Pooling**: Efficient database connection management

## Compliance & Governance

1. **Data Residency**: Ensure data stays within required geographic boundaries
2. **Audit Trail**: Complete authentication audit trail for compliance
3. **Access Reviews**: Regular review of admin user assignments
4. **Token Lifetime**: Configurable token lifetimes per security policy
5. **MFA Enforcement**: Multi-factor authentication for admin users
6. **Conditional Access**: Azure AD Conditional Access policies applied