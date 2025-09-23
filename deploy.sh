#!/bin/bash
set -e

RESOURCE_GROUP="rg_prod"
AKS_NAME="dev-aks"
ACR_NAME="iiusacr"

echo "Deploying Credit Card Processor to AKS"

az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$AKS_NAME"

echo "Building and pushing Docker images..."
az acr build --registry "$ACR_NAME" --image backend:latest ./backend
az acr build --registry "$ACR_NAME" --image frontend:latest ./frontend

echo "Applying Kubernetes manifests..."
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-keyvault-secrets.yaml
sleep 10
kubectl apply -f k8s/02-postgres.yaml
kubectl wait --for=condition=ready pod -l app=postgres -n credit-card-processor --timeout=60s || true
kubectl apply -f k8s/03-backend.yaml
kubectl wait --for=condition=ready pod -l app=backend -n credit-card-processor --timeout=60s || true
kubectl apply -f k8s/04-frontend.yaml
kubectl apply -f k8s/05-ingress.yaml
kubectl apply -f k8s/06-network-policy.yaml

echo "Deployment complete!"
echo "Application will be available at: https://creditcard.yourdomain.com"


