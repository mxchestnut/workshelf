# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  # Enable ECS Exec for troubleshooting containers (requires SSM permissions and endpoints)
  configuration {
    execute_command_configuration {
      logging = "DEFAULT"
    }
  }

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional policy for Secrets Manager and SSM
resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "${var.project_name}-ecs-secrets-policy"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "ssm:GetParameters",
          "kms:Decrypt"
        ]
        Resource = "*"
      },
      # Permissions required for ECS Exec (SSM channels)
      {
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Resource = "*"
      }
    ]
  })
}

# ECS Task Role (for application permissions like SES, S3)
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

# Policy for SES
resource "aws_iam_role_policy" "ecs_task_ses" {
  name = "${var.project_name}-ecs-ses-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}/backend"
  retention_in_days = 7 # Free tier: 5 GB storage

  tags = {
    Name = "${var.project_name}-backend-logs"
  }
}

resource "aws_cloudwatch_log_group" "keycloak" {
  name              = "/ecs/${var.project_name}/keycloak"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-keycloak-logs"
  }
}

# Backend Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_container_cpu
  memory                   = var.backend_container_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${aws_ecr_repository.backend.repository_url}:latest"

    portMappings = [{
      containerPort = 8000
      protocol      = "tcp"
    }]

    environment = [
      {
        name  = "ENVIRONMENT"
        value = var.environment
      },
      {
        name  = "AWS_REGION"
        value = var.aws_region
      },
      {
        name  = "FRONTEND_URL"
        value = "https://${var.domain_name}"
      },
      {
        name  = "FROM_EMAIL"
        value = "noreply@${var.domain_name}"
      },
      {
        name  = "KEYCLOAK_SERVER_URL"
        value = "https://auth.${var.domain_name}"
      },
      {
        name  = "KEYCLOAK_INTERNAL_URL"
        value = "http://auth.${var.domain_name}"
      },
      {
        name  = "MATRIX_HOMESERVER"
        value = "https://matrix.${var.domain_name}"
      }
    ]

    secrets = [
      {
        name      = "DATABASE_URL"
        valueFrom = aws_secretsmanager_secret.database_url.arn
      },
      {
        name      = "SECRET_KEY"
        valueFrom = aws_secretsmanager_secret.secret_key.arn
      },
      {
        name      = "ANTHROPIC_API_KEY"
        valueFrom = aws_secretsmanager_secret.anthropic_api_key.arn
      },
      {
        name      = "STRIPE_SECRET_KEY"
        valueFrom = aws_secretsmanager_secret.stripe_secret_key.arn
      },
      {
        name      = "STRIPE_PUBLISHABLE_KEY"
        valueFrom = aws_secretsmanager_secret.stripe_publishable_key.arn
      },
      {
        name      = "KEYCLOAK_CLIENT_SECRET"
        valueFrom = aws_secretsmanager_secret.keycloak_client_secret.arn
      },
      {
        name      = "MATRIX_REGISTRATION_SHARED_SECRET"
        valueFrom = aws_secretsmanager_secret.matrix_shared_secret.arn
      },
      {
        name      = "SENTRY_DSN"
        valueFrom = "arn:aws:secretsmanager:us-east-1:496675774501:secret:workshelf/sentry-dsn-EVRSm1"
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

# Keycloak Task Definition
resource "aws_ecs_task_definition" "keycloak" {
  family                   = "${var.project_name}-keycloak"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.keycloak_container_cpu
  memory                   = var.keycloak_container_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "keycloak"
    image = "${aws_ecr_repository.keycloak.repository_url}:latest"

    entryPoint = ["/opt/keycloak/bin/kc.sh"]
    command    = ["start"]

    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]

    environment = [
      {
        name  = "KC_PROXY_HEADERS"
        value = "xforwarded"
      },
      {
        name  = "KC_HOSTNAME"
        value = "auth.${var.domain_name}"
      },
      {
        name  = "KC_HOSTNAME_ADMIN_URL"
        value = "https://auth.${var.domain_name}"
      },
      {
        name  = "KC_HOSTNAME_URL"
        value = "https://auth.${var.domain_name}"
      },
      {
        name  = "KC_HTTP_ENABLED"
        value = "true"
      },
      {
        name  = "KEYCLOAK_ADMIN"
        value = "admin"
      },
      {
        name  = "KC_DB"
        value = "postgres"
      },
      {
        name  = "KC_DB_USERNAME"
        value = "workshelf_admin"
      },
      {
        name  = "KC_DB_URL_HOST"
        value = split(":", aws_db_instance.postgres.endpoint)[0]
      },
      {
        name  = "KC_DB_URL_PORT"
        value = "5432"
      },
      {
        name  = "KC_DB_URL_DATABASE"
        value = "workshelf"
      },
      {
        name  = "KC_DB_SCHEMA"
        value = "keycloak"
      }
    ]

    secrets = [
      {
        name      = "KC_DB_PASSWORD"
        valueFrom = aws_secretsmanager_secret.db_password.arn
      },
      {
        name      = "KEYCLOAK_ADMIN_PASSWORD"
        valueFrom = aws_secretsmanager_secret.keycloak_admin_password.arn
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.keycloak.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

# ECS Services (will be created after ALB)
# FREE TIER OPTIMIZATION: Using public subnets with public IPs
# This avoids NAT Gateway costs (~$32/month)
resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id # FREE TIER: Use public subnets
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true # FREE TIER: Assign public IP for internet access
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.https]
}

resource "aws_ecs_service" "keycloak" {
  name            = "${var.project_name}-keycloak"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.keycloak.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id # FREE TIER: Use public subnets
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true # FREE TIER: Assign public IP for internet access
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.keycloak.arn
    container_name   = "keycloak"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.https]
}
