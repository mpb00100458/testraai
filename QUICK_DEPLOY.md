# ⚡ Quick Deploy to GCP - 5 Minute Guide

Get your Helena Cruz Accessibility Platform running on GCP in 5 minutes!

---

## 🚀 Prerequisites (One-time setup)

```bash
# 1. Install Google Cloud SDK
brew install --cask google-cloud-sdk  # macOS
# OR download from: https://cloud.google.com/sdk/docs/install

# 2. Login to GCP
gcloud auth login

# 3. Create a new project (or use existing)
gcloud projects create helena-cruz-prod --name="Helena Cruz Production"

# 4. Set the project
gcloud config set project helena-cruz-prod

# 5. Enable billing (required)
# Go to: https://console.cloud.google.com/billing
```

---

## 📦 Deploy in 3 Commands

### 1. Run the automated deployment script

```bash
./deploy-gcp.sh
```

**Enter when prompted:**
- Project ID: `helena-cruz-prod` (or your project ID)
- Region: `us-central1` (or your preferred region)

**Wait ~5-10 minutes** for build and deployment.

---

### 2. Set up the database

```bash
# Set your project ID
export PROJECT_ID="helena-cruz-prod"
export REGION="us-central1"

# Create Cloud SQL instance (takes ~5 minutes)
gcloud sql instances create helena-cruz-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --root-password=$(openssl rand -base64 16)

# Create database
gcloud sql databases create testraai --instance=helena-cruz-db

# Get connection name
gcloud sql instances describe helena-cruz-db --format='value(connectionName)'
# Save this! You'll need it for DATABASE_URL
```

---

### 3. Configure environment variables

```bash
# Copy the template
cp .env.production.template .env.production

# Edit with your values
nano .env.production
# OR
code .env.production
```

**Required values:**
- `DATABASE_URL` - Use the connection name from step 2
- `SESSION_SECRET` - Generate with: `openssl rand -base64 32`
- `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
- `PRIVATE_OBJECT_DIR` - Your Cloud Storage bucket (create below)
- `GCP_PROJECT_ID` - Your project ID

**Create Cloud Storage bucket:**
```bash
gsutil mb -p $PROJECT_ID -l $REGION gs://helena-cruz-reports
```

**Set environment variables in Cloud Run:**
```bash
# Get your service name
SERVICE_NAME="helena-cruz-accessibility"

# Update with environment variables
gcloud run services update $SERVICE_NAME \
    --region $REGION \
    --update-env-vars "DATABASE_URL=postgresql://postgres:PASSWORD@/testraai?host=/cloudsql/CONNECTION_NAME" \
    --update-env-vars "SESSION_SECRET=$(openssl rand -base64 32)" \
    --update-env-vars "OPENAI_API_KEY=sk-your-key" \
    --update-env-vars "PRIVATE_OBJECT_DIR=gs://helena-cruz-reports" \
    --update-env-vars "GCP_PROJECT_ID=$PROJECT_ID"

# Connect Cloud Run to Cloud SQL
gcloud run services update $SERVICE_NAME \
    --region $REGION \
    --add-cloudsql-instances=CONNECTION_NAME
```

---

## ✅ Verify Deployment

```bash
# Get your service URL
gcloud run services describe helena-cruz-accessibility \
    --region $REGION \
    --format 'value(status.url)'

# Test the health endpoint
curl https://YOUR_SERVICE_URL/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-14T...",
  "service": "helena-cruz-accessibility"
}
```

---

## 🎉 You're Live!

Your application is now running at: `https://helena-cruz-accessibility-XXXXX.run.app`

### Next Steps:

1. **Run database migrations:**
   ```bash
   # SSH into Cloud Run (if needed)
   # OR run migrations locally pointing to Cloud SQL
   npm run db:push
   ```

2. **Create your first user:**
   - Visit your service URL
   - Sign up with email/password

3. **Test a scan:**
   - Go to AI Agent
   - Type: `scan https://example.com`
   - Watch it work! 🎊

---

## 📊 Monitor Your Application

```bash
# View logs
gcloud run services logs tail helena-cruz-accessibility --region $REGION

# View metrics
gcloud run services describe helena-cruz-accessibility --region $REGION
```

**Cloud Console:**
- Logs: https://console.cloud.google.com/run
- Metrics: https://console.cloud.google.com/monitoring
- Database: https://console.cloud.google.com/sql

---

## 💰 Cost Estimate

**With free tier:**
- First 2 million requests/month: FREE
- Cloud SQL db-f1-micro: ~$25/month
- Cloud Storage: ~$10/month
- **Total: ~$35/month** (for low traffic)

**Set a budget alert:**
```bash
gcloud billing budgets create \
    --billing-account=YOUR_BILLING_ACCOUNT \
    --display-name="Helena Cruz Budget" \
    --budget-amount=100 \
    --threshold-rule=percent=80
```

---

## 🆘 Troubleshooting

**Container won't start?**
```bash
# Check logs
gcloud run services logs tail helena-cruz-accessibility --region $REGION

# Common issues:
# - Missing DATABASE_URL
# - Wrong Cloud SQL connection name
# - Missing OPENAI_API_KEY
```

**Database connection fails?**
```bash
# Verify Cloud SQL is running
gcloud sql instances list

# Test connection
gcloud sql connect helena-cruz-db --user=postgres
```

**Need more help?**
- See full guide: [GCP_DEPLOYMENT_GUIDE.md](./GCP_DEPLOYMENT_GUIDE.md)
- Check GCP docs: https://cloud.google.com/run/docs

---

## 🔄 Update Your Application

```bash
# Make code changes, then:
./deploy-gcp.sh

# Or manually:
gcloud builds submit --tag gcr.io/$PROJECT_ID/helena-cruz-accessibility
gcloud run deploy helena-cruz-accessibility \
    --image gcr.io/$PROJECT_ID/helena-cruz-accessibility \
    --region $REGION
```

---

**That's it! You're running on GCP! 🚀**

