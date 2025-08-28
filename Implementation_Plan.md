# Credit Card Processor – Implementation Plan

This document outlines the concrete steps and folder structure for migrating the Credit Card Processor to a modern, cloud-native architecture using the recommended technology stack (FastAPI, React + TypeScript, PostgreSQL, Celery, Redis, Azure Blob Storage, Docker, and Kubernetes on Azure).

## 1. Repository Layout

```
Credit_Card_Processor/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── reports.py
│   │   │   │   └── uploads.py
│   │   │   └── dependencies.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── celery_app.py
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── models.py
│   │   │   └── schemas.py
│   │   ├── services/
│   │   │   ├── pdf_processing.py
│   │   │   └── reporting.py
│   │   └── tasks/
│   │       └── pdf_tasks.py
│   ├── tests/
│   │   └── __init__.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   ├── components/
│   │   │   ├── FileUploader.tsx
│   │   │   ├── ProcessingStatus.tsx
│   │   │   └── ReportsTable.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   └── History.tsx
│   │   └── services/
│   │       └── api.ts
│   ├── public/
│   │   └── index.html
│   ├── Dockerfile
│   └── package.json
├── k8s/
│   ├── namespace.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── redis-deployment.yaml
│   ├── redis-service.yaml
│   ├── worker-deployment.yaml
│   └── ingress.yaml
├── deployment/
│   ├── docker-compose.dev.yml
│   ├── github-actions/
│   │   ├── build-and-push.yml
│   │   └── deploy.yml
│   └── scripts/
│       ├── build_images.sh
│       └── deploy_k8s.sh
└── Implementation_Plan.md
```

## 2. Backend Tasks (FastAPI + Celery)
1. **Project Setup**
   - Initialize FastAPI app with modular architecture (`app/main.py`).
   - Configure environment variables via `pydantic` settings (`core/config.py`).
2. **Database Layer (PostgreSQL + SQLAlchemy)**
   - Define SQLAlchemy models (`db/models.py`) for employees, receipts, and revision history.
   - Create Pydantic schemas (`db/schemas.py`) for request/response validation.
   - Implement Alembic migrations for schema evolution.
3. **API Routes**
   - `uploads.py`: endpoints for uploading CAR and receipt PDFs.
   - `reports.py`: endpoints for fetching summary data and report files.
   - Add dependency-injected authentication/authorization (`dependencies.py`).
4. **Services**
   - `pdf_processing.py`: wrap existing parsing logic; store results in PostgreSQL.
   - `reporting.py`: generate Excel/CSV using pandas and write to Blob Storage.
5. **Background Tasks**
   - Set up Celery app (`core/celery_app.py`) backed by Redis.
   - Implement `pdf_tasks.py` for asynchronous PDF processing and report generation.
6. **Security**
   - OAuth2 with Azure AD; issue JWT tokens.
   - Role-based access checks in route dependencies.
7. **Testing**
   - Write unit tests covering models, services, and API endpoints.
   - Configure pytest and CI coverage reports.
8. **Containerization**
   - Create `Dockerfile` using multi-stage builds.
   - Ensure health checks and readiness probes for Kubernetes.

## 3. Frontend Tasks (React + TypeScript)
1. **Project Initialization**
   - Create React project with Vite or Create React App.
   - Configure TypeScript, ESLint, and Prettier.
2. **UI Components**
   - `FileUploader` for CAR/receipt PDF uploads.
   - `ProcessingStatus` showing real-time job status via WebSockets or polling.
   - `ReportsTable` listing processed reports with download links.
3. **Pages & Routing**
   - `Dashboard` page displaying upload widgets and current processing queue.
   - `History` page showing revision timeline and outstanding issues.
4. **API Service Layer**
   - `services/api.ts` wrapping Axios calls to FastAPI endpoints.
   - Handle authentication tokens and error responses.
5. **State Management**
   - Use React Query or Redux Toolkit for async state handling.
6. **Styling**
   - Material UI theme with light/dark mode support.
7. **Testing**
   - Component tests with React Testing Library and Jest.
8. **Containerization**
   - Multi-stage Dockerfile that builds static assets and serves via Nginx.

## 4. Kubernetes Tasks (AKS)
1. **Namespace & RBAC**
   - Create dedicated namespace `credit-card-processor` (`namespace.yaml`).
   - Configure service accounts and role bindings for pods.
2. **Secrets & ConfigMaps**
   - Pull secrets from Azure Key Vault via CSI driver for DB and storage credentials.
   - ConfigMap for application settings (API URLs, Celery broker).
3. **Deployments & Services**
   - `backend-deployment.yaml` and `backend-service.yaml` exposing port 8000.
   - `frontend-deployment.yaml` and `frontend-service.yaml` exposing port 80.
   - `worker-deployment.yaml` for Celery workers.
   - `redis-deployment.yaml` and `redis-service.yaml` for task queue.
4. **Ingress**
   - Configure `ingress.yaml` using Application Gateway Ingress Controller or NGINX.
   - TLS termination with certificate from Key Vault.
5. **Storage**
   - Azure Blob Storage for PDF/report files; mount using Blob CSI driver if direct access needed.
6. **Monitoring & Autoscaling**
   - Enable Prometheus/Grafana via existing workspaces.
   - Configure Horizontal Pod Autoscalers for backend and worker deployments.

## 5. Deployment & DevOps Tasks
1. **Container Registry**
   - Build and push images to `iiusacr.azurecr.io` using `build_images.sh` or CI pipeline.
2. **CI/CD Pipelines (GitHub Actions)**
   - `build-and-push.yml`: lint, test, build images, push to ACR.
   - `deploy.yml`: apply Kubernetes manifests to `dev-aks` cluster.
3. **Local Development**
   - `docker-compose.dev.yml` for running backend, frontend, Redis, and PostgreSQL locally.
4. **Release Management**
   - Tag Docker images with semantic versions.
   - Use Helm or Kustomize (future enhancement) for environment-specific configs.
5. **Security & Compliance**
   - Scan images for vulnerabilities (Trivy/Azure Defender).
   - Enforce signed images and pull policy from ACR.

---
This plan provides a comprehensive roadmap for implementing the Credit Card Processor using the recommended modern tech stack, organized into backend, frontend, Kubernetes, and deployment responsibilities.
