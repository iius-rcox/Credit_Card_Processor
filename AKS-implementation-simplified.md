# Simplified AKS Implementation Plan

## Overview
Streamlined deployment of Credit Card Processor to Azure Kubernetes Service with Azure AD authentication, focusing on security and simplicity.

## Prerequisites
- Azure subscription with AKS cluster
- Azure Container Registry (ACR)
- Azure Key Vault
- Azure AD tenant with admin access
- kubectl and Azure CLI installed

## Phase 1: Core Authentication & Deployment

### 1.1 Azure AD App Registration

```bash
# Create app registration
az ad app create --display-name "Credit Card Processor" \
  --sign-in-audience AzureADMyOrg \
  --enable-id-token-issuance \
  --enable-access-token-issuance

# Get app details
APP_ID=$(az ad app list --display-name "Credit Card Processor" --query "[0].appId" -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

# Create client secret
CLIENT_SECRET=$(az ad app credential reset --id $APP_ID --years 2 --query password -o tsv)

# Configure redirect URIs
az ad app update --id $APP_ID --web-redirect-uris \
  "http://localhost:3000/auth/callback" \
  "https://creditcard.yourdomain.com/auth/callback"
```

### 1.2 Azure Key Vault Setup

```bash
# Create Key Vault
az keyvault create --name ccprocessor-kv \
  --resource-group your-rg \
  --location eastus

# Store secrets in Key Vault
az keyvault secret set --vault-name ccprocessor-kv \
  --name azure-client-id --value $APP_ID

az keyvault secret set --vault-name ccprocessor-kv \
  --name azure-client-secret --value $CLIENT_SECRET

az keyvault secret set --vault-name ccprocessor-kv \
  --name azure-tenant-id --value $TENANT_ID

az keyvault secret set --vault-name ccprocessor-kv \
  --name session-secret-key --value $(openssl rand -base64 32)

# Enable Key Vault CSI driver in AKS
az aks enable-addons --addons azure-keyvault-secrets-provider \
  --name your-aks-cluster \
  --resource-group your-rg
```

### 1.3 Frontend Authentication (Vue.js)

```bash
# Install MSAL for Vue (browser only, no React)
npm install @azure/msal-browser
```

```javascript
// frontend/src/services/auth.js
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';

class AuthService {
  constructor() {
    this.msalConfig = {
      auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
        redirectUri: window.location.origin + '/auth/callback'
      },
      cache: {
        cacheLocation: 'sessionStorage', // Secure: cleared on tab close
        storeAuthStateInCookie: false    // No cookies needed for SPA
      }
    };

    this.msalInstance = new PublicClientApplication(this.msalConfig);
    this.loginRequest = {
      scopes: ["User.Read", "openid", "profile", "email"]
    };
  }

  async initialize() {
    await this.msalInstance.initialize();

    // Handle redirect response if present
    const response = await this.msalInstance.handleRedirectPromise();
    if (response) {
      return this.handleResponse(response);
    }

    // Check for existing session
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalInstance.setActiveAccount(accounts[0]);
      return accounts[0];
    }

    return null;
  }

  async login() {
    // Use redirect for better UX (no popup blockers)
    return this.msalInstance.loginRedirect(this.loginRequest);
  }

  async getToken() {
    const account = this.msalInstance.getActiveAccount();
    if (!account) throw new Error('No active account');

    try {
      // Try silent token acquisition first
      const response = await this.msalInstance.acquireTokenSilent({
        ...this.loginRequest,
        account
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Fall back to interactive
        return this.msalInstance.acquireTokenRedirect(this.loginRequest);
      }
      throw error;
    }
  }

  handleResponse(response) {
    this.msalInstance.setActiveAccount(response.account);
    return response.account;
  }

  logout() {
    return this.msalInstance.logoutRedirect();
  }

  getUser() {
    return this.msalInstance.getActiveAccount();
  }
}

export default new AuthService();
```

```javascript
// frontend/src/composables/useAuth.js
import { ref, onMounted, computed } from 'vue';
import authService from '@/services/auth';

export function useAuth() {
  const user = ref(null);
  const loading = ref(true);

  onMounted(async () => {
    try {
      const account = await authService.initialize();
      user.value = account;
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      loading.value = false;
    }
  });

  const login = () => authService.login();
  const logout = () => authService.logout();

  const getAuthHeaders = async () => {
    try {
      const token = await authService.getToken();
      return { Authorization: `Bearer ${token}` };
    } catch (error) {
      console.error('Failed to get token:', error);
      return {};
    }
  };

  return {
    user: computed(() => user.value),
    loading: computed(() => loading.value),
    isAuthenticated: computed(() => !!user.value),
    login,
    logout,
    getAuthHeaders
  };
}
```

### 1.4 Backend Token Validation

```python
# backend/requirements.txt additions
PyJWT==2.8.0
cryptography==41.0.7
requests==2.31.0
```

```python
# backend/app/auth/azure_ad.py
import jwt
import requests
from typing import Optional, Dict
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()

class AzureADValidator:
    def __init__(self):
        self.tenant_id = settings.azure_tenant_id
        self.client_id = settings.azure_client_id
        self.issuer = f"https://login.microsoftonline.com/{self.tenant_id}/v2.0"
        self.jwks_uri = f"{self.issuer}/.well-known/openid-configuration"
        self._keys = None

    def get_signing_keys(self):
        """Cache and return signing keys"""
        if not self._keys:
            openid_config = requests.get(self.jwks_uri).json()
            jwks_uri = openid_config["jwks_uri"]
            self._keys = requests.get(jwks_uri).json()
        return self._keys

    def validate_token(self, token: str) -> Dict:
        """Validate Azure AD token"""
        try:
            # Get signing keys
            keys = self.get_signing_keys()

            # Decode header to get key ID
            unverified_header = jwt.get_unverified_header(token)
            rsa_key = None

            for key in keys["keys"]:
                if key["kid"] == unverified_header["kid"]:
                    rsa_key = key
                    break

            if not rsa_key:
                raise HTTPException(status_code=401, detail="Unable to find signing key")

            # Construct public key and validate
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(rsa_key)

            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=self.issuer
            )

            return {
                "username": payload.get("preferred_username", payload.get("unique_name")),
                "name": payload.get("name"),
                "email": payload.get("email", payload.get("preferred_username")),
                "sub": payload.get("sub")
            }

        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

validator = AzureADValidator()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Dependency to get current user from token"""
    return validator.validate_token(credentials.credentials)
```

```python
# backend/app/main.py - Add CSRF protection
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.config import settings

app = FastAPI()

# Session middleware for CSRF
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret_key,
    same_site="strict",
    https_only=settings.environment == "production"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Protected route example
from app.auth.azure_ad import get_current_user

@app.get("/api/me")
async def get_me(user=Depends(get_current_user)):
    return user
```

### 1.5 Kubernetes Deployment

```yaml
# k8s/00-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: credit-card-processor
```

```yaml
# k8s/01-keyvault-secrets.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-keyvault
  namespace: credit-card-processor
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "<managed-identity-client-id>"
    keyvaultName: "ccprocessor-kv"
    cloudName: "AzurePublicCloud"
    objects: |
      array:
        - |
          objectName: azure-client-id
          objectType: secret
        - |
          objectName: azure-client-secret
          objectType: secret
        - |
          objectName: azure-tenant-id
          objectType: secret
        - |
          objectName: session-secret-key
          objectType: secret
    tenantId: "<your-tenant-id>"
  secretObjects:
  - secretName: app-secrets
    type: Opaque
    data:
    - objectName: azure-client-id
      key: AZURE_CLIENT_ID
    - objectName: azure-client-secret
      key: AZURE_CLIENT_SECRET
    - objectName: azure-tenant-id
      key: AZURE_TENANT_ID
    - objectName: session-secret-key
      key: SESSION_SECRET_KEY
```

```yaml
# k8s/02-postgres.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: credit-card-processor
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: managed-premium

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: credit-card-processor
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: creditcard
        - name: POSTGRES_USER
          value: ccuser
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DB_PASSWORD
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: credit-card-processor
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

```yaml
# k8s/03-backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: credit-card-processor
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: creditcardprocessor.azurecr.io/backend:latest
        ports:
        - containerPort: 8001
        env:
        - name: ENVIRONMENT
          value: production
        - name: DATABASE_URL
          value: postgresql://ccuser:$(DB_PASSWORD)@postgres:5432/creditcard
        envFrom:
        - secretRef:
            name: app-secrets
        volumeMounts:
        - name: secrets-store
          mountPath: "/mnt/secrets"
          readOnly: true
        - name: data
          mountPath: /app/data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
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
          initialDelaySeconds: 10
          periodSeconds: 10
      volumes:
      - name: secrets-store
        csi:
          driver: secrets-store.csi.k8s.io
          readOnly: true
          volumeAttributes:
            secretProviderClass: azure-keyvault
      - name: data
        emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: credit-card-processor
spec:
  selector:
    app: backend
  ports:
  - port: 8001
    targetPort: 8001

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: credit-card-processor
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

```yaml
# k8s/04-frontend.yaml
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
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "250m"

---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: credit-card-processor
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
```

```yaml
# k8s/05-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: credit-card-ingress
  namespace: credit-card-processor
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/client-max-body-size: "300m"
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
            name: backend
            port:
              number: 8001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

```yaml
# k8s/06-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: credit-card-processor
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to: # Allow external HTTPS for Azure AD
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443

---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-network-policy
  namespace: credit-card-processor
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backend
    ports:
    - protocol: TCP
      port: 5432
```

### 1.6 Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Deploying Credit Card Processor to AKS"

# Variables
RESOURCE_GROUP="your-rg"
AKS_NAME="your-aks-cluster"
ACR_NAME="creditcardprocessor"

# Login to Azure
az login

# Get AKS credentials
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_NAME

# Build and push images
echo "📦 Building and pushing Docker images..."
az acr build --registry $ACR_NAME --image backend:latest ./backend
az acr build --registry $ACR_NAME --image frontend:latest ./frontend

# Deploy to Kubernetes
echo "☸️ Deploying to Kubernetes..."
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-keyvault-secrets.yaml

# Wait for secrets to be available
sleep 10

kubectl apply -f k8s/02-postgres.yaml
kubectl wait --for=condition=ready pod -l app=postgres -n credit-card-processor --timeout=60s

kubectl apply -f k8s/03-backend.yaml
kubectl wait --for=condition=ready pod -l app=backend -n credit-card-processor --timeout=60s

kubectl apply -f k8s/04-frontend.yaml
kubectl apply -f k8s/05-ingress.yaml
kubectl apply -f k8s/06-network-policy.yaml

echo "✅ Deployment complete!"
echo "🌐 Application will be available at: https://creditcard.yourdomain.com"
```

## Phase 2: Monitoring & Operations

### 2.1 Azure Monitor Integration

```bash
# Enable Azure Monitor for AKS
az aks enable-addons -a monitoring \
  --name your-aks-cluster \
  --resource-group your-rg
```

```yaml
# k8s/monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: container-azm-ms-agentconfig
  namespace: kube-system
data:
  schema-version: v1
  config-version: ver1
  log-data-collection-settings: |-
    [log_collection_settings]
       [log_collection_settings.stdout]
          enabled = true
       [log_collection_settings.stderr]
          enabled = true
       [log_collection_settings.env_var]
          enabled = true
```

### 2.2 Database Backup

```yaml
# k8s/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: credit-card-processor
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15-alpine
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: DB_PASSWORD
            command:
            - /bin/sh
            - -c
            - |
              DATE=$(date +%Y%m%d-%H%M%S)
              pg_dump -h postgres -U ccuser creditcard | \
                az storage blob upload \
                  --account-name yourbackupstorage \
                  --container-name backups \
                  --name backup-$DATE.sql \
                  --auth-mode login
          restartPolicy: OnFailure
```

## Phase 3: Production Enhancements

### 3.1 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to AKS

on:
  push:
    branches: [main]

env:
  ACR_NAME: creditcardprocessor
  AKS_NAME: your-aks-cluster
  RESOURCE_GROUP: your-rg

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Azure Login
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Build and Push Backend
      run: |
        az acr build --registry ${{ env.ACR_NAME }} \
          --image backend:${{ github.sha }} \
          ./backend

    - name: Build and Push Frontend
      run: |
        az acr build --registry ${{ env.ACR_NAME }} \
          --image frontend:${{ github.sha }} \
          ./frontend

    - name: Get AKS Credentials
      run: |
        az aks get-credentials \
          --resource-group ${{ env.RESOURCE_GROUP }} \
          --name ${{ env.AKS_NAME }}

    - name: Deploy to AKS
      run: |
        kubectl set image deployment/backend \
          backend=${{ env.ACR_NAME }}.azurecr.io/backend:${{ github.sha }} \
          -n credit-card-processor

        kubectl set image deployment/frontend \
          frontend=${{ env.ACR_NAME }}.azurecr.io/frontend:${{ github.sha }} \
          -n credit-card-processor

        kubectl rollout status deployment/backend -n credit-card-processor
        kubectl rollout status deployment/frontend -n credit-card-processor
```

### 3.2 Alerts and Monitoring

```bash
# Create action group for alerts
az monitor action-group create \
  --name credit-card-alerts \
  --resource-group your-rg \
  --short-name ccalerts \
  --email admin admin@company.com

# Create metric alerts
az monitor metrics alert create \
  --name high-cpu-backend \
  --resource-group your-rg \
  --scopes /subscriptions/.../resourceGroups/.../providers/Microsoft.ContainerService/managedClusters/your-aks-cluster \
  --condition "avg cpu percentage > 80" \
  --action credit-card-alerts
```

## Troubleshooting

### Common Commands

```bash
# View pod logs
kubectl logs -n credit-card-processor -l app=backend --tail=100

# Execute into a pod (correct syntax)
POD_NAME=$(kubectl get pod -n credit-card-processor -l app=backend -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n credit-card-processor -it $POD_NAME -- /bin/bash

# Check secret values
kubectl get secret app-secrets -n credit-card-processor -o yaml

# View events
kubectl get events -n credit-card-processor --sort-by='.lastTimestamp'

# Check ingress status
kubectl get ingress -n credit-card-processor
```

### Health Check Endpoints

```bash
# Backend health
curl https://creditcard.yourdomain.com/health

# Authentication test
curl -H "Authorization: Bearer <token>" https://creditcard.yourdomain.com/api/me
```

## Security Notes

### Token Storage
- **Decision**: Using sessionStorage instead of localStorage
- **Rationale**: Automatically cleared when tab closes, reducing XSS exposure
- **Trade-off**: Users need to re-authenticate after closing tab
- **Mitigation**: Implement "Remember Me" with secure refresh tokens if needed

### Secret Management
- All secrets stored in Azure Key Vault
- Accessed via CSI driver with managed identity
- No secrets in code or Kubernetes manifests

### Network Security
- Network policies restrict pod-to-pod communication
- All external traffic over HTTPS
- Ingress configured with SSL/TLS only

## Performance Considerations

- Backend: 2-5 pods with autoscaling based on CPU/memory
- Frontend: 2 pods (static content, low resource usage)
- Database: Single instance (consider Azure Database for PostgreSQL for production)
- Recommended to implement caching layer (Redis) for session management

## Cost Optimization

- Use spot instances for non-critical workloads
- Implement pod disruption budgets
- Consider Azure Database for PostgreSQL instead of self-managed
- Use Azure CDN for static assets
- Enable cluster autoscaler for node management

## Next Steps

1. Configure custom domain and SSL certificate
2. Set up monitoring dashboards in Azure Monitor
3. Implement rate limiting with Azure API Management
4. Add Redis for session caching
5. Configure automated database backups to Azure Storage