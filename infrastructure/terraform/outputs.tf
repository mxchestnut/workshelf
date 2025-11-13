# VPC
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

# RDS
output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_connection_string" {
  description = "PostgreSQL connection string for asyncpg"
  value       = "postgresql+asyncpg://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.db_name}"
  sensitive   = true
}

# ECR
output "ecr_backend_url" {
  description = "ECR repository URL for backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "ECR repository URL for frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecr_keycloak_url" {
  description = "ECR repository URL for Keycloak"
  value       = aws_ecr_repository.keycloak.repository_url
}

# ALB
output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB hosted zone ID for Route 53"
  value       = aws_lb.main.zone_id
}

# CloudFront
output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

# S3
output "s3_bucket_name" {
  description = "S3 bucket name for frontend"
  value       = aws_s3_bucket.frontend.id
}

# ACM Certificate
output "acm_certificate_arn" {
  description = "ACM certificate ARN"
  value       = aws_acm_certificate.main.arn
}

output "acm_validation_records" {
  description = "DNS records for ACM certificate validation"
  value = [
    for dvo in aws_acm_certificate.main.domain_validation_options : {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  ]
}

# Application URLs
output "backend_url" {
  description = "Backend API URL"
  value       = "https://api.${var.domain_name}"
}

output "keycloak_url" {
  description = "Keycloak auth URL"
  value       = "https://auth.${var.domain_name}"
}

output "frontend_url" {
  description = "Frontend URL"
  value       = "https://${var.domain_name}"
}

# DNS Configuration Guide
output "dns_configuration" {
  description = "DNS records to configure in your DNS provider"
  value = {
    instructions = "Add these records to your DNS provider (e.g., Namecheap, Cloudflare)"
    records = [
      {
        type  = "A or ALIAS"
        name  = var.domain_name
        value = aws_cloudfront_distribution.frontend.domain_name
        note  = "Point root domain to CloudFront (use ALIAS if supported, otherwise CNAME)"
      },
      {
        type  = "CNAME"
        name  = "www"
        value = aws_cloudfront_distribution.frontend.domain_name
        note  = "Point www subdomain to CloudFront"
      },
      {
        type  = "CNAME"
        name  = "api"
        value = aws_lb.main.dns_name
        note  = "Point API subdomain to ALB"
      },
      {
        type  = "CNAME"
        name  = "auth"
        value = aws_lb.main.dns_name
        note  = "Point auth subdomain to ALB"
      }
    ]
  }
}
