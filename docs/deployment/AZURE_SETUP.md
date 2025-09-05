# Azure Document Intelligence Setup Guide

## 🚀 **Setting Up Real OCR Processing**

This guide will help you configure Azure Document Intelligence for real OCR processing instead of mock data.

---

## **Step 1: Create Azure Document Intelligence Resource**

### 1.1 **Azure Portal Setup**
1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"**
3. Search for **"Document Intelligence"**
4. Click **"Create"**

### 1.2 **Resource Configuration**
- **Subscription**: Choose your Azure subscription
- **Resource Group**: Create new or use existing
- **Region**: Choose closest to your users (e.g., East US, West Europe)
- **Name**: `creditcard-processor-di` (or your choice)
- **Pricing Tier**: 
  - **F0 (Free)**: 500 pages/month, 20 calls/minute
  - **S0 (Standard)**: Pay per use, higher limits

### 1.3 **Deploy Resource**
- Click **"Review + Create"**
- Click **"Create"**
- Wait for deployment (2-3 minutes)

---

## **Step 2: Get API Credentials**

### 2.1 **Access Your Resource**
1. Go to your Document Intelligence resource
2. Click **"Keys and Endpoint"** in the left menu

### 2.2 **Copy Credentials**
You'll need:
- **Endpoint**: `https://your-resource-name.cognitiveservices.azure.com/`
- **Key**: `32-character API key`

---

## **Step 3: Configure Production Environment**

### 3.1 **Update .env.production**
Add these lines to your `.env.production` file:

```env
# Azure Document Intelligence (OCR) Configuration
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-32-character-api-key

# Optional: Custom Models (if you train specific models)
AZURE_CAR_MODEL_ID=your-custom-car-model-id
AZURE_RECEIPT_MODEL_ID=your-custom-receipt-model-id
```

### 3.2 **Example Configuration**
```env
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://creditcard-processor-di.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## **Step 4: Test OCR Processing**

### 4.1 **Deploy with OCR**
```bash
./deploy-production.sh
```

### 4.2 **Verify OCR is Active**
Check the logs:
```bash
docker-compose -f docker-compose.production.yml logs backend | grep -i "azure"
```

You should see:
```
Azure Document Intelligence configured with endpoint: https://your-resource-name.cognitiveservices.azure.com/
```

---

## **Step 5: Custom Models (Advanced)**

### 5.1 **When to Use Custom Models**
- **Default**: Use prebuilt models for general documents
- **Custom**: Train models for specific CAR/Receipt formats

### 5.2 **Training Custom Models**
1. Go to [Document Intelligence Studio](https://documentintelligence.ai.azure.com/)
2. Upload 5+ sample documents
3. Label key fields (employee_id, name, amount, etc.)
4. Train model
5. Get model ID and add to `.env.production`

---

## **Pricing Information**

### **Free Tier (F0)**
- ✅ **500 pages/month**
- ✅ **20 requests/minute**  
- ✅ **Perfect for testing**

### **Standard Tier (S0)**
- 💰 **$1.50 per 1,000 pages**
- ⚡ **Higher rate limits**
- 🏢 **Production recommended**

### **Cost Estimation**
- **100 documents/day** = ~$4.50/month
- **500 documents/day** = ~$22.50/month
- **1000 documents/day** = ~$45/month

---

## **Troubleshooting**

### **Common Issues**

#### ❌ **"Azure Document Intelligence not configured"**
- Check endpoint URL format (must start with `https://`)
- Verify API key is 32 characters
- Ensure no extra spaces in `.env.production`

#### ❌ **"Invalid API key"** 
- Regenerate key in Azure Portal
- Update `.env.production` with new key
- Restart containers

#### ❌ **"Rate limit exceeded"**
- Upgrade from Free (F0) to Standard (S0) tier
- Or reduce processing frequency

#### ❌ **"Document format not supported"**
- Ensure PDFs are text-based (not scanned images)
- For scanned PDFs, Azure will use OCR automatically
- Check PDF file size (max 500MB)

### **Testing Commands**

```bash
# Check Azure configuration
curl -H "Ocp-Apim-Subscription-Key: YOUR_KEY" \
  "https://YOUR_ENDPOINT/documentintelligence/info?api-version=2024-02-29-preview"

# View processing logs
docker-compose -f docker-compose.production.yml logs -f backend

# Restart services
docker-compose -f docker-compose.production.yml restart backend
```

---

## **✅ Success Indicators**

When Azure Document Intelligence is working correctly, you'll see:

1. **✅ Startup Logs**: "Azure Document Intelligence configured"
2. **✅ Processing Logs**: "Processing CAR document with Azure DI"
3. **✅ Real Data**: Employee names/amounts from actual PDF content
4. **✅ No Mock Messages**: No "mock processing" in logs

---

## **🔒 Security Best Practices**

1. **🔐 Secure API Keys**: Never commit `.env.production` to version control
2. **🌐 Network Security**: Restrict Azure resource to your IP ranges
3. **📊 Monitor Usage**: Set up billing alerts in Azure
4. **🔄 Rotate Keys**: Regularly regenerate API keys
5. **🛡️ HTTPS Only**: Ensure all endpoints use HTTPS

---

## **📞 Support**

### **Azure Support**
- [Azure Documentation](https://docs.microsoft.com/azure/applied-ai-services/form-recognizer/)
- [Azure Support Portal](https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade)

### **Application Support**
- Check application logs: `docker-compose logs`
- Review this guide for configuration issues
- Verify PDF file formats and sizes