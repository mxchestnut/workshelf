variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "workshelf"
}

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "workshelf.dev"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "workshelf"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "workshelf_admin"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "keycloak_admin_password" {
  description = "Keycloak admin password"
  type        = string
  sensitive   = true
}

variable "backend_container_cpu" {
  description = "CPU units for backend container (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "backend_container_memory" {
  description = "Memory for backend container in MB"
  type        = number
  default     = 1024
}

variable "keycloak_container_cpu" {
  description = "CPU units for Keycloak container"
  type        = number
  default     = 512
}

variable "keycloak_container_memory" {
  description = "Memory for Keycloak container in MB"
  type        = number
  default     = 1024
}
