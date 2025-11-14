# 🚀 Helena Cruz Accessibility Platform - GCP Deployment Guide

Complete guide to deploy your accessibility scanning platform to Google Cloud Platform.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Automated)](#quick-start-automated)
3. [Manual Deployment (Step-by-Step)](#manual-deployment-step-by-step)
4. [Database Setup](#database-setup)
5. [Storage Setup](#storage-setup)
6. [Environment Variables](#environment-variables)
7. [Custom Domain Setup](#custom-domain-setup)
8. [Monitoring & Logging](#monitoring--logging)
9. [Cost Optimization](#cost-optimization)
10. [Troubleshooting](#troubleshooting)

---

## 📦 Prerequisites

### 1. Install Required Tools

**Google Cloud SDK:**
```bash
# macOS
brew install --cask google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Windows
# Download from: https://cloud.google.com/sdk/docs/install
```

**Docker:**
```bash
# macOS
brew install --cask docker

# Linux
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Windows
# Download from: https://www.docker.com/products/docker-desktop
```

### 2. Create GCP Account & Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable billing for the project
4. Note your **Project ID** (you'll need this)

### 3. Authenticate with GCP

```bash
# Login to GCP
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Configure Docker to use gcloud
gcloud auth configure-docker
```

---

## ⚡ Quick Start (Automated)

Use the automated deployment script:

```bash
# Make the script executable (already done)
chmod +x deploy-gcp.sh

# Run the deployment script
./deploy-gcp.sh
```

The script will:
- ✅ Enable required GCP APIs
- ✅ Build Docker image
- ✅ Deploy to Cloud Run
- ✅ Configure auto-scaling
- ✅ Provide service URL

**Then continue with:**
- [Database Setup](#database-setup)
- [Storage Setup](#storage-setup)
- [Environment Variables](#environment-variables)

---

## 🔧 Manual Deployment (Step-by-Step)

### Step 1: Enable Required APIs

```bash
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    storage-api.googleapis.com \
    secretmanager.googleapis.com
```

### Step 2: Build Docker Image

```bash
# Set variables
export PROJECT_ID="your-project-id"
export SERVICE_NAME="helena-cruz-accessibility"
export REGION="us-central1"

# Build and push image to Google Container Registry
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME
```

**Build time:** ~5-10 minutes (includes Playwright installation)

### Step 3: Deploy to Cloud Run

```bash
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --timeout 3600 \
    --max-instances 100 \
    --min-instances 0 \
    --port 8080 \
    --set-env-vars "NODE_ENV=production"
```

**Configuration explained:**
- `--memory 2Gi` - 2GB RAM (needed for Playwright)
- `--cpu 2` - 2 vCPUs (for browser automation)
- `--timeout 3600` - 60 min timeout (for long scans)
- `--max-instances 100` - Auto-scale up to 100 instances
- `--min-instances 0` - Scale to zero when idle (cost savings)

### Step 4: Get Service URL

```bash
gcloud run services describe $SERVICE_NAME \
    --region $REGION \
    --format 'value(status.url)'
```

---

## 🗄️ Database Setup

### Option 1: Cloud SQL (Recommended for Production)

#### Create PostgreSQL Instance

```bash
# Create Cloud SQL instance
gcloud sql instances create helena-cruz-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --root-password=YOUR_SECURE_PASSWORD

# Create database
gcloud sql databases create testraai \
    --instance=helena-cruz-db

# Create user
gcloud sql users create helena_user \
    --instance=helena-cruz-db \
    --password=YOUR_USER_PASSWORD
```

**For production, use larger tier:**
```bash
--tier=db-n1-standard-2  # 2 vCPUs, 7.5GB RAM (~$150/month)
```

#### Connect Cloud Run to Cloud SQL

```bash
# Get the instance connection name
gcloud sql instances describe helena-cruz-db \
    --format='value(connectionName)'

# Update Cloud Run to connect to Cloud SQL
gcloud run services update $SERVICE_NAME \
    --region $REGION \
    --add-cloudsql-instances=YOUR_CONNECTION_NAME
```

#### Database Connection String

For Cloud SQL, use Unix socket connection:
```
postgresql://helena_user:YOUR_PASSWORD@/testraai?host=/cloudsql/YOUR_CONNECTION_NAME
```

Or use Cloud SQL Proxy for local development:
```bash
cloud_sql_proxy -instances=YOUR_CONNECTION_NAME=tcp:5432
```

### Option 2: Neon Database (Serverless PostgreSQL)

If you prefer serverless PostgreSQL:

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy the connection string
4. Add to Cloud Run environment variables

**Pros:** Serverless, auto-scaling, free tier available
**Cons:** External dependency, potential latency

---

## 📦 Storage Setup

### Create Cloud Storage Bucket

```bash
# Create bucket for accessibility reports
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://helena-cruz-reports

# Set bucket permissions (private)
gsutil iam ch allUsers:objectViewer gs://helena-cruz-reports

# Enable versioning (optional)
gsutil versioning set on gs://helena-cruz-reports

# Set lifecycle policy (delete files older than 90 days)
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://helena-cruz-reports
```

### Grant Cloud Run Access to Storage

```bash
# Get Cloud Run service account
SERVICE_ACCOUNT=$(gcloud run services describe $SERVICE_NAME \
    --region $REGION \
    --format='value(spec.template.spec.serviceAccountName)')

# Grant storage permissions
gsutil iam ch serviceAccount:$SERVICE_ACCOUNT:objectAdmin gs://helena-cruz-reports
```

---

## 🔐 Environment Variables

### Required Environment Variables

Create a file `env-vars.yaml`:

```yaml
NODE_ENV: "production"
PORT: "8080"

# Database
DATABASE_URL: "postgresql://helena_user:PASSWORD@/testraai?host=/cloudsql/PROJECT:REGION:INSTANCE"

# Session Secret
SESSION_SECRET: "your-super-secret-session-key-change-this"

# OpenAI API
OPENAI_API_KEY: "sk-your-openai-api-key"

# Google Cloud Storage
PRIVATE_OBJECT_DIR: "gs://helena-cruz-reports"
GCP_PROJECT_ID: "your-project-id"

# Application URLs
FRONTEND_URL: "https://your-service-url.run.app"
BACKEND_URL: "https://your-service-url.run.app"
```

### Set Environment Variables

**Option 1: Using YAML file**
```bash
gcloud run services update $SERVICE_NAME \
    --region $REGION \
    --env-vars-file env-vars.yaml
```

**Option 2: Using Secret Manager (Recommended for sensitive data)**

```bash
# Create secrets
echo -n "your-openai-api-key" | gcloud secrets create openai-api-key --data-file=-
echo -n "your-session-secret" | gcloud secrets create session-secret --data-file=-

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding openai-api-key \
    --member=serviceAccount:$SERVICE_ACCOUNT \
    --role=roles/secretmanager.secretAccessor

# Update Cloud Run to use secrets
gcloud run services update $SERVICE_NAME \
    --region $REGION \
    --update-secrets=OPENAI_API_KEY=openai-api-key:latest \
    --update-secrets=SESSION_SECRET=session-secret:latest
```

---

## 🌐 Custom Domain Setup

### Step 1: Verify Domain Ownership

```bash
# Add domain mapping
gcloud run domain-mappings create \
    --service $SERVICE_NAME \
    --domain your-domain.com \
    --region $REGION
```

### Step 2: Update DNS Records

Add the DNS records shown by the command above to your domain registrar:

```
Type: A
Name: @
Value: 216.239.32.21

Type: AAAA
Name: @
Value: 2001:4860:4802:32::15
```

### Step 3: Enable HTTPS

Cloud Run automatically provisions SSL certificates. Wait 15-30 minutes for DNS propagation.

---

## 📊 Monitoring & Logging

### View Logs

```bash
# Stream logs in real-time
gcloud run services logs tail $SERVICE_NAME --region $REGION

# View logs in Cloud Console
gcloud run services logs read $SERVICE_NAME --region $REGION --limit 100
```

### Set Up Alerts

1. Go to [Cloud Monitoring](https://console.cloud.google.com/monitoring)
2. Create alert policies for:
   - High error rate (>5%)
   - High latency (>5s)
   - High memory usage (>80%)
   - Instance count (>50)

### Create Dashboard

```bash
# Open Cloud Console Monitoring
gcloud monitoring dashboards list
```

Create custom dashboard with:
- Request count
- Error rate
- Latency (p50, p95, p99)
- Memory usage
- CPU usage
- Active instances

---

## 💰 Cost Optimization

### Estimated Monthly Costs

**Small Scale (100 scans/day):**
- Cloud Run: $50-100
- Cloud SQL (db-f1-micro): $25
- Cloud Storage: $10-20
- **Total: ~$85-145/month**

**Medium Scale (1,000 scans/day):**
- Cloud Run: $300-500
- Cloud SQL (db-n1-standard-2): $150
- Cloud Storage: $50-100
- **Total: ~$500-750/month**

### Cost Saving Tips

1. **Use minimum instances = 0** (scale to zero when idle)
2. **Set max instances** to prevent runaway costs
3. **Use Cloud Storage lifecycle policies** (delete old reports)
4. **Use committed use discounts** (57% off for 1-year commitment)
5. **Monitor with budget alerts**

```bash
# Set budget alert
gcloud billing budgets create \
    --billing-account=YOUR_BILLING_ACCOUNT \
    --display-name="Helena Cruz Budget" \
    --budget-amount=500 \
    --threshold-rule=percent=50 \
    --threshold-rule=percent=90
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Container fails to start

**Check logs:**
```bash
gcloud run services logs tail $SERVICE_NAME --region $REGION
```

**Common causes:**
- Missing environment variables
- Database connection failure
- Port mismatch (must be 8080)

#### 2. Database connection timeout

**Solution:**
- Verify Cloud SQL instance is running
- Check connection string format
- Ensure Cloud Run has Cloud SQL IAM permissions

#### 3. Playwright browser crashes

**Solution:**
- Increase memory to 4Gi
- Increase CPU to 4
- Check if ffmpeg is installed in Docker image

```bash
gcloud run services update $SERVICE_NAME \
    --region $REGION \
    --memory 4Gi \
    --cpu 4
```

#### 4. Storage upload fails

**Solution:**
- Verify bucket exists
- Check service account permissions
- Ensure PRIVATE_OBJECT_DIR is set correctly

#### 5. Cold start latency

**Solution:**
- Set minimum instances to 1 (costs more but eliminates cold starts)

```bash
gcloud run services update $SERVICE_NAME \
    --region $REGION \
    --min-instances 1
```

---

## 🚀 Production Checklist

Before going live:

- [ ] Database backups enabled
- [ ] Environment variables set (all required)
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Monitoring alerts configured
- [ ] Budget alerts set
- [ ] Logs retention configured
- [ ] Storage lifecycle policy set
- [ ] Security: IAM roles reviewed
- [ ] Load testing completed
- [ ] Disaster recovery plan documented

---

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)
- [GCP Free Tier](https://cloud.google.com/free)

---

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Cloud Run logs
3. Check GCP Status Dashboard
4. Contact GCP Support (if you have a support plan)

---

**🎉 Congratulations!** Your Helena Cruz Accessibility Platform is now running on GCP!



