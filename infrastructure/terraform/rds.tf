# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# RDS PostgreSQL Instance (Free Tier Eligible)
resource "aws_db_instance" "postgres" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "16.3"

  # Free Tier: db.t3.micro or db.t4g.micro
  instance_class = "db.t3.micro"

  # Free Tier: 20 GB storage
  allocated_storage     = 20
  max_allocated_storage = 100 # Auto-scaling limit
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  deletion_protection = true

  # Performance Insights (free for 7 days retention)
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name = "${var.project_name}-postgres"
  }
}

# Store DB endpoint in SSM Parameter Store (free)
resource "aws_ssm_parameter" "db_endpoint" {
  name  = "/${var.project_name}/database/endpoint"
  type  = "String"
  value = aws_db_instance.postgres.endpoint
}
