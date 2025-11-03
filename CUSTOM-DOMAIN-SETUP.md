# 🌐 Custom Domain Setup - workshelf.dev

**Status**: Domain purchased ✅  
**Registrar**: (Where you purchased workshelf.dev)  
**Goal**: Point workshelf.dev to Azure Container Apps

---

## 🎯 Overview

You'll set up:
- **workshelf.dev** → Frontend (React app)
- **api.workshelf.dev** → Backend (FastAPI)
- **www.workshelf.dev** → Redirect to workshelf.dev

---

## 📋 Step 1: Add Custom Domains to Azure Container Apps

### Frontend (workshelf.dev)

```bash
# Add custom domain to frontend Container App
az containerapp hostname add \
  --hostname workshelf.dev \
  --resource-group workshelf-prod-rg \
  --name workshelf-frontend

# Get validation TXT record
az containerapp hostname show \
  --hostname workshelf.dev \
  --resource-group workshelf-prod-rg \
  --name workshelf-frontend
```

**Expected output**: You'll get a TXT record value like:
```
asuid.workshelf.dev → <VALIDATION-CODE>
```

### Backend (api.workshelf.dev)

```bash
# Add custom domain to backend Container App
az containerapp hostname add \
  --hostname api.workshelf.dev \
  --resource-group workshelf-prod-rg \
  --name workshelf-backend

# Get validation TXT record
az containerapp hostname show \
  --hostname api.workshelf.dev \
  --resource-group workshelf-prod-rg \
  --name workshelf-backend
```

---

## 📋 Step 2: Configure DNS Records

Go to your domain registrar's DNS settings and add these records:

### For workshelf.dev (Frontend)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | asuid | `<VALIDATION-CODE-FROM-STEP-1>` | 3600 |
| CNAME | @ or workshelf.dev | `workshelf-frontend.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io` | 3600 |
| CNAME | www | `workshelf.dev` | 3600 |

### For api.workshelf.dev (Backend)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | asuid.api | `<VALIDATION-CODE-FROM-STEP-1>` | 3600 |
| CNAME | api | `workshelf-backend.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io` | 3600 |

**Note**: Some registrars don't allow CNAME on apex domain (@). If you get an error:
- Use **A** record instead with IP from `dig workshelf-frontend.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io`
- Or use registrar's "CNAME flattening" feature
- Or use ALIAS record (if supported)

---

## 📋 Step 3: Verify Domain Ownership

Wait 5-10 minutes for DNS propagation, then verify:

```bash
# Check TXT records propagated
dig TXT asuid.workshelf.dev +short
dig TXT asuid.api.workshelf.dev +short

# Verify domain binding in Azure
az containerapp hostname bind \
  --hostname workshelf.dev \
  --resource-group workshelf-prod-rg \
  --name workshelf-frontend \
  --environment workshelf-env-prod \
  --validation-method CNAME

az containerapp hostname bind \
  --hostname api.workshelf.dev \
  --resource-group workshelf-prod-rg \
  --name workshelf-backend \
  --environment workshelf-env-prod \
  --validation-method CNAME
```

---

## 📋 Step 4: Enable HTTPS (Managed Certificate)

Azure Container Apps will automatically provision free SSL certificates:

```bash
# Add managed certificate for frontend
az containerapp ssl upload \
  --hostname workshelf.dev \
  --resource-group workshelf-prod-rg \
  --name workshelf-frontend \
  --certificate-type Managed

# Add managed certificate for backend
az containerapp ssl upload \
  --hostname api.workshelf.dev \
  --resource-group workshelf-prod-rg \
  --name workshelf-backend \
  --certificate-type Managed
```

**Note**: This may take 5-15 minutes. Azure uses Let's Encrypt.

---

## 📋 Step 5: Update Frontend Configuration

Update the frontend to use the new API URL:

```bash
# Update frontend environment variable
az containerapp update \
  --name workshelf-frontend \
  --resource-group workshelf-prod-rg \
  --set-env-vars VITE_API_URL=https://api.workshelf.dev
```

Or update in GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
--env-vars VITE_API_URL=https://api.workshelf.dev
```

---

## 📋 Step 6: Update CORS in Backend

Add your custom domain to allowed origins in `backend/app/core/config.py`:

```python
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://workshelf.dev",
    "https://www.workshelf.dev",
    "https://workshelf-frontend.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io",
]
```

Commit and push to redeploy:

```bash
git add backend/app/core/config.py
git commit -m "Add custom domain to CORS origins"
git push
```

---

## 📋 Step 7: Update Stripe Webhooks

Update your Stripe webhook endpoint URL:

1. Go to: https://dashboard.stripe.com/webhooks
2. Update webhook endpoint from:
   ```
   https://workshelf-backend.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io/api/v1/webhooks/stripe
   ```
   to:
   ```
   https://api.workshelf.dev/api/v1/webhooks/stripe
   ```

---

## 📋 Step 8: Test Everything

```bash
# Test frontend
curl -I https://workshelf.dev
curl -I https://www.workshelf.dev

# Test backend
curl https://api.workshelf.dev/health
curl https://api.workshelf.dev/api/v1/status

# Test HTTPS redirect (should redirect to HTTPS)
curl -I http://workshelf.dev
```

---

## 🔍 Troubleshooting

### DNS not propagating
```bash
# Check current DNS
dig workshelf.dev +short
dig api.workshelf.dev +short

# Check from different DNS servers
dig @8.8.8.8 workshelf.dev +short
dig @1.1.1.1 workshelf.dev +short
```

### Certificate errors
```bash
# Check certificate status
az containerapp show \
  --name workshelf-frontend \
  --resource-group workshelf-prod-rg \
  --query properties.configuration.ingress.customDomains
```

### CORS errors in browser
- Make sure `VITE_API_URL=https://api.workshelf.dev` is set
- Verify backend CORS_ORIGINS includes `https://workshelf.dev`
- Check browser console for specific CORS error

---

## 💰 Cost Impact

**No additional cost!**
- Custom domains: Free
- Managed SSL certificates: Free (Let's Encrypt)
- DNS queries: Negligible (covered by registrar)

---

## 📝 Checklist

- [ ] Purchase domain (workshelf.dev) ✅
- [ ] Add custom hostnames in Azure Container Apps
- [ ] Get validation TXT records
- [ ] Add DNS records at registrar
- [ ] Wait for DNS propagation (5-10 minutes)
- [ ] Bind hostnames in Azure
- [ ] Enable managed SSL certificates
- [ ] Update frontend VITE_API_URL
- [ ] Update backend CORS_ORIGINS
- [ ] Update Stripe webhook URL
- [ ] Test frontend: https://workshelf.dev
- [ ] Test backend: https://api.workshelf.dev/health
- [ ] Update documentation with new URLs

---

## 🎉 Final URLs

After setup:
- **Frontend**: https://workshelf.dev
- **Backend API**: https://api.workshelf.dev
- **API Docs**: https://api.workshelf.dev/api/docs
- **Health Check**: https://api.workshelf.dev/health

Old URLs will continue to work but you can redirect them or disable them later.

---

**Next**: Once DNS is configured, run the Azure CLI commands in Steps 3-5 to complete the setup!
