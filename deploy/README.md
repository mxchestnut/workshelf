# AWS EC2 Deployment Guide

## Quick Deploy

```bash
cd deploy
chmod +x aws-deploy.sh
./aws-deploy.sh
```

## What Gets Deployed

- **EC2 Instance**: t3.small (2 vCPU, 2GB RAM, ~$15/month)
- **Docker Services**:
  - PostgreSQL 15 (database)
  - Redis 7 (cache)
  - Keycloak 23 (authentication)
  - MinIO (S3-compatible storage)
  - Backend (FastAPI on port 8000)
  - Frontend (React/Vite on port 5173)
- **Nginx**: Reverse proxy for all services
- **Security**: Firewall configured for HTTP/HTTPS/SSH

## Cost Estimate

- **EC2 t3.small**: ~$15/month
- **30GB EBS storage**: ~$3/month
- **Data transfer**: First 100GB/month free
- **Total**: ~$18-20/month

## Environment Variables

The deployment script automatically generates secure secrets for:
- Database password
- Keycloak client secret
- Matrix admin token
- MinIO credentials
- Application secret key

## Custom Domain (Optional)

To use your own domain:

```bash
DOMAIN=workshelf.com ./aws-deploy.sh
```

Then configure your DNS to point to the EC2 public IP.

## SSL/HTTPS Setup

After deployment, SSH into the instance and run:

```bash
sudo certbot --nginx -d yourdomain.com
```

## Monitoring

SSH into instance:
```bash
ssh -i ~/.ssh/workshelf-key.pem ubuntu@<PUBLIC_IP>
```

View logs:
```bash
cd /opt/workshelf/work-shelf
docker-compose logs -f
```

## Scaling

To upgrade instance type:
```bash
aws ec2 stop-instances --instance-ids <INSTANCE_ID>
aws ec2 modify-instance-attribute --instance-id <INSTANCE_ID> --instance-type t3.medium
aws ec2 start-instances --instance-ids <INSTANCE_ID>
```

## Backup

Database backup:
```bash
docker-compose exec postgres pg_dump -U workshelf workshelf > backup.sql
```

## Cleanup

To remove all resources:
```bash
aws ec2 terminate-instances --instance-ids <INSTANCE_ID>
aws ec2 delete-security-group --group-id <SG_ID>
aws ec2 delete-key-pair --key-name workshelf-key
```
