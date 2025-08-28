# Credit Card Processor Kubernetes Deployment - Azure Resources Reference

## **COMPUTE & CONTAINER INFRASTRUCTURE**

### **AKS Cluster**
- `dev-aks` - Primary AKS managed cluster
- `aks-systempool-18197317-vmss` - System node pool VM scale set
- `aks-default-5vt8b` - Worker node VM
- `MC_rg_prod_dev-aks_southcentralus` - AKS managed resource group

### **Container Registry**
- `iiusacr` - Primary container registry
- `iiusacr/southcentralus` - Registry replication endpoint

### **AKS Managed Identities**
- `dev-aks-uami` - Cluster user-assigned managed identity
- `azurepolicy-dev-aks` - Policy management identity
- `azurekeyvaultsecretsprovider-dev-aks` - Key Vault CSI driver identity
- `webapprouting-dev-aks` - Application routing identity
- `dev-aks-agentpool` - Agent pool identity

## **DATABASE & STORAGE**

### **Database Server**
- `INSCOLVSQL` - Virtual machine for database hosting
- `nic-INSCOLVSQL-00` - Database VM network interface
- `INSCOLVSQL-OSdisk-00` - Database VM OS disk
- `INSCOLVSQL-datadisk-00` - Database VM data disk

### **Storage Resources**
- `cssa915121f46f2ae0d374e7` - Storage account for files
- `pvc-8bebeb6e-62fe-48b8-b38a-e233e42df327` - AKS persistent volume

## **NETWORKING**

### **Virtual Network**
- `vnet_prod` - Primary virtual network
- `aks-agentpool-91635353-nsg` - AKS network security group

### **Load Balancers**
- `kubernetes` - AKS service load balancer
- `kube-apiserver` - Kubernetes API server load balancer

### **Public IP Addresses**
- `kubernetes-a9091c70e329e4a9ba8f7aeeab4868b4` - Service public IP
- `kubernetes-ab95941e97ac148bc9e3a92455384ce4` - API public IP  
- `kubernetes-a1c4c3a8d4469467aafef71292f5b8ed` - Additional service IP

### **DNS**
- `6b50eed7-ab6c-40cb-b2ee-4ccc91d3aaf2.private.southcentralus.azmk8s.io` - Private DNS zone
- `6b50eed7-ab6c-40cb-b2ee-4ccc91d3aaf2.private.southcentralus.azmk8s.io/dns-275668076-1mnu3cfq` - VNet DNS link

## **SECURITY & SECRETS**

### **Key Vaults**
- `iius-akv` - Primary Key Vault for secrets
- `akv-6-qvslkiesvo7xm6a` - Secondary Key Vault

### **Network Security Groups**
- `II_NSG` - General network security group
- `nic-INSCOLVISTA-00-nsg` - VM-specific NSG
- `nic-INSCOLVSQL-00-nsg` - Database VM NSG

## **AI/COGNITIVE SERVICES**

### **Document Processing**
- `iius-doc-intelligence` - Document Intelligence service
- `iius-embedding` - Text embedding service

## **MONITORING & OBSERVABILITY**

### **Monitoring Workspaces**
- `grafana-20250729101904` - Grafana workspace
- `defaultazuremonitorworkspace-scus` - Azure Monitor workspace
- `DefaultWorkspace-a78954fe-f6fe-4279-8be0-2c748be2f266-SCUS` - Log Analytics workspace

### **Data Collection**
- `MSCI-southcentralus-dev-aks` - Container insights data collection rule
- `MSProm-southcentralus-dev-aks` - Prometheus data collection endpoint
- `MSProm-southcentralus-dev-aks` (DCR) - Prometheus data collection rule

### **Alert Rules & Action Groups**
- `send_alert` - Primary action group
- `RecommendedAlertRules-AG-1` - Default alert action group
- `CPU Usage Percentage - dev-aks` - CPU metric alert
- `Memory Working Set Percentage - dev-aks` - Memory metric alert

### **Prometheus Rule Groups**
- `KubernetesRecordingRulesRuleGroup-dev-aks` - Kubernetes metrics
- `NodeRecordingRulesRuleGroup-dev-aks` - Node metrics  
- `NodeRecordingRulesRuleGroup-Win-dev-aks` - Windows node metrics
- `UXRecordingRulesRuleGroup - dev-aks` - User experience metrics
- `UXRecordingRulesRuleGroup-Win - dev-aks` - Windows UX metrics
- `NodeAndKubernetesRecordingRulesRuleGroup-Win-dev-aks` - Combined Windows metrics

## **BACKUP & RECOVERY**

### **Recovery Services**
- `rsv-prod` - Recovery Services Vault
- `AzureBackup_INSCOLVSQL_721281640069299` - Database VM backup collection

## **AUTOMATION & MANAGEMENT**

### **Automation Account**
- `nmm-app-runbooks-01fd` - Automation account for runbooks
- `nmm-app-runbooks-01fd/nmm-scripted-action` - Runbook for scripted actions

## **WORKBOOKS & DASHBOARDS**

### **Monitoring Workbooks**
- `66e66d4c-9951-4134-b15c-474792ce5d9b` - Custom monitoring workbook
- `d211c50a-4005-4820-bc0c-d73a5b6ad8dc` - Additional monitoring workbook

## **REFERENCE INFORMATION**

### **Resource Group**
- Primary RG: `rg_prod`
- AKS Managed RG: `MC_rg_prod_dev-aks_southcentralus`

### **Location**
- Primary Region: `southcentralus`

### **Managed Identity References**
- Cluster Identity: `dev-aks-uami`
- Key Vault Access: `azurekeyvaultsecretsprovider-dev-aks`

### **Key Resource Names for Deployment Scripts**
```bash
# Core Resources
AKS_CLUSTER="dev-aks"
CONTAINER_REGISTRY="iiusacr"
KEY_VAULT="iius-akv"
DATABASE_VM="INSCOLVSQL"
STORAGE_ACCOUNT="cssa915121f46f2ae0d374e7"
DOC_INTELLIGENCE="iius-doc-intelligence"
RESOURCE_GROUP="rg_prod"
```

## **DEPLOYMENT CONFIGURATION REFERENCE**

### **Kubernetes Namespace**
```yaml
namespace: credit-card-processor
```

### **Key Vault Secrets (to be configured)**
- `database-connection-string` - PostgreSQL connection details
- `doc-intelligence-api-key` - Document Intelligence API key
- `storage-account-key` - Storage account access key

### **Container Images (to be built)**
- `iiusacr.azurecr.io/credit-card-frontend:latest` - React web interface
- `iiusacr.azurecr.io/credit-card-backend:latest` - FastAPI backend
- `iiusacr.azurecr.io/credit-card-processor:latest` - PDF processing worker

### **Service Endpoints**
- Frontend: Port 80 (HTTP)
- Backend API: Port 8000 (HTTP)
- Database: Port 5432 (PostgreSQL)

---

**Last Updated**: August 28, 2025  
**Purpose**: Reference document for Credit Card Processor Kubernetes deployment using existing Azure infrastructure