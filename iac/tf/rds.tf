# ─────────────────────────────────────────────
# Base de Datos Multi-AZ: RDS PostgreSQL
# ─────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "postgres" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"

  allocated_storage = 50
  storage_type      = "gp3"
  storage_encrypted = true
  kms_key_id        = aws_kms_key.main.arn

  db_name  = "pokiecat"
  username = var.db_username
  password = var.db_password

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  publicly_accessible    = false

  backup_retention_period   = 7
  backup_window             = "02:00-03:00"
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-db-final-snapshot"
  copy_tags_to_snapshot     = true

  # Fix CKV_AWS_226: aplicar parches menores automáticamente.
  auto_minor_version_upgrade = true

  # Fix CKV_AWS_161: autenticación IAM además de usuario/clave.
  iam_database_authentication_enabled = true

  # Performance Insights cifrado con KMS.
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.main.arn

  # Fix CKV_AWS_118: Enhanced Monitoring (métricas de OS cada 60s).
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn

  # Fix CKV2_AWS_30: parameter group propio con logging de queries habilitado.
  parameter_group_name = aws_db_parameter_group.postgres.name

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name = "${var.project_name}-rds"
  }
}

# Fix CKV2_AWS_30: registrar todas las queries (logging a nivel de motor),
# necesario para auditoría además de los logs exportados a CloudWatch.
resource "aws_db_parameter_group" "postgres" {
  name   = "${var.project_name}-postgres-params"
  family = "postgres15"

  # Fix CKV2_AWS_69: forzar cifrado en tránsito (SSL/TLS) en todas las
  # conexiones a PostgreSQL. Rechaza conexiones no cifradas.
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "0"
  }
}

# Fix CKV_AWS_118: rol que permite a RDS publicar métricas de Enhanced
# Monitoring en CloudWatch Logs.
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.project_name}-rds-enhanced-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

resource "aws_db_proxy" "main" {
  name                   = "${var.project_name}-rds-proxy"
  engine_family          = "POSTGRESQL"
  role_arn               = aws_iam_role.rds_proxy_role.arn
  vpc_subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  require_tls            = true

  auth {
    auth_scheme = "SECRETS"
    secret_arn  = aws_secretsmanager_secret.db_credentials.arn
  }
}

resource "aws_iam_role" "rds_proxy_role" {
  name = "${var.project_name}-rds-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "rds.amazonaws.com" }
    }]
  })
}

# Permiso mínimo necesario: que el Proxy pueda leer el secreto de Secrets Manager.
resource "aws_iam_role_policy" "rds_proxy_secret_access" {
  name = "${var.project_name}-rds-proxy-secret-policy"
  role = aws_iam_role.rds_proxy_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "ReadDbSecret"
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = aws_secretsmanager_secret.db_credentials.arn
    }]
  })
}
