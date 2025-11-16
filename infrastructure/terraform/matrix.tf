# Matrix Synapse ECS Service
# Lightweight setup for messaging with minimal cost

# RDS PostgreSQL for Matrix (smallest instance)
resource "aws_db_instance" "matrix" {
  identifier     = "${var.project_name}-matrix-db"
  engine         = "postgres"
  engine_version = "15.8"

  # Smallest production instance - ~$15/month
  instance_class    = "db.t4g.micro"
  allocated_storage = 20
  storage_type      = "gp3"

  db_name  = "synapse"
  username = "synapse_user"
  password = random_password.matrix_db_password.result

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.matrix_db.id]
  publicly_accessible    = false

  # Backups
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  # Cost optimization
  skip_final_snapshot       = var.environment == "dev" ? true : false
  final_snapshot_identifier = var.environment == "dev" ? null : "${var.project_name}-matrix-db-final-snapshot"
  deletion_protection       = var.environment == "prod" ? true : false

  tags = {
    Name = "${var.project_name}-matrix-db"
  }
}

# Generate secure password for Matrix DB
resource "random_password" "matrix_db_password" {
  length  = 32
  special = true
  # Exclude problematic characters for RDS: /, @, ", space
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store Matrix DB password in Secrets Manager
resource "aws_secretsmanager_secret" "matrix_db_password" {
  name        = "${var.project_name}/matrix/db-password"
  description = "Matrix PostgreSQL database password"
}

resource "aws_secretsmanager_secret_version" "matrix_db_password" {
  secret_id     = aws_secretsmanager_secret.matrix_db_password.id
  secret_string = random_password.matrix_db_password.result
}

# Generate Matrix registration shared secret
resource "random_password" "matrix_shared_secret" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "matrix_shared_secret" {
  name        = "${var.project_name}/matrix/shared-secret"
  description = "Matrix registration shared secret"
}

resource "aws_secretsmanager_secret_version" "matrix_shared_secret" {
  secret_id     = aws_secretsmanager_secret.matrix_shared_secret.id
  secret_string = random_password.matrix_shared_secret.result
}

# Security Group for Matrix Database
resource "aws_security_group" "matrix_db" {
  name        = "${var.project_name}-matrix-db-sg"
  description = "Security group for Matrix PostgreSQL database"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.matrix_service.id]
    description     = "PostgreSQL from Matrix service"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-matrix-db-sg"
  }
}

# Security Group for Matrix ECS Service
resource "aws_security_group" "matrix_service" {
  name        = "${var.project_name}-matrix-service-sg"
  description = "Security group for Matrix Synapse ECS service"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8008
    to_port         = 8008
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Matrix client API from ALB"
  }

  ingress {
    from_port       = 8448
    to_port         = 8448
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Matrix federation from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-matrix-service-sg"
  }
}

# CloudWatch Log Group for Matrix
resource "aws_cloudwatch_log_group" "matrix" {
  name              = "/ecs/${var.project_name}-matrix"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-matrix-logs"
  }
}

# ECS Task Definition for Matrix Synapse
resource "aws_ecs_task_definition" "matrix" {
  family                   = "${var.project_name}-matrix"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512  # 0.5 vCPU - ~$7/month
  memory                   = 1024 # 1GB RAM
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    # Init/config writer container: writes homeserver.yaml to EFS, then exits
    {
      name       = "config-writer"
      # Use the same private ECR image to avoid Docker Hub pulls (no NAT)
      image      = "496675774501.dkr.ecr.us-east-1.amazonaws.com/matrix-synapse:latest"
      essential  = false
      entryPoint = ["/bin/sh", "-c"]
      command = [
        <<-EOT
        mkdir -p /data
cat > /data/homeserver.yaml <<CFG
server_name: "${var.domain_name}"
public_baseurl: "https://matrix.${var.domain_name}/"
report_stats: false

# Reduce log noise about default trusted key server
suppress_key_server_warning: true

# Explicitly configure trusted key servers to avoid startup warnings and be explicit
trusted_key_servers:
  - server_name: "matrix.org"

database:
  name: psycopg2
  args:
    user: synapse_user
    password: "$POSTGRES_PASSWORD"
    database: synapse
    host: "$POSTGRES_HOST"
    port: 5432
    cp_min: 5
    cp_max: 10
  # RDS uses en_US.UTF-8 locale by default; Synapse prefers 'C'.
  # Allow unsafe locale to bypass strict check on RDS.
  allow_unsafe_locale: true

listeners:
  - port: 8008
    tls: false
    type: http
    x_forwarded: true
    resources:
      - names: [client, federation]
        compress: false

enable_registration: false
registration_shared_secret: "$SYNAPSE_REGISTRATION_SHARED_SECRET"

media_store_path: "/data/media_store"
signing_key_path: "/data/keys/signing.key"
CFG
        chmod 0644 /data/homeserver.yaml || true
        mkdir -p /data/media_store /data/keys
        # Relax permissions and try to set expected UID/GID for synapse (commonly 991:991)
        chown -R 991:991 /data || true
        chmod -R 0775 /data
        exit 0
        EOT
      ]
      environment = [
        { name = "POSTGRES_HOST", value = aws_db_instance.matrix.address },
        { name = "POSTGRES_USER", value = "synapse_user" },
        { name = "POSTGRES_DB", value = "synapse" }
      ]
      secrets = [
        { name = "POSTGRES_PASSWORD", valueFrom = aws_secretsmanager_secret.matrix_db_password.arn },
        { name = "SYNAPSE_REGISTRATION_SHARED_SECRET", valueFrom = aws_secretsmanager_secret.matrix_shared_secret.arn }
      ]
      mountPoints = [{
        sourceVolume  = "matrix-data"
        containerPath = "/data"
        readOnly      = false
      }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.matrix.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "config"
        }
      }
    },

    # Main Synapse container
    {
      name  = "synapse"
      image = "496675774501.dkr.ecr.us-east-1.amazonaws.com/matrix-synapse:latest"

      # Run as non-root now that signing key is persisted and permissions are set by config-writer
      user = "991:991"

      dependsOn = [
        { containerName = "config-writer", condition = "SUCCESS" }
      ]

      portMappings = [
        { containerPort = 8008, protocol = "tcp" },
      ]

      environment = [
        { name = "SYNAPSE_CONFIG_PATH", value = "/data/homeserver.yaml" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.matrix.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "matrix"
        }
      }

      # Use a simple TCP check via Python (avoid curl/wget dependency)
      healthCheck = {
        command     = ["CMD-SHELL", "python - <<'PY'\nimport socket,sys; s=socket.socket(); s.settimeout(2);\ntry:\n  s.connect(('127.0.0.1',8008)); s.close(); sys.exit(0)\nexcept Exception:\n  sys.exit(1)\nPY\n"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 90
      }

      mountPoints = [{
        sourceVolume  = "matrix-data"
        containerPath = "/data"
        readOnly      = false
      }]
    }
  ])

  volume {
    name = "matrix-data"

    efs_volume_configuration {
      file_system_id = aws_efs_file_system.matrix.id
      root_directory = "/"
    }
  }

  tags = {
    Name = "${var.project_name}-matrix-task"
  }
}

# EFS for Matrix data persistence (cheaper than EBS)
resource "aws_efs_file_system" "matrix" {
  creation_token = "${var.project_name}-matrix-data"
  encrypted      = true

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS" # Move to cheaper storage after 30 days
  }

  tags = {
    Name = "${var.project_name}-matrix-data"
  }
}

# EFS Mount Targets (one per AZ)
resource "aws_efs_mount_target" "matrix" {
  count           = length(aws_subnet.private[*].id)
  file_system_id  = aws_efs_file_system.matrix.id
  subnet_id       = aws_subnet.private[count.index].id
  security_groups = [aws_security_group.matrix_efs.id]
}

# Security Group for EFS
resource "aws_security_group" "matrix_efs" {
  name        = "${var.project_name}-matrix-efs-sg"
  description = "Security group for Matrix EFS"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.matrix_service.id]
    description     = "NFS from Matrix service"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-matrix-efs-sg"
  }
}

# ECS Service for Matrix
resource "aws_ecs_service" "matrix" {
  name                   = "${var.project_name}-matrix"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.matrix.arn
  desired_count          = 1 # Single instance is fine for Matrix
  launch_type            = "FARGATE"
  enable_execute_command = true

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.matrix_service.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.matrix_client.arn
    container_name   = "synapse"
    container_port   = 8008
  }

  # Federation uses the same target group/port (8008) as client traffic

  depends_on = [
    aws_lb_listener.https,
    aws_efs_mount_target.matrix
  ]

  tags = {
    Name = "${var.project_name}-matrix-service"
  }
}

# Target Group for Matrix Client API (port 8008)
resource "aws_lb_target_group" "matrix_client" {
  name        = "${var.project_name}-matrix-client"
  port        = 8008
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/_matrix/client/versions"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-matrix-client-tg"
  }
}

# Target Group for Matrix Federation (port 8448)
## Removed separate federation target group; routing shares the client TG on port 8008

# ALB Listener Rule for Matrix (matrix.workshelf.dev)
resource "aws_lb_listener_rule" "matrix_client" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.matrix_client.arn
  }

  condition {
    host_header {
      values = ["matrix.${var.domain_name}"]
    }
  }

  condition {
    path_pattern {
      values = ["/_matrix/*", "/_synapse/*", "/.well-known/matrix/*"]
    }
  }
}

# ALB Listener Rule for Matrix Federation
resource "aws_lb_listener_rule" "matrix_federation" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 11

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.matrix_client.arn
  }

  condition {
    host_header {
      values = ["matrix.${var.domain_name}"]
    }
  }

  condition {
    path_pattern {
      values = ["/_matrix/federation/*"]
    }
  }
}

# Outputs for Matrix
output "matrix_db_endpoint" {
  description = "Matrix database endpoint"
  value       = aws_db_instance.matrix.endpoint
}

output "matrix_shared_secret_arn" {
  description = "ARN of Matrix shared secret in Secrets Manager"
  value       = aws_secretsmanager_secret.matrix_shared_secret.arn
  sensitive   = true
}

output "matrix_homeserver_url" {
  description = "Matrix homeserver URL"
  value       = "https://matrix.${var.domain_name}"
}
