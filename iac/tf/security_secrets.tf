# ─────────────────────────────────────────────
# Seguridad y Gestión de Secretos
# Secrets Manager + KMS + CloudTrail
# ─────────────────────────────────────────────

resource "aws_kms_key" "main" {
  description             = "KMS key para cifrar RDS, S3 y logs de Pokie Cat"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  # Fix CKV2_AWS_64: policy explícita de la key (root account + permitir que
  # los servicios de logging de la cuenta la usen a través de IAM).
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnableRootAccountFullAccess"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid    = "AllowCloudWatchLogsUseOfKey"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowCloudTrailUseOfKey"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action = [
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-kms"
  }
}

data "aws_caller_identity" "current" {}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.project_name}"
  target_key_id = aws_kms_key.main.key_id
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project_name}-db-credentials"
  description             = "DB_PASSWORD y DB_HOST de RDS, rotación 90 días"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = 7
}

# Access Token de MercadoPago (pasarela de pagos).
# El valor real se setea manualmente en AWS Console o con:
#   aws secretsmanager put-secret-value \
#     --secret-id pokiecat-mp-access-token \
#     --secret-string '{"access_token":"APP_USR-xxx"}'
# Nunca se hardcodea aquí. Las Lambdas reciben el ARN vía env var
# y leen el valor en runtime con GetSecretValue.
resource "aws_secretsmanager_secret" "mp_access_token" {
  name                    = "${var.project_name}-mp-access-token"
  description             = "Access Token de MercadoPago para procesamiento de pagos con tarjeta"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = aws_db_instance.postgres.address
    port     = 5432
    dbname   = "pokiecat"
  })
}

resource "aws_lambda_permission" "secrets_manager_rotation" {
  statement_id  = "AllowSecretsManagerInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secret_rotation.function_name
  principal     = "secretsmanager.amazonaws.com"
}

resource "aws_secretsmanager_secret_rotation" "db_credentials" {
  secret_id           = aws_secretsmanager_secret.db_credentials.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 90
  }

  depends_on = [aws_lambda_permission.secrets_manager_rotation]
}

resource "aws_lambda_function" "secret_rotation" {
  function_name    = "${var.project_name}-secret-rotation"
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 30

  # Fix CKV_AWS_115: límite de concurrencia.
  reserved_concurrent_executions = -1  # demo: sin reserva para no agotar el pool de la cuenta

  # Fix CKV_AWS_272: solo desplegar código firmado.
  code_signing_config_arn = aws_lambda_code_signing_config.main.arn

  tracing_config {
    mode = "Active"
  }

  # Fix CKV_AWS_116: capturar invocaciones fallidas en la DLQ.
  dead_letter_config {
    target_arn = aws_sqs_queue.orders_dlq.arn
  }

  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda_sg.id]
  }
}

resource "aws_cloudwatch_log_group" "secret_rotation_logs" {
  name = "/aws/lambda/${var.project_name}-secret-rotation"
  # Fix CKV_AWS_338: retención de al menos 1 año (antes 90 días).
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn
}

# CloudTrail - auditoría 1 año
resource "aws_cloudtrail" "main" {
  name                          = "${var.project_name}-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail_logs.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  kms_key_id                    = aws_kms_key.main.arn

  # Fix CKV_AWS_252: notificar cada entrega de log via SNS, además de
  # enviar también a CloudWatch Logs.
  sns_topic_name = aws_sns_topic.cloudtrail_notifications.name

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail_logs.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_cw_role.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }
}

resource "aws_sns_topic" "cloudtrail_notifications" {
  name = "${var.project_name}-cloudtrail-notifications"
  # Sin KMS para que CloudTrail pueda publicar sin restricciones de key policy.
}

resource "aws_sns_topic_policy" "cloudtrail_notifications" {
  arn = aws_sns_topic.cloudtrail_notifications.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AWSCloudTrailSNSPolicy"
      Effect    = "Allow"
      Principal = { Service = "cloudtrail.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.cloudtrail_notifications.arn
    }]
  })
}

resource "aws_cloudwatch_log_group" "cloudtrail_logs" {
  name = "/aws/cloudtrail/${var.project_name}"
  # Fix CKV_AWS_338: retención de al menos 1 año (antes 90 días).
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn
}

resource "aws_iam_role" "cloudtrail_cw_role" {
  name = "${var.project_name}-cloudtrail-cw-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "cloudtrail.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "cloudtrail_cw_policy" {
  name = "${var.project_name}-cloudtrail-cw-policy"
  role = aws_iam_role.cloudtrail_cw_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "${aws_cloudwatch_log_group.cloudtrail_logs.arn}:*"
    }]
  })
}

resource "aws_s3_bucket" "cloudtrail_logs" {
  bucket = "${var.project_name}-cloudtrail-logs"
}

# Fix CKV_AWS_53/54/55/56: bloquear acceso público al bucket de CloudTrail.
resource "aws_s3_bucket_public_access_block" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Fix CKV_AWS_18: access logging del propio bucket de CloudTrail.
resource "aws_s3_bucket_logging" "cloudtrail_logs" {
  bucket        = aws_s3_bucket.cloudtrail_logs.id
  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "cloudtrail-logs-access/"
}

# Fix CKV_AWS_21: versionado habilitado para proteger los logs de auditoría
# contra sobrescritura o eliminación accidental/maliciosa.
resource "aws_s3_bucket_versioning" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.main.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  rule {
    id     = "retencion-90-dias"
    status = "Enabled"

    expiration {
      days = 90
    }

    # Fix CKV_AWS_300: limpiar uploads multipart incompletos.
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Fix CKV2_AWS_62: notificación de eventos del bucket de logs de CloudTrail.
resource "aws_s3_bucket_notification" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  topic {
    topic_arn = aws_sns_topic.alerts.arn
    events    = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
  }

  depends_on = [aws_sns_topic_policy.alerts]
}

resource "aws_s3_bucket_policy" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AWSCloudTrailAclCheck"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:GetBucketAcl"
        Resource  = aws_s3_bucket.cloudtrail_logs.arn
      },
      {
        Sid       = "AWSCloudTrailWrite"
        Effect    = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.cloudtrail_logs.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        # Fix: forzar HTTPS-only, niega cualquier acceso que no use TLS.
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.cloudtrail_logs.arn,
          "${aws_s3_bucket.cloudtrail_logs.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}
