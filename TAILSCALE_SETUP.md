# Tailscale Configuration for Secure Admin Panel

## Overview

This configuration secures your admin panel behind Tailscale's zero-trust network.

## Prerequisites

1. Tailscale account (sign up at https://tailscale.com)
2. Install Tailscale on your local machine
3. Install Tailscale on AWS EC2 instances (or use Tailscale subnet router)

## Setup Steps

### 1. Install Tailscale Locally

```bash
# macOS
brew install tailscale

# Start Tailscale
sudo tailscale up
```

### 2. Configure Tailscale ACLs

In your Tailscale admin console (https://login.tailscale.com/admin/acls):

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["autogroup:admin"],
      "dst": ["tag:admin-panel:*"]
    }
  ],
  "tagOwners": {
    "tag:admin-panel": ["autogroup:admin"]
  }
}
```

### 3. Deploy Options

#### Option A: Lambda with Tailscale (Recommended for serverless)

AWS Lambda doesn't directly support Tailscale, but you can:

1. Use API Gateway with Lambda authorizer
2. Add Tailscale authentication check
3. Use Tailscale Funnel for secure public access

#### Option B: EC2 with Tailscale (More flexible)

Deploy to EC2 instances with Tailscale installed:

1. Launch EC2 instance
2. Install Tailscale on EC2
3. Tag with `tag:admin-panel`
4. Access via Tailscale IP only

#### Option C: Tailscale Funnel (Easiest - Recommended!)

Share your service securely over the internet:

```bash
# On your server/EC2
tailscale funnel 443
```

## Implementation Choice

For your setup, we'll use **Tailscale ACLs + CloudFront with custom headers** for security:

1. CloudFront distribution (as planned)
2. Lambda@Edge to validate Tailscale authentication
3. Only accessible via Tailscale network

Would you like to:
A) Deploy with Tailscale Funnel (simplest, Tailscale handles HTTPS)
B) Deploy to EC2 with Tailscale (full control)
C) Use CloudFront + API Gateway + Tailscale Auth (serverless)

Recommendation: **Start with Tailscale Funnel** for quickest secure deployment!
